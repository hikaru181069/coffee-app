// 類似選手を2つのプールから取得するサービス
//
// 処理の流れ:
//   1. 対象選手のスタッツを取得
//   2. リーグ上位200人のデータ（キャッシュ済み）を MLB 候補プールとして使用
//   3. 25歳以下の若手データ（キャッシュ済み）を若手候補プールとして使用
//   4. FastAPI /discover/similar で cosine similarity を計算
//   5. マッチした選手の詳細を MLB API から取得して返す

const { fetchExternalPlayerDetails, fetchExternalPlayerStats } = require("./playerStatsService");
const { formatExternalPlayer, formatExternalStats } = require("./playerFormatter");
const { fetchLeagueStats, fetchYoungLeaguePlayers, fetchYoungPitchers } = require("./leagueStatsService");
const { fetchDiscoverSimilar } = require("../fastApiService");
const { getPlayerArchetype } = require("./archetypeService");
const { getOaaMap, getSprintSpeedMap, getArmStrengthMap } = require("./baseballSavantService");

// 対象選手のスタッツを FastAPI に渡せる形式に変換する
const toDiscoverTarget = (player, hitterStats, pitcherStats) => ({
  playerId:    Number(player.mlbPlayerId),
  playerType:  player.playerType || "hitter",
  position:    player.position   || "",
  oaa:         getOaaMap()[Number(player.mlbPlayerId)]         ?? 0,
  sprintSpeed: getSprintSpeedMap()[Number(player.mlbPlayerId)] ?? 0,
  armStrength: getArmStrengthMap()[Number(player.mlbPlayerId)] ?? 0,
  // 野手スタッツ
  ops:         parseFloat(hitterStats?.ops)            || 0,
  homeRuns:    parseInt(hitterStats?.homeRuns)          || 0,
  stolenBases: parseInt(hitterStats?.stolenBases)       || 0,
  avg:         parseFloat(hitterStats?.battingAverage)  || 0,
  rbi:         parseInt(hitterStats?.rbis)              || 0,
  // 投手スタッツ
  era:         parseFloat(pitcherStats?.era)            || 0,
  whip:        parseFloat(pitcherStats?.whip)           || 0,
  strikeouts:  parseInt(pitcherStats?.strikeouts)       || 0,
  walks:       parseInt(pitcherStats?.baseOnBalls)      || 0,
  wins:        parseInt(pitcherStats?.wins)             || 0,
  innings:     parseFloat(pitcherStats?.inningsPitched) || 0,
});

// リーグ統計の野手プレイヤーを DiscoverCandidate 形式に変換
const toHitterCandidate = (p) => ({
  playerId:    p.playerId,
  name:        p.name,
  team:        p.team,
  position:    p.position    || "",
  age:         p.age         || 0,
  ops:         p.ops,
  homeRuns:    p.homeRuns,
  stolenBases: p.stolenBases,
  avg:         p.avg,
  rbi:         p.rbi,
  oaa:         p.oaa         ?? 0,
  sprintSpeed: p.sprintSpeed ?? 0,
  armStrength: p.armStrength ?? 0,
});

// リーグ統計の投手プレイヤーを DiscoverCandidate 形式に変換
const toPitcherCandidate = (p) => ({
  playerId:   p.playerId,
  name:       p.name,
  team:       p.team,
  position:   "",
  age:        0,
  era:        p.era,
  whip:       p.whip,
  strikeouts: p.strikeouts,
  walks:      0,
  wins:       p.wins,
  innings:    p.innings,
});

// マッチ結果（playerId のみ）から選手の詳細情報を取得する
const fetchMatchDetails = async (matches) => {
  const results = await Promise.all(
    matches.map(async ({ playerId, similarityPercentage }) => {
      try {
        const detail = await fetchExternalPlayerDetails(playerId);
        const stats  = await fetchExternalPlayerStats({ playerId });
        return {
          ...formatExternalPlayer(detail),
          ...formatExternalStats(stats),
          similarityPercentage,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter(Boolean);
};

const fetchSimilarPlayers = async (playerId) => {
  // 1. 対象選手の情報を取得
  const detail = await fetchExternalPlayerDetails(playerId);
  const player = formatExternalPlayer(detail);
  const stats  = await fetchExternalPlayerStats({ playerId });
  const { hitterStats, pitcherStats } = formatExternalStats(stats);

  const isPitcher = player.playerType === "pitcher";
  const target = toDiscoverTarget(player, hitterStats, pitcherStats);

  // 2. MLB 候補プールの作成（リーグ上位200人、キャッシュ済み）
  const leagueStats = await fetchLeagueStats();
  const mlbPool = isPitcher
    ? leagueStats.pitcher.players
    : leagueStats.hitter.players;

  const mlbCandidates = mlbPool
    .filter((p) => p.playerId !== Number(playerId))
    .map(isPitcher ? toPitcherCandidate : toHitterCandidate);

  // 3. 若手候補プールの作成（25歳以下、キャッシュ済み）
  //    野手: 若手野手データ / 投手: 若手投手データ
  let youngCandidates = [];
  if (isPitcher) {
    const youngPitcherPlayers = await fetchYoungPitchers(25);
    youngCandidates = youngPitcherPlayers
      .filter((p) => p.playerId !== Number(playerId))
      .map(toPitcherCandidate);
  } else {
    const youngPlayers = await fetchYoungLeaguePlayers(25);
    youngCandidates = youngPlayers
      .filter((p) => p.playerId !== Number(playerId))
      .map(toHitterCandidate);
  }

  // 4. FastAPI で類似度を計算
  const result = await fetchDiscoverSimilar(target, mlbCandidates, youngCandidates, 3);

  // FastAPI が落ちている/タイムアウトした場合。「本当に0件」と区別するため unavailable を立てる
  if (!result) return { mlbSimilar: [], youngSimilar: [], unavailable: true };

  // 5. 重複除去: mlbSimilar に既出の選手を youngSimilar から除く
  const mlbIds = new Set(result.mlbSimilar.map((p) => p.playerId));
  const dedupedYoung = result.youngSimilar.filter((p) => !mlbIds.has(p.playerId));

  // 6. マッチした選手の詳細情報 + 対象選手のアーキタイプを並行取得
  const [mlbSimilar, youngSimilar, archetypeData] = await Promise.all([
    fetchMatchDetails(result.mlbSimilar),
    fetchMatchDetails(dedupedYoung),
    getPlayerArchetype(playerId),
  ]);

  return {
    mlbSimilar,
    youngSimilar,
    targetArchetypes: archetypeData?.archetypes || [],
    targetStyleScores: archetypeData?.styleScores || null,
  };
};

module.exports = { fetchSimilarPlayers };
