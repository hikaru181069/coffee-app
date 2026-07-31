const { fetchFromMlbApi } = require("./mlbClient");

const STATS_URL = "https://statsapi.mlb.com/api/v1/stats";
const CURRENT_SEASON = new Date().getFullYear().toString();

const getDateRange = (days) => {
  const end = new Date();
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const fmt = (d) => d.toISOString().split("T")[0];
  return { startDate: fmt(start), endDate: fmt(end) };
};

// 野手: 打率順、最低 AB 以上の選手だけ返す
const fetchHotHitters = async ({ days = 14, limit = 5, minAb = 10 } = {}) => {
  const { startDate, endDate } = getDateRange(days);
  const params = new URLSearchParams({
    group: "hitting",
    stats: "byDateRange",
    startDate,
    endDate,
    sortStat: "onBasePlusSlugging",
    order: "desc",
    limit: "50",
    sportId: "1",
    season: CURRENT_SEASON,
  });

  const data = await fetchFromMlbApi(
    `${STATS_URL}?${params}`,
    "Failed to fetch hot hitters",
  );

  const splits = data.stats?.[0]?.splits ?? [];
  return splits
    .filter((s) => Number(s.stat?.atBats ?? 0) >= minAb)
    .slice(0, limit)
    .map((s) => ({
      playerId: s.player?.id,
      playerName: s.player?.fullName,
      teamId: s.team?.id,
      teamName: s.team?.name,
      stat: s.stat?.ops ?? "-",
      statLabel: "OPS",
      atBats: s.stat?.atBats,
    }));
};

// 投手: 奪三振数順、最低 IP 以上の選手だけ返す
const fetchHotPitchers = async ({ days = 14, limit = 5, minIp = 3 } = {}) => {
  const { startDate, endDate } = getDateRange(days);
  const params = new URLSearchParams({
    group: "pitching",
    stats: "byDateRange",
    startDate,
    endDate,
    sortStat: "walksAndHitsPerInningPitched",
    order: "asc",
    limit: "50",
    sportId: "1",
    season: CURRENT_SEASON,
  });

  const data = await fetchFromMlbApi(
    `${STATS_URL}?${params}`,
    "Failed to fetch hot pitchers",
  );

  const splits = data.stats?.[0]?.splits ?? [];
  return splits
    .filter((s) => parseFloat(s.stat?.inningsPitched ?? 0) >= minIp)
    .slice(0, limit)
    .map((s) => ({
      playerId: s.player?.id,
      playerName: s.player?.fullName,
      teamId: s.team?.id,
      teamName: s.team?.name,
      stat: s.stat?.whip ?? "-",
      statLabel: "WHIP",
      inningsPitched: s.stat?.inningsPitched,
    }));
};

module.exports = { fetchHotHitters, fetchHotPitchers };
