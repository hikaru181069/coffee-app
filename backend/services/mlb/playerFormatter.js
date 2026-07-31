const buildPlayerHeadshotUrl = (playerId) => {
  return `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_426,q_auto:best/v1/people/${playerId}/headshot/67/current`;
};

const buildBaseballSavantUrl = (player) => {
  const nameSlug = player.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-");

  return `https://baseballsavant.mlb.com/savant-player/${nameSlug}-${player.id}`;
};

const formatExternalPlayer = (player) => {
  return {
    mlbPlayerId: player.id,
    name: player.fullName,
    team: player.currentTeam?.name || "Unknown",
    teamId: player.currentTeam?.id || null,
    position:     player.primaryPosition?.name         || "Unknown",
    positionAbbr: player.primaryPosition?.abbreviation || "",
    playerType:
      player.primaryPosition?.name === "Pitcher" ? "pitcher" : "hitter",
    image: buildPlayerHeadshotUrl(player.id),
    birthDate: player.birthDate,
    height: player.height,
    weight: player.weight,
    active: player.active,
    mlbDebutDate: player.mlbDebutDate,
    baseballSavantUrl: buildBaseballSavantUrl(player),
  };
};

const formatExternalStats = (stats = []) => {
  const hittingSplit = stats.find(
    (stat) => stat.group?.displayName === "hitting",
  )?.splits?.[0];
  const pitchingSplit = stats.find(
    (stat) => stat.group?.displayName === "pitching",
  )?.splits?.[0];

  return {
    hitterStats: hittingSplit
      ? {
          gamesPlayed: hittingSplit.stat.gamesPlayed,
          plateAppearances: hittingSplit.stat.plateAppearances,
          atBats: hittingSplit.stat.atBats,
          runs: hittingSplit.stat.runs,
          hits: hittingSplit.stat.hits,
          doubles: hittingSplit.stat.doubles,
          triples: hittingSplit.stat.triples,
          homeRuns: hittingSplit.stat.homeRuns,
          rbis: hittingSplit.stat.rbi,
          baseOnBalls: hittingSplit.stat.baseOnBalls,
          strikeOuts: hittingSplit.stat.strikeOuts,
          stolenBases: hittingSplit.stat.stolenBases,
          battingAverage: hittingSplit.stat.avg,
          obp: hittingSplit.stat.obp,
          slg: hittingSplit.stat.slg,
          ops: hittingSplit.stat.ops,
        }
      : undefined,
    pitcherStats: pitchingSplit
      ? {
          gamesPlayed: pitchingSplit.stat.gamesPlayed,
          gamesStarted: pitchingSplit.stat.gamesStarted,
          wins: pitchingSplit.stat.wins,
          losses: pitchingSplit.stat.losses,
          saves: pitchingSplit.stat.saves,
          inningsPitched: pitchingSplit.stat.inningsPitched,
          hits: pitchingSplit.stat.hits,
          earnedRuns: pitchingSplit.stat.earnedRuns,
          baseOnBalls: pitchingSplit.stat.baseOnBalls,
          strikeouts: pitchingSplit.stat.strikeOuts,
          era: pitchingSplit.stat.era,
          whip: pitchingSplit.stat.whip,
        }
      : undefined,
  };
};

const formatRecentGames = (stats = [], playerType = "hitter") => {
  const preferredGroup = playerType === "pitcher" ? "pitching" : "hitting";
  const preferredSplits =
    stats.find((stat) => stat.group?.displayName === preferredGroup)?.splits ||
    [];
  const fallbackSplits = stats.flatMap((stat) => stat.splits || []);
  const splits = preferredSplits.length > 0 ? preferredSplits : fallbackSplits;

  return [...splits]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
    .map((split) => ({
      date: split.date,
      opponent: split.opponent?.name || "Unknown",
      summary: split.stat?.summary || "No summary",
      result: split.isWin ? "W" : "L",
    }));
};

module.exports = {
  formatExternalPlayer,
  formatExternalStats,
  formatRecentGames,
};
