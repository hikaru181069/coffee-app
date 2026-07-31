// リーグ全選手をアーキタイプ分類して返すサービス
//
// 処理の流れ:
//   1. leagueStats（野手・投手 上位200人、キャッシュ済み）を取得
//   2. FastAPI /archetype/classify で k-means 分類
//   3. playerId → { archetype, styleScores } のマップをキャッシュ
//   4. GET /api/archetype/:type や similar players レスポンスから参照される

const { fetchLeagueStats } = require("./leagueStatsService");
const { fetchArchetypeClassify } = require("../fastApiService");
const { fetchFromMlbApi } = require("./mlbClient");

const CURRENT_SEASON = new Date().getFullYear().toString();

const MLB_HEADSHOT = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/${id}/headshot/67/current`;

const CACHE_TTL = 24 * 60 * 60 * 1000;
let archetypeCache = null;
let archetypeCacheTime = null;

// leagueStats の野手を FastAPI 用フォーマットに変換
const toHitterCandidate = (p) => ({
  playerId: p.playerId,
  playerType: "hitter",
  position: p.position || "",
  ops: p.ops,
  homeRuns: p.homeRuns,
  stolenBases: p.stolenBases,
  avg: p.avg,
  rbi: p.rbi,
  oaa: p.oaa ?? 0,
  catcherFraming: p.catcherFraming,
});

// leagueStats の投手を FastAPI 用フォーマットに変換
const toPitcherCandidate = (p) => ({
  playerId: p.playerId,
  playerType: "pitcher",
  era: p.era,
  whip: p.whip,
  strikeouts: p.strikeouts,
  walks: 0,
  wins: p.wins,
  innings: p.innings,
});

/**
 * リーグ全選手の playerId → { archetype, styleScores } マップを返す。
 * 24h キャッシュ済み。
 */
const fetchArchetypes = async () => {
  if (archetypeCache && archetypeCacheTime && Date.now() - archetypeCacheTime < CACHE_TTL) {
    return archetypeCache;
  }

  const leagueStats = await fetchLeagueStats();

  // 複数リーダーボードにまたがって取得されたデータは、
  // 出現しなかったカテゴリが 0 になる。0 が多い選手は分類精度が低いため除外する。
  const hasEnoughHitterStats = (p) =>
    (p.ops > 0 ? 1 : 0) + (p.homeRuns > 0 ? 1 : 0) + (p.avg > 0 ? 1 : 0) + (p.rbi > 0 ? 1 : 0) >= 2;
  const hasEnoughPitcherStats = (p) =>
    (p.era > 0 ? 1 : 0) + (p.whip > 0 ? 1 : 0) + (p.strikeouts > 0 ? 1 : 0) + (p.innings > 0 ? 1 : 0) >= 2;

  const hitterCandidates = leagueStats.hitter.players.filter(hasEnoughHitterStats).map(toHitterCandidate);
  const pitcherCandidates = leagueStats.pitcher.players.filter(hasEnoughPitcherStats).map(toPitcherCandidate);

  const [hitterResult, pitcherResult] = await Promise.all([
    fetchArchetypeClassify({ candidates: hitterCandidates, playerType: "hitter" }),
    fetchArchetypeClassify({ candidates: pitcherCandidates, playerType: "pitcher" }),
  ]);

  const map = {};
  for (const p of hitterResult?.players || []) {
    map[p.playerId] = {
      archetypes: p.archetypes || [],
      styleScores: p.styleScores,
      playerType: "hitter",
    };
  }
  for (const p of pitcherResult?.players || []) {
    map[p.playerId] = {
      archetypes: p.archetypes || [],
      styleScores: p.styleScores,
      playerType: "pitcher",
    };
  }

  archetypeCache = map;
  archetypeCacheTime = Date.now();
  return map;
};

/**
 * 指定アーキタイプに属する選手リストを返す。
 * URL スラッグ（"power-hitter"）をアーキタイプ名（"Power Hitter"）に変換して比較する。
 */
const fetchPlayersByArchetype = async (typeSlug) => {
  const [archetypeMap, leagueStats] = await Promise.all([
    fetchArchetypes(),
    fetchLeagueStats(),
  ]);

  // "power-hitter" → "power hitter" → 大文字小文字を無視して比較
  const normalize = (s) => s.toLowerCase().replace(/-/g, " ");

  // leagueStats の全選手を playerId でインデックス化
  const playerIndex = {};
  for (const p of leagueStats.hitter.players) {
    playerIndex[p.playerId] = { ...p, playerType: "hitter" };
  }
  for (const p of leagueStats.pitcher.players) {
    playerIndex[p.playerId] = { ...p, playerType: "pitcher" };
  }

  const results = [];
  for (const [id, data] of Object.entries(archetypeMap)) {
    if (!(data.archetypes || []).some((a) => normalize(a) === normalize(typeSlug))) continue;
    const base = playerIndex[Number(id)];
    if (!base) continue;
    results.push({
      mlbPlayerId: Number(id),
      name: base.name,
      team: base.team,
      position: base.position,
      playerType: base.playerType,
      image: MLB_HEADSHOT(id),
      archetypes: data.archetypes || [],
      styleScores: data.styleScores,
    });
  }

  // 名前順にソート
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
};

/**
 * 特定選手のアーキタイプを返す。
 * リーグ上位200人にいない場合は null。
 */
const getPlayerArchetype = async (playerId) => {
  const map = await fetchArchetypes();
  return map[Number(playerId)] || null;
};

/**
 * Future MVP: 若手(24歳以下)かつ、何らかのアーキタイプタグを持つ選手。
 * 「マイナーの有望株」であるFuture Starsとは異なり、
 * 「既にMLBでリーグ上位の成績を出している若手」を対象にする。
 */
const fetchFutureMvpPlayers = async () => {
  const [archetypeMap, leagueStats] = await Promise.all([
    fetchArchetypes(),
    fetchLeagueStats(),
  ]);

  const playerIndex = {};
  for (const p of leagueStats.hitter.players) {
    playerIndex[p.playerId] = { ...p, playerType: "hitter" };
  }
  for (const p of leagueStats.pitcher.players) {
    playerIndex[p.playerId] = { ...p, playerType: "pitcher" };
  }

  const taggedIds = Object.entries(archetypeMap)
    .filter(([, data]) => (data.archetypes || []).length > 0)
    .map(([id]) => Number(id));

  if (taggedIds.length === 0) return [];

  // 年齢はarchetypeMap/leagueStatsに含まれないため、バッチで取得する
  let ageMap = {};
  try {
    const data = await fetchFromMlbApi(
      `https://statsapi.mlb.com/api/v1/people?personIds=${taggedIds.join(",")}`,
      "Failed to fetch player ages for Future MVP",
    );
    ageMap = Object.fromEntries((data.people || []).map((p) => [p.id, p.currentAge]));
  } catch { /* 年齢取得失敗時は全員除外扱いになる */ }

  const results = [];
  for (const id of taggedIds) {
    const age = ageMap[id];
    if (!age || age > 24) continue;
    const base = playerIndex[id];
    if (!base) continue;
    const data = archetypeMap[id];
    results.push({
      mlbPlayerId: id,
      name: base.name,
      team: base.team,
      position: base.position,
      playerType: base.playerType,
      image: MLB_HEADSHOT(id),
      archetypes: data.archetypes || [],
      styleScores: data.styleScores,
      age,
    });
  }

  results.sort((a, b) => a.age - b.age);
  return results;
};

