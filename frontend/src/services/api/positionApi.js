import { API_URL } from "../../utils/apiConfig";

export const getPlayersByPosition = async (position) => {
  const response = await fetch(`${API_URL}/api/positions/${position}`);
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Failed to fetch players by position");
    error.status = response.status;
    throw error;
  }
  return data;
};
