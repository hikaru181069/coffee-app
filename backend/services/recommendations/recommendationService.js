const FavoritePlayer = require("../../models/FavoritePlayer");
const { fetchLeagueStats, fetchYoungLeaguePlayers } = require("../mlb/leagueStatsService");
const { fetchDiscoverSimilar, fetchFutureStars } = require("../fastApiService");
const { fetchExternalPlayerStats } = require("../mlb/playerStatsService");
const { formatExternalStats } = require("../mlb/playerFormatter");
const { getOaaMap, getSprintSpeedMap, getArmStrengthMap } = require("../mlb/baseballSavantService");
const { fallbackPlayers } = require("./fallbackPlayers");
const { fetchArchetypes } = require("../mlb/archetypeService");
const { getPreferenceScores } = require("./preferenceService");
const { buildMatchReason } = require("./reasonService");

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

// ── getRecommendationsForUser ─────────────────────────────────────────────────
// お気に入り選手のライブスタッツを取得し、FastAPI /discover/similar で
// 類似選手を計算して返す。お気に入りがない場合は人気選手をフォールバックにする。

const buildTarget = (fav, hitterStats, pitcherStats) => {
  const id             = Number(fav.mlbPlayerId);
  const oaaMap         = getOaaMap();
  const sprintSpeedMap = getSprintSpeedMap();
  const armStrengthMap = getArmStrengthMap();
  return {
    playerId:    id,
    playerType:  fav.playerType || "hitter",
    position:    fav.position   || "",
    ops:         toNumber(hitterStats?.ops),
    homeRuns:    toNumber(hitterStats?.homeRuns),
    stolenBases: toNumber(hitterStats?.stolenBases),
    avg:         toNumber(hitterStats?.battingAverage),
    rbi:         toNumber(hitterStats?.rbis || hitterStats?.rbi),
    oaa:         oaaMap[id]         ?? 0,
    sprintSpeed: sprintSpeedMap[id] ?? 0,
    armStrength: armStrengthMap[id] ?? 0,
    era:         toNumber(pitcherStats?.era),
    whip:        toNumber(pitcherStats?.whip),
    strikeouts:  toNumber(pitcherStats?.strikeouts),
    walks:       toNumber(pitcherStats?.baseOnBalls),
    wins:        toNumber(pitcherStats?.wins),
    innings:     toNumber(pitcherStats?.inningsPitched),
  };
};

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

const toPitcherCandidate = (p) => ({
  playerId:   p.playerId,
  name:       p.name,
  team:       p.team,
  position:   p.position || "",
  age:        0,
  era:        p.era,
  whip:       p.whip,
  strikeouts: p.strikeouts,
  walks:      0,
  wins:       p.wins,
  innings:    p.innings,
});

