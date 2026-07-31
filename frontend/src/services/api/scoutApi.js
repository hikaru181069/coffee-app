import { API_URL } from "../../utils/apiConfig";

export const getScoutingReport = async (playerId) => {
  const response = await fetch(`${API_URL}/api/scout/${playerId}`);
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to load scouting report.");
    error.status = response.status;
    throw error;
  }

  return data;
};
