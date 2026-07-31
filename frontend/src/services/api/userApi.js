import { API_URL } from "../../utils/apiConfig";

const createAuthHeaders = (token) => {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

export const getCurrentUser = async (token) => {
  const response = await fetch(`${API_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to load user.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const updateProfile = async ({ name }, token) => {
  const response = await fetch(`${API_URL}/api/users/me`, {
    method: "PATCH",
    headers: createAuthHeaders(token),
    body: JSON.stringify({ name }),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to update profile.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const changePassword = async ({ currentPassword, newPassword }, token) => {
  const response = await fetch(`${API_URL}/api/users/me/password`, {
    method: "PATCH",
    headers: createAuthHeaders(token),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to change password.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const deleteAccount = async (token) => {
  const response = await fetch(`${API_URL}/api/users/me`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to delete account.");
    error.status = response.status;
    throw error;
  }

  return data;
};