const getRecommendationsForUser = async (userId) => {
  const favorites = await FavoritePlayer.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5);

  const favoriteIds = new Set(favorites.map((f) => Number(f.mlbPlayerId)));

  if (favorites.length === 0) {
    return fallbackPlayers.slice(0, 5).map((p) => ({
      mlbPlayerId: p.playerId,
      name:        p.fullName,
      team:        p.team || "",
      reason:      "Popular MLB player",
    }));
  }

  const leagueStats = await fetchLeagueStats();

  // 各お気に入り選手のライブスタッツを並行取得
  const favWithStats = await Promise.all(
    favorites.map(async (fav) => {
      try {
        const raw = await fetchExternalPlayerStats({ playerId: fav.mlbPlayerId });
        const { hitterStats, pitcherStats } = formatExternalStats(raw);
        return { fav, hitterStats, pitcherStats };
      } catch {
        return { fav, hitterStats: {}, pitcherStats: {} };
      }
    }),
  );

  const recommendations = [];
  const recommendedIds  = new Set(favoriteIds);

  for (const { fav, hitterStats, pitcherStats } of favWithStats) {
    const isPitcher     = fav.playerType === "pitcher";
    const target        = buildTarget(fav, hitterStats, pitcherStats);
    const pool          = isPitcher ? leagueStats.pitcher.players : leagueStats.hitter.players;
    const mlbCandidates = pool
      .filter((p) => !recommendedIds.has(Number(p.playerId)))
      .map(isPitcher ? toPitcherCandidate : toHitterCandidate);

    try {
      const result = await fetchDiscoverSimilar(target, mlbCandidates, [], 5);
      for (const match of result?.mlbSimilar ?? []) {
        if (!recommendedIds.has(Number(match.playerId))) {
          recommendations.push({
            mlbPlayerId:          match.playerId,
            name:                 match.name,
            team:                 match.team,
            reason:               `Similar playstyle to ${fav.fullName}`,
            similarityPercentage: match.similarityPercentage,
          });
          recommendedIds.add(Number(match.playerId));
        }
      }
    } catch (err) {
      console.warn(`[recommendations] discover/similar failed for ${fav.fullName}: ${err.message}`);
    }

    if (recommendations.length >= 5) break;
  }

  // 不足分をフォールバック（人気選手）で補う
  for (const p of fallbackPlayers) {
    if (recommendations.length >= 5) break;
    const id = Number(p.playerId);
    if (!recommendedIds.has(id)) {
      recommendations.push({
        mlbPlayerId: id,
        name:        p.fullName,
        team:        p.team || "",
        reason:      "Popular MLB player",
      });
      recommendedIds.add(id);
    }
  }

  return recommendations.slice(0, 5);
};

// ── getFutureStarsForUser ──────────────────────────────────────────────────────
// MongoDBの保存スタッツはオンボーディング時に取得されないため0になりやすい。
// getRecommendationsForUserと同様にライブスタッツを取得してFastAPIに渡す。

const getFutureStarsForUser = async (userId) => {
  const favorites = await FavoritePlayer.find({ user: userId }).sort({ createdAt: -1 });

  if (favorites.length === 0) return [];

  const favWithStats = await Promise.all(
    favorites.map(async (fav) => {
      try {
        const raw = await fetchExternalPlayerStats({ playerId: fav.mlbPlayerId });
        const { hitterStats } = formatExternalStats(raw);
        return { fav, hitterStats };
      } catch {
        return { fav, hitterStats: {} };
      }
    }),
  );

  const favoritePlayers = favWithStats
    .map(({ fav, hitterStats }) => ({
      playerId: Number(fav.mlbPlayerId),
      fullName: fav.fullName,
      position: fav.position || "",
      stats: {
        ops:         toNumber(hitterStats.ops),
        homeRuns:    toNumber(hitterStats.homeRuns),
        stolenBases: toNumber(hitterStats.stolenBases),
        avg:         toNumber(hitterStats.battingAverage),
        rbi:         toNumber(hitterStats.rbis || hitterStats.rbi),
      },
    }))
    .filter((p) => p.playerId);

  let candidates = [];
  try {
    candidates = await fetchYoungLeaguePlayers(25);
  } catch (err) {
    console.warn("Young players fetch failed:", err.message);
  }

  const futureStars = await fetchFutureStars(favoritePlayers, candidates, 5);
  return futureStars || [];
};

// ── getGroupedRecommendationsForUser ──────────────────────────────────────────
// お気に入り選手ごとに「なぜ推薦されたか」をグループ化して返す。
// 各グループ: { seedPlayer, matches[] }
// matches には類似選手のキースタッツ（リーグスタッツプールから取得）を含む。

