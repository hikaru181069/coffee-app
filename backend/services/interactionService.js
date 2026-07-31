const Interaction = require("../models/Interaction");

// 行動記録はおすすめ精度を上げるための副次的な処理のため、失敗してもユーザー操作
// (お気に入り登録・選手詳細の閲覧)自体は止めない。ベストエフォートで記録する。
const logInteraction = async ({ userId, mlbPlayerId, playerType, action, source }) => {
  try {
    await Interaction.create({
      user: userId,
      mlbPlayerId: Number(mlbPlayerId),
      playerType: playerType === "pitcher" ? "pitcher" : "hitter",
      action,
      source,
    });
  } catch (error) {
    console.warn(`[interaction] failed to log ${action} for player ${mlbPlayerId}: ${error.message}`);
  }
};

module.exports = { logInteraction };
