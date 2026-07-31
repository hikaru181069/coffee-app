const {
  buildPlayerDetailsUrl,
  buildPlayerStatsUrl,
} = require("./mlbUrlBuilder");
const { fetchFromMlbApi, fetchMlbResponse } = require("./mlbClient");

const fetchExternalPlayerDetails = async (playerId) => {
  const data = await fetchFromMlbApi(
    buildPlayerDetailsUrl(playerId),
    "Failed to fetch player details from MLB API",
  );

  return data.people?.[0];
};

const fetchExternalPlayerStats = async ({
  playerId,
  statsType = "season",
  season,
}) => {
  try {
    const response = await fetchMlbResponse(
      buildPlayerStatsUrl({ playerId, statsType, season }),
    );

    if (!response.ok) {
      return {};
    }

    const data = await response.json();

    return data.stats || [];
  } catch (error) {
    console.error("External player stats error:", error.message);
    return [];
  }
};

module.exports = {
  fetchExternalPlayerDetails,
  fetchExternalPlayerStats,
};
