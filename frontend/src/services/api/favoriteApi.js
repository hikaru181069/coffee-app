import { API_URL } from "../../utils/apiConfig";

const createAuthHeaders = (token) => {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getFavorites = async (token) => {
  if (!token) {
    return [];
  }

  const response = await fetch(`${API_URL}/api/favorites`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to load favorites.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const createFavorite = async (player, token) => {
  const response = await fetch(`${API_URL}/api/favorites`, {
    method: "POST",
    headers: createAuthHeaders(token),
    body: JSON.stringify(createFavoriteRequestBody(player)),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to add favorite.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const createFavoritesBulk = async (players, token) => {
  const response = await fetch(`${API_URL}/api/favorites/bulk`, {
    method: "POST",
    headers: createAuthHeaders(token),
    body: JSON.stringify({
      players: players.map(createFavoriteRequestBody),
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to add favorites.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const updateFavorite = async (favoriteId, updateData, token) => {
  const response = await fetch(`${API_URL}/api/favorites/${favoriteId}`, {
    method: "PUT",
    headers: createAuthHeaders(token),
    body: JSON.stringify(updateData),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to update favorite.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const deleteFavorite = async (favoriteId, token) => {
  const response = await fetch(`${API_URL}/api/favorites/${favoriteId}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to delete favorite.");
    error.status = response.status;
    throw error;
  }

  return data;
};

const createFavoriteRequestBody = (player) => {
  return {
    mlbPlayerId: Number(player.mlbPlayerId || player.playerId),
    fullName: player.name || player.fullName,
    teamName: player.team || player.teamName || "Unknown",
    position: player.position || "Unknown",
    imageUrl: player.image || player.imageUrl || "",
    playerType: player.playerType || "hitter",
    hitterStats: player.hitterStats,
    pitcherStats: player.pitcherStats,
    baseballSavantUrl: player.baseballSavantUrl || "",
    source: player.source || "MLB Stats API",
  };
};
