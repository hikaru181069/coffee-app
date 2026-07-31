import { API_URL } from "../../utils/apiConfig";

// 推薦精度を上げるための副次的な記録のため、失敗してもUIには一切影響させない
// (呼び出し側はレスポンスを待たず、エラーも無視してよい)。
const recordInteraction = async (player, token, { action, source }) => {
  if (!token) return;

  const mlbPlayerId = Number(player?.mlbPlayerId || player?.playerId);
  if (!mlbPlayerId) return;

  try {
    await fetch(`${API_URL}/api/interactions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        mlbPlayerId,
        playerType: player.playerType || "hitter",
        action,
        source,
      }),
    });
  } catch {
    // ネットワークエラーなどは無視してよい(閲覧記録は副次的な処理のため)
  }
};

export const recordView = (player, token) =>
  recordInteraction(player, token, { action: "view", source: "detail" });

export const recordDislike = (player, token) =>
  recordInteraction(player, token, { action: "dislike", source: "discover" });
