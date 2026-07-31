import { API_URL } from "../../utils/apiConfig";

/**
 * 1試合の詳細（メタ + イニングスコア + ボックススコア）を取得する
 * @param {number|string} gamePk
 * @returns {{ gamePk, status, away, home, innings, boxscore }}
 */
export const getGame = async (gamePk) => {
  const res = await fetch(`${API_URL}/api/games/${gamePk}`);
  if (!res.ok) throw new Error("Failed to fetch game");
  return res.json();
};

export const getGamePlays = async (gamePk) => {
  const res = await fetch(`${API_URL}/api/games/${gamePk}/plays`);
  if (!res.ok) throw new Error("Failed to fetch play-by-play");
  return res.json();
};

export const getGameHighlights = async (gamePk) => {
  const res = await fetch(`${API_URL}/api/games/${gamePk}/highlights`);
  if (!res.ok) throw new Error("Failed to fetch highlights");
  return res.json();
};
