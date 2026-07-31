const { fetchPlayersByPosition } = require("../services/mlb/positionService");

const VALID_POSITIONS = new Set([
  "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "OF", "DH", "SP", "RP",
]);

const getPlayersByPosition = async (req, res) => {
  const pos = (req.params.position || "").toUpperCase();

  if (!VALID_POSITIONS.has(pos)) {
    return res.status(400).json({ message: `Invalid position: ${pos}` });
  }

  try {
    const players = await fetchPlayersByPosition(pos);
    res.json({ position: pos, players });
  } catch (err) {
    console.error("[positionController] error:", err.message);
    res.status(500).json({ message: "Failed to fetch players by position" });
  }
};

module.exports = { getPlayersByPosition };
