import { API_URL } from "../../utils/apiConfig";

/**
 * 投手 vs 打者のキャリア対戦成績を取得する
 * @param {number|string} pitcherId
 * @param {number|string} batterId
 * @returns {{ hasData: boolean, stats: object|null }}
 */
export const getMatchupStats = async (pitcherId, batterId) => {
  const res = await fetch(
    `${API_URL}/api/matchup?pitcherId=${pitcherId}&batterId=${batterId}`,
  );
  if (!res.ok) throw new Error("Failed to fetch matchup stats");
  return res.json();
};

export const getMatchupPrediction = async (pitcherId, batterId) => {
  const res = await fetch(
    `${API_URL}/api/matchup/predict?pitcherId=${pitcherId}&batterId=${batterId}`,
  );
  if (!res.ok) return null;
  return res.json();
};
