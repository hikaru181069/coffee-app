import { API_URL } from "../../utils/apiConfig";

/**
 * 順位表を取得する
 * @param {number} season
 * @returns {{ season: number, divisions: Array }}
 */
export const getStandings = async (season) => {
  const q = season ? `?season=${season}` : "";
  const res = await fetch(`${API_URL}/api/league/standings${q}`);
  if (!res.ok) throw new Error("Failed to fetch standings");
  return res.json();
};

/**
 * 指定日の試合結果を取得する
 * @param {string} date - YYYY-MM-DD
 * @returns {{ date: string, totalGames: number, games: Array }}
 */
export const getScores = async (date) => {
  const q = date ? `?date=${date}` : "";
  const res = await fetch(`${API_URL}/api/league/scores${q}`);
  if (!res.ok) throw new Error("Failed to fetch scores");
  return res.json();
};

/**
 * ワイルドカード順位を取得する
 * @param {number} season
 * @returns {{ season, leagues: Array<{ league, teams }> }}
 */
export const getWildCard = async (season) => {
  const q = season ? `?season=${season}` : "";
  const res = await fetch(`${API_URL}/api/league/wildcard${q}`);
  if (!res.ok) throw new Error("Failed to fetch wild card");
  return res.json();
};
