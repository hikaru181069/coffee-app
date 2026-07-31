import { API_URL } from "../../utils/apiConfig";

export const getRecommendations = async (token) => {
  if (!token) {
    return [];
  }

  const response = await fetch(`${API_URL}/api/recommendations`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to load recommendations.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const getQuizRecommendations = async (token, { type, style, age, league, position }) => {
  const params = new URLSearchParams({ type, style, age, league, position });
  const response = await fetch(`${API_URL}/api/recommendations/quiz?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Failed to load quiz recommendations.");
    error.status = response.status;
    throw error;
  }
  return data.players || [];
};

export const getForYouRecommendations = async (token) => {
  if (!token) return { groups: [], fallback: [] };

  const response = await fetch(`${API_URL}/api/recommendations/foryou`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to load For You recommendations.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const getProspectRecommendations = async (token) => {
  const response = await fetch(`${API_URL}/api/recommendations/prospects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data.message || "Failed to load prospect recommendations.");
    error.status = response.status;
    throw error;
  }
  return data;
};

export const getFutureStars = async (token) => {
  if (!token) {
    return [];
  }

  const response = await fetch(`${API_URL}/api/recommendations/future-stars`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(
      data.message || "Failed to load future stars recommendations.",
    );
    error.status = response.status;
    throw error;
  }

  return data.futureStars || [];
};
