const { fetchFromMlbApi } = require("./mlbClient");

const STATS_BASE = "https://statsapi.mlb.com/api/v1";
const CURRENT_SEASON = new Date().getFullYear().toString();

const AL_TEAM_IDS = new Set([108, 110, 111, 114, 116, 117, 118, 133, 136, 139, 140, 141, 142, 145, 147]);
const NL_TEAM_IDS = new Set([109, 112, 113, 115, 119, 120, 121, 134, 135, 137, 138, 143, 144, 146, 158]);

// style → { sortStat(API パラメータ), order, statField(レスポンスキー), statLabel }
const HITTER_CONFIG = {
  power:    { sortStat: "homeRuns",           order: "desc", statField: "homeRuns",  statLabel: "HR"  },
  speed:    { sortStat: "stolenBases",         order: "desc", statField: "stolenBases", statLabel: "SB" },
  contact:  { sortStat: "avg",                 order: "desc", statField: "avg",       statLabel: "AVG" },
  balanced: { sortStat: "onBasePlusSlugging",  order: "desc", statField: "ops",       statLabel: "OPS" },
};

const PITCHER_CONFIG = {
  power:     { sortStat: "strikeOuts",                   order: "desc", statField: "strikeOuts",    statLabel: "K"    },
  control:   { sortStat: "walksAndHitsPerInningPitched", order: "asc",  statField: "whip",          statLabel: "WHIP" },
  ace:       { sortStat: "earnedRunAverage",             order: "asc",  statField: "era",           statLabel: "ERA"  },
  workhorse: { sortStat: "inningsPitched",               order: "desc", statField: "inningsPitched", statLabel: "IP"  },
};

// player IDs → { id: currentAge }
const fetchPlayerAges = async (playerIds) => {
  if (!playerIds.length) return {};
  const data = await fetchFromMlbApi(
    `${STATS_BASE}/people?personIds=${playerIds.join(",")}`,
    "Failed to fetch player ages",
  );
  return Object.fromEntries((data.people || []).map((p) => [p.id, p.currentAge]));
};

const fetchSeasonStats = async ({ group, sortStat, order, fetchLimit = 60 }) => {
  const params = new URLSearchParams({
    stats: "season",
    group,
    season: CURRENT_SEASON,
    sortStat,
    order,
    limit: String(fetchLimit),
    sportId: "1",
    playerPool: "All",
  });
  const data = await fetchFromMlbApi(
    `${STATS_BASE}/stats?${params}`,
    `Failed to fetch ${group} season stats`,
  );
  return data.stats?.[0]?.splits ?? [];
};

const toPlayer = (split, statField, statLabel) => ({
  playerId:    split.player?.id,
  playerName:  split.player?.fullName,
  teamId:      split.team?.id,
  teamName:    split.team?.name,
  stat:        split.stat?.[statField] ?? "-",
  statLabel,
  atBats:      split.stat?.atBats,
  gamesPlayed: split.stat?.gamesPlayed,
  gamesStarted: split.stat?.gamesStarted,
  inningsPitched: split.stat?.inningsPitched,
});

const applyLeagueFilter = (players, league) => {
  if (league === "both") return players;
  const ids = league === "AL" ? AL_TEAM_IDS : NL_TEAM_IDS;
  return players.filter((p) => ids.has(p.teamId));
};

const applyAgeFilter = (players, ageGroup, ageMap) => {
  if (ageGroup === "any") return players;
  return players.filter((p) => {
    const age = ageMap[p.playerId];
    if (!age) return true;
    if (ageGroup === "young") return age <= 25;
    if (ageGroup === "prime") return age >= 26 && age <= 32;
    return true;
  });
};

const applyPositionFilter = (players, position) => {
  if (position === "both") return players;
  return players.filter((p) => {
    const gs = Number(p.gamesStarted ?? 0);
    const gp = Number(p.gamesPlayed ?? 1);
    const ratio = gp > 0 ? gs / gp : 0;
    if (position === "starter")  return ratio >= 0.5;
    if (position === "reliever") return ratio <  0.3;
    return true;
  });
};

const fetchQuizHitters = async ({ style = "balanced", age = "any", league = "both", limit = 5 } = {}) => {
  const cfg = HITTER_CONFIG[style] ?? HITTER_CONFIG.balanced;

  const splits = await fetchSeasonStats({
    group: "hitting",
    sortStat: cfg.sortStat,
    order: cfg.order,
    fetchLimit: 80,
  });

  let players = splits.map((s) => toPlayer(s, cfg.statField, cfg.statLabel));
  players = players.filter((p) => Number(p.atBats ?? 0) >= 30);
  players = applyLeagueFilter(players, league);

  if (age !== "any") {
    const ids = players.map((p) => p.playerId).filter(Boolean);
    const ageMap = await fetchPlayerAges(ids);
    players = applyAgeFilter(players, age, ageMap);
  }

  return players.slice(0, limit);
};

const fetchQuizPitchers = async ({ style = "ace", position = "both", age = "any", limit = 5 } = {}) => {
  const cfg = PITCHER_CONFIG[style] ?? PITCHER_CONFIG.ace;

  const splits = await fetchSeasonStats({
    group: "pitching",
    sortStat: cfg.sortStat,
    order: cfg.order,
    fetchLimit: 120,   // リリーフ絞り込み後に5件残るよう多めに取得
  });

  let players = splits.map((s) => toPlayer(s, cfg.statField, cfg.statLabel));
  players = players.filter((p) => parseFloat(p.inningsPitched ?? 0) >= 10);
  players = applyPositionFilter(players, position);

  if (age !== "any") {
    const ids = players.map((p) => p.playerId).filter(Boolean);
    const ageMap = await fetchPlayerAges(ids);
    players = applyAgeFilter(players, age, ageMap);
  }

  return players.slice(0, limit);
};

module.exports = { fetchQuizHitters, fetchQuizPitchers };
