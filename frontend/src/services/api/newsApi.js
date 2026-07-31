import { API_URL } from "../../utils/apiConfig";

export const getNews = async (limit = 20) => {
  const res = await fetch(`${API_URL}/api/news?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch news");
  return res.json();
};

export const getTeamNews = async (teamId, limit = 10) => {
  const res = await fetch(`${API_URL}/api/news/team/${teamId}?limit=${limit}`);
  if (!res.ok) throw new Error("Failed to fetch team news");
  return res.json();
};
