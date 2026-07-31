import { API_URL } from "../../utils/apiConfig";

/**
 * 類似選手リストを取得する
 * FastAPI → Express → フロントエンド の順でデータが流れる
 */
export const getSimilarPlayers = async (playerId) => {
  const response = await fetch(`${API_URL}/api/similar-players/${playerId}`);

  if (!response.ok) {
    return { mlbSimilar: [], youngSimilar: [], unavailable: true };
  }

  return response.json();
};