/**
 * Japanese Players: 現役MLB全選手(約1300人、リーグ上位200人に限らない)から
 * birthCountry === "Japan" の選手を抽出する。
 * アーキタイプ分類とは無関係の「国籍」という別軸のカテゴリーのため、
 * fetchArchetypes()のリーグ上位200人プールではなく、全選手プールを使う。
 */
const fetchJapanesePlayers = async () => {
  const [playersData, teamsData] = await Promise.all([
    fetchFromMlbApi(
      `https://statsapi.mlb.com/api/v1/sports/1/players?season=${CURRENT_SEASON}`,
      "Failed to fetch MLB player pool",
    ),
    fetchFromMlbApi(
      "https://statsapi.mlb.com/api/v1/teams?sportId=1",
      "Failed to fetch MLB teams",
    ),
  ]);

  const teamNameMap = Object.fromEntries(
    (teamsData.teams || []).map((t) => [t.id, t.name]),
  );

  const japanesePlayers = (playersData.people || []).filter(
    (p) => p.birthCountry === "Japan",
  );

  return japanesePlayers.map((p) => {
    const position = p.primaryPosition?.abbreviation || "";
    return {
      mlbPlayerId: p.id,
      name: p.fullName,
      team: teamNameMap[p.currentTeam?.id] || "",
      teamId: p.currentTeam?.id ?? null,
      position,
      playerType: position === "P" ? "pitcher" : "hitter",
      image: MLB_HEADSHOT(p.id),
      age: p.currentAge,
      reason: "Born in Japan",
    };
  }).sort((a, b) => a.name.localeCompare(b.name));
};

module.exports = {
  fetchArchetypes,
  fetchPlayersByArchetype,
  getPlayerArchetype,
  fetchFutureMvpPlayers,
  fetchJapanesePlayers,
};