const getGroupedRecommendationsForUser = async (userId) => {
  const favorites = await FavoritePlayer.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(5);

  const favoriteIds = new Set(favorites.map((f) => Number(f.mlbPlayerId)));

  if (favorites.length === 0) {
    return {
      hasFavorites: false,
      groups: [],
      fallback: fallbackPlayers.slice(0, 5).map((p) => ({
        mlbPlayerId: p.playerId,
        name:        p.fullName,
        team:        p.team || "",
      })),
    };
  }

  // アーキタイプ分類は24hキャッシュ済みのため、ここで1回取得すれば
  // 選手カードのstyleScores(棒グラフ用パーセンタイル)をほぼノーコストで付与できる。
  const [leagueStats, archetypeMap] = await Promise.all([
    fetchLeagueStats(),
    fetchArchetypes(),
  ]);

  // プレイヤーIDからキースタッツを引けるルックアップマップを構築
  const hitterPoolMap = {};
  for (const p of leagueStats.hitter.players) {
    hitterPoolMap[Number(p.playerId)] = {
      ops:         p.ops,
      homeRuns:    p.homeRuns,
      stolenBases: p.stolenBases,
    };
  }
  const pitcherPoolMap = {};
  for (const p of leagueStats.pitcher.players) {
    pitcherPoolMap[Number(p.playerId)] = {
      era:        p.era,
      strikeouts: p.strikeouts,
      wins:       p.wins,
    };
  }

  // Step 1: お気に入りのスタッツ取得 + FastAPI 呼び出しを全員同時並列実行
  // 以前は for ループで逐次実行していたため 5人 × ~500ms = 最大2.5秒かかっていた
  const groupResults = await Promise.all(
    favorites.map(async (fav) => {
      const isPitcher = fav.playerType === "pitcher";

      let hitterStats = {}, pitcherStats = {};
      try {
        const raw = await fetchExternalPlayerStats({ playerId: fav.mlbPlayerId });
        ({ hitterStats, pitcherStats } = formatExternalStats(raw));
      } catch { /* stats なしでも処理続行 */ }

      const target         = buildTarget(fav, hitterStats, pitcherStats);
      const pool           = isPitcher ? leagueStats.pitcher.players : leagueStats.hitter.players;
      const mlbCandidates  = pool
        .filter((p) => !favoriteIds.has(Number(p.playerId)))
        .map(isPitcher ? toPitcherCandidate : toHitterCandidate);

      const seedKeyStats = isPitcher
        ? { era: toNumber(pitcherStats?.era), strikeouts: toNumber(pitcherStats?.strikeouts), wins: toNumber(pitcherStats?.wins) }
        : { ops: toNumber(hitterStats?.ops), homeRuns: toNumber(hitterStats?.homeRuns), stolenBases: toNumber(hitterStats?.stolenBases) };

      let rawMatches = [];
      try {
        const result = await fetchDiscoverSimilar(target, mlbCandidates, [], 5);
        rawMatches = result?.mlbSimilar ?? [];
      } catch (err) {
        console.warn(`[grouped-rec] discover/similar failed for ${fav.fullName}: ${err.message}`);
      }

      return { fav, isPitcher, seedKeyStats, rawMatches };
    }),
  );

  // Step 2: 全グループの結果をまとめて重複除去（同じ選手を複数グループに出さない）
  const recommendedIds = new Set(favoriteIds);
  const deduped = groupResults
    .map(({ fav, isPitcher, seedKeyStats, rawMatches }) => {
      const uniqueMatches = rawMatches.filter(
        (m) => !recommendedIds.has(Number(m.playerId)),
      );
      uniqueMatches.forEach((m) => recommendedIds.add(Number(m.playerId)));
      return { fav, isPitcher, seedKeyStats, uniqueMatches };
    })
    .filter((g) => g.uniqueMatches.length > 0);

  // Step 3: 全マッチ選手のライブスタッツを一括並列取得
  // プールデータはカテゴリごと上位200名のみなので一部の値がゼロになるため
  const allMatchIds = deduped.flatMap((g) => g.uniqueMatches.map((m) => m.playerId));
  const liveStatsMap = {};
  await Promise.all(
    allMatchIds.map(async (playerId) => {
      try {
        const raw = await fetchExternalPlayerStats({ playerId });
        liveStatsMap[playerId] = formatExternalStats(raw);
      } catch { /* フォールバックはプールデータ */ }
    }),
  );

  // Step 3.5: 行動学習の好み一致度・dislike減点をFastAPIにまとめて1回問い合わせる
  // (選手ごとに呼ぶとN+1になるため、全グループの候補選手をここで束ねる)
  const scoreCandidates = deduped.flatMap(({ isPitcher, uniqueMatches }) =>
    uniqueMatches.map((m) => ({
      mlbPlayerId: Number(m.playerId),
      playerType: isPitcher ? "pitcher" : "hitter",
      styleScores: archetypeMap[Number(m.playerId)]?.styleScores,
    })),
  );
  const preferenceScores = await getPreferenceScores(userId, scoreCandidates);

  // Step 4: グループを組み立てて返す
  const groups = deduped.map(({ fav, isPitcher, seedKeyStats, uniqueMatches }) => {
    const seedArchetype = archetypeMap[Number(fav.mlbPlayerId)];

    return {
      seedPlayer: {
        mlbPlayerId: Number(fav.mlbPlayerId),
        name:        fav.fullName,
        playerType:  fav.playerType || "hitter",
        keyStats:    seedKeyStats,
        styleScores: seedArchetype?.styleScores,
        archetypes:  seedArchetype?.archetypes || [],
      },
      matches: uniqueMatches
        .map((match) => {
          const live = liveStatsMap[match.playerId];
          const liveKeyStats = live
            ? (isPitcher
                ? { era: toNumber(live.pitcherStats?.era), strikeouts: toNumber(live.pitcherStats?.strikeouts), wins: toNumber(live.pitcherStats?.wins) }
                : { ops: toNumber(live.hitterStats?.ops), homeRuns: toNumber(live.hitterStats?.homeRuns), stolenBases: toNumber(live.hitterStats?.stolenBases) })
            : (isPitcher ? (pitcherPoolMap[Number(match.playerId)] || {}) : (hitterPoolMap[Number(match.playerId)] || {}));
          const matchArchetype = archetypeMap[Number(match.playerId)];
          const styleScores = matchArchetype?.styleScores;
          const { affinityScore = null, dislikePenalty = 0 } = preferenceScores[Number(match.playerId)] || {};
          // 行動学習の好みプロファイルがある選手だけ類似度とブレンドする。
          // ここで作った値が「最終的な推薦順位」の唯一の基準になる
          // (グループ内の並び替え・Homeのヒーロー選出・ForYou画面の表示%、すべてこの値を使う)。
          const baseScore = affinityScore != null
            ? match.similarityPercentage * 0.6 + affinityScore * 0.4
            : match.similarityPercentage;
          const matchScore = Math.max(0, baseScore - dislikePenalty);

          return {
            mlbPlayerId:          match.playerId,
            name:                 match.name,
            team:                 match.team,
            position:             match.position,
            age:                  match.age,
            similarityPercentage: match.similarityPercentage,
            playerType:           isPitcher ? "pitcher" : "hitter",
            keyStats:             liveKeyStats,
            styleScores,
            archetypes:           matchArchetype?.archetypes || [],
            affinityScore,
            matchScore,
            reason: buildMatchReason({
              seedName:        fav.fullName,
              seedArchetypes:  seedArchetype?.archetypes || [],
              matchArchetypes: matchArchetype?.archetypes || [],
              seedScores:      seedArchetype?.styleScores,
              matchScores:     styleScores,
              isPitcher,
            }),
          };
        })
        .sort((a, b) => b.matchScore - a.matchScore),
    };
  });

  // お気に入りはあるが、推薦エンジンが一件もマッチを返さなかった場合
  // （FastAPIの一時的な障害・コールドスタート等）。
  // 「お気に入りが0件」と同じ空状態を出すとユーザーに誤解を与えるため、
  // 人気選手のフォールバックを添えて degraded フラグで区別する。
  if (groups.length === 0) {
    return {
      hasFavorites: true,
      groups: [],
      degraded: true,
      fallback: fallbackPlayers
        .filter((p) => !favoriteIds.has(Number(p.playerId)))
        .slice(0, 5)
        .map((p) => ({
          mlbPlayerId: p.playerId,
          name:        p.fullName,
          team:        p.team || "",
        })),
    };
  }

  return { hasFavorites: true, groups };
};

module.exports = {
  getFutureStarsForUser,
  getRecommendationsForUser,
  getGroupedRecommendationsForUser,
};
