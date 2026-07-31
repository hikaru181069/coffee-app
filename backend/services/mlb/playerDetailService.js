const {
  formatExternalPlayer,
  formatExternalStats,
  formatRecentGames,
} = require("./playerFormatter");
const {
  fetchExternalPlayerDetails,
  fetchExternalPlayerStats,
} = require("./playerStatsService");

const fetchExternalPlayerFullDetails = async (playerId) => {
  const detailedPlayer = await fetchExternalPlayerDetails(playerId);
  const player = formatExternalPlayer(detailedPlayer);
  const [seasonStats, careerStats, gameLogStats] = await Promise.all([
    fetchExternalPlayerStats({ playerId }),
    fetchExternalPlayerStats({ playerId, statsType: "career" }),
    fetchExternalPlayerStats({ playerId, statsType: "gameLog" }),
  ]);
  const formattedSeasonStats = formatExternalStats(seasonStats);

  return {
    ...player,
    ...formattedSeasonStats,
    currentSeasonStats: formattedSeasonStats,
    careerStats: formatExternalStats(careerStats),
    recentGames: formatRecentGames(gameLogStats, player.playerType),
  };
};

module.exports = {
  fetchExternalPlayerFullDetails,
};
