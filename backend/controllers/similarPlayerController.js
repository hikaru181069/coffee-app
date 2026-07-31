const { fetchSimilarPlayers } = require("../services/mlb/similarPlayerService");

const getSimilarPlayers = async (req, res) => {
  const { playerId } = req.params;

  try {
    const { mlbSimilar, youngSimilar, targetArchetypes, targetStyleScores, unavailable } = await fetchSimilarPlayers(playerId);
    res.json({ mlbSimilar, youngSimilar, targetArchetypes, targetStyleScores, unavailable });
  } catch (error) {
    console.error("Similar players error:", error.message);
    res.status(500).json({ message: "Failed to fetch similar players." });
  }
};

module.exports = { getSimilarPlayers };
