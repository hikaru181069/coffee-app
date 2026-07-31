import { API_URL } from "../../utils/apiConfig";

export const getPlayerYearByYear = async (playerId) => {
  const res = await fetch(`${API_URL}/api/external/players/${playerId}/year-by-year`);
  if (!res.ok) throw new Error("Failed to fetch year-by-year stats");
  return res.json();
};
