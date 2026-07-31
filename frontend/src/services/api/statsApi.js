import { API_URL } from "../../utils/apiConfig";

export const getLeaders = async ({ type = "hitting", limit = 10, league = "all" } = {}) => {
  const params = new URLSearchParams({ type, limit: String(limit), league });
  const response = await fetch(`${API_URL}/api/stats/leaders?${params}`);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to fetch stats leaders.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const getHotPlayers = async ({ days = 14 } = {}) => {
  const params = new URLSearchParams({ days: String(days) });
  const response = await fetch(`${API_URL}/api/stats/hot?${params}`);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to fetch hot players.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const getRisingStars = async () => {
  const response = await fetch(`${API_URL}/api/stats/rising-stars`);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to fetch rising stars.");
    error.status = response.status;
    throw error;
  }

  return data;
};
