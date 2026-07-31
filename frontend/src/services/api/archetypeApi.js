import { API_URL } from "../../utils/apiConfig";

export const getPlayersByArchetype = async (typeSlug) => {
  const response = await fetch(`${API_URL}/api/archetype/${typeSlug}`);
  if (!response.ok) return [];
  return response.json();
};
