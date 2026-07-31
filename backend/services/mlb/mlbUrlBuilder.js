const MLB_PLAYER_SEARCH_URL = "https://statsapi.mlb.com/api/v1/people/search";
const MLB_PLAYER_STATS_URL = "https://statsapi.mlb.com/api/v1/people";
const MLB_TEAM_URL = "https://statsapi.mlb.com/api/v1/teams";
const CURRENT_SEASON = new Date().getFullYear().toString();

const buildPlayerSearchUrl = (searchText) => {
  return `${MLB_PLAYER_SEARCH_URL}?names=${encodeURIComponent(searchText)}`;
};

const buildPlayerDetailsUrl = (playerId) => {
  return `${MLB_PLAYER_STATS_URL}/${playerId}?hydrate=currentTeam`;
};

const buildPlayerStatsUrl = ({
  playerId,
  statsType = "season",
  season = CURRENT_SEASON,
}) => {
  const seasonQuery = statsType === "career" ? "" : `&season=${season}`;

  return `${MLB_PLAYER_STATS_URL}/${playerId}/stats?stats=${statsType}&group=hitting,pitching${seasonQuery}`;
};

const buildTeamRosterUrl = (teamId) => {
  return `${MLB_TEAM_URL}/${teamId}/roster`;
};

module.exports = {
  buildPlayerDetailsUrl,
  buildPlayerSearchUrl,
  buildPlayerStatsUrl,
  buildTeamRosterUrl,
};
