import { buildTeamRosterUrl } from "./mlbUrlBuilder.js";
import { fetchFromMlbApi } from "./mlbClient.js";
import {
  formatExternalPlayer,
  formatExternalStats,
} from "./playerFormatter.js";
import {
  fetchExternalPlayerDetails,
  fetchExternalPlayerStats,
} from "./playerStatsService.js";

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

export {
  fetchExternalPlayersByTeam,
};
