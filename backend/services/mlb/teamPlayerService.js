const { buildTeamRosterUrl } = require("./mlbUrlBuilder");
const { fetchFromMlbApi } = require("./mlbClient");
const {
  formatExternalPlayer,
  formatExternalStats,
} = require("./playerFormatter");
const {
  fetchExternalPlayerDetails,
  fetchExternalPlayerStats,
} = require("./playerStatsService");

const fetchExternalPlayersByTeam = async (teamId) => {
  const data = await fetchFromMlbApi(
    buildTeamRosterUrl(teamId),
    "Failed to fetch team roster from MLB API",
  );
  const roster = data.roster || [];

  return Promise.all(
    roster.map(async (rosterPlayer) => {
      const detailedPlayer =
        (await fetchExternalPlayerDetails(rosterPlayer.person.id)) ||
        rosterPlayer.person;
      const player = formatExternalPlayer(detailedPlayer);
      const seasonStats = await fetchExternalPlayerStats({
        playerId: player.mlbPlayerId,
      });
      const formattedSeasonStats = formatExternalStats(seasonStats);

      return {
        ...player,
        ...formattedSeasonStats,
        currentSeasonStats: formattedSeasonStats,
      };
    }),
  );
};

module.exports = {
  fetchExternalPlayersByTeam,
};
