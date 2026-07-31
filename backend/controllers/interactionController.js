const { logInteraction } = require("../services/interactionService");

// クライアントから直接記録できるアクション種別
// (favoriteはfavoriteController側で記録済みのためここには含めない)。
const CLIENT_RECORDABLE_ACTIONS = ["view", "dislike"];

// 選手詳細ページの閲覧・Discover画面のdislikeを記録する。
const recordInteraction = async (req, res) => {
  const { mlbPlayerId, playerType, action, source } = req.body;

  if (!mlbPlayerId || !CLIENT_RECORDABLE_ACTIONS.includes(action)) {
    return res.status(400).json({ message: "Invalid interaction" });
  }

  await logInteraction({
    userId: req.user._id,
    mlbPlayerId,
    playerType,
    action,
    source: source || "detail",
  });

  res.status(204).end();
};

module.exports = { recordInteraction };
