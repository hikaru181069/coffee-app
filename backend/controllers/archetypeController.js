const {
  fetchPlayersByArchetype,
  fetchFutureMvpPlayers,
  fetchJapanesePlayers,
} = require("../services/mlb/archetypeService");

// スタットの閾値分類ではない「特殊カテゴリー」。:type にこのslugが来た場合は
// 通常のアーキタイプ分類マップを見ずに、専用のロジックへ振り分ける。
const SPECIAL_CATEGORIES = {
  "future-mvp": fetchFutureMvpPlayers,
  "japanese-players": fetchJapanesePlayers,
};

const getPlayersByArchetype = async (req, res) => {
  const { type } = req.params;
  try {
    const fetchPlayers = SPECIAL_CATEGORIES[type] || (() => fetchPlayersByArchetype(type));
    const players = await fetchPlayers();
    res.json(players);
  } catch (error) {
    console.error("Archetype players error:", error.message);
    res.status(500).json({ message: "Failed to fetch players by archetype." });
  }
};

module.exports = { getPlayersByArchetype };
