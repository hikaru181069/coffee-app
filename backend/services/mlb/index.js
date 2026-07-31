const {
  fetchExternalPlayerFullDetails,
} = require("./playerDetailService");
const { fetchExternalPlayers, fetchPlayerSuggestions } = require("./playerSearchService");
const {
  fetchExternalPlayersByTeam,
} = require("./teamPlayerService");
const { getPlayerBios, getPlayerProfiles } = require("./playerBioService");

module.exports = {
  fetchExternalPlayerFullDetails,
  fetchExternalPlayers,
  fetchPlayerSuggestions,
  fetchExternalPlayersByTeam,
  getPlayerBios,
  getPlayerProfiles,
};
