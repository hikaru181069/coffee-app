const { fetchFromMlbApi } = require("./mlbClient");

const STATS_BASE = "https://statsapi.mlb.com/api/v1";
const CURRENT_SEASON = new Date().getFullYear().toString();

const fetchPlayerAges = async (playerIds) => {
  if (!playerIds.length) return {};
  const data = await fetchFromMlbApi(
    `${STATS_BASE}/people?personIds=${playerIds.join(",")}`,
    "Failed to fetch player ages",
  );
  return Object.fromEntries((data.people || []).map((p) => [p.id, p.currentAge]));
};

const buildStatsParams = (group, sortStat, order) =>
  new URLSearchParams({
    stats: "season",
    group,
    season: CURRENT_SEASON,
    sortStat,
    order,
    limit: "80",
    sportId: "1",
    playerPool: "All",
  });

// 25歳以下の注目選手を返す
// hitters: OPS 順, pitchers: ERA 順
const fetchRisingStars = async ({ limit = 6 } = {}) => {
  const [hitterData, pitcherData] = await Promise.all([
    fetchFromMlbApi(
      `${STATS_BASE}/stats?${buildStatsParams("hitting", "onBasePlusSlugging", "desc")}`,
      "Failed to fetch young hitters",
    ),
    fetchFromMlbApi(
      `${STATS_BASE}/stats?${buildStatsParams("pitching", "earnedRunAverage", "asc")}`,
      "Failed to fetch young pitchers",
    ),
  ]);

  const hitterSplits = (hitterData.stats?.[0]?.splits ?? []).filter(
    (s) => Number(s.stat?.atBats ?? 0) >= 30,
  );
  const pitcherSplits = (pitcherData.stats?.[0]?.splits ?? []).filter(
    (s) => parseFloat(s.stat?.inningsPitched ?? 0) >= 10,
  );

  const allIds = [
    ...new Set(
      [...hitterSplits, ...pitcherSplits].map((s) => s.player?.id).filter(Boolean),
    ),
  ];
  const ageMap = await fetchPlayerAges(allIds);

  const toCard = (s, statField, statLabel) => ({
    playerId:   s.player?.id,
    playerName: s.player?.fullName,
    teamId:     s.team?.id,
    teamName:   s.team?.name,
    stat:       s.stat?.[statField] ?? "-",
    statLabel,
    age:        ageMap[s.player?.id],
  });

  const youngHitters = hitterSplits
    .filter((s) => { const age = ageMap[s.player?.id]; return age && age <= 25; })
    .slice(0, limit)
    .map((s) => toCard(s, "ops", "OPS"));

  const youngPitchers = pitcherSplits
    .filter((s) => { const age = ageMap[s.player?.id]; return age && age <= 25; })
    .slice(0, limit)
    .map((s) => toCard(s, "era", "ERA"));

  return { hitters: youngHitters, pitchers: youngPitchers };
};

module.exports = { fetchRisingStars };
