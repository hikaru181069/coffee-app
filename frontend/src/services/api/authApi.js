import { API_URL } from "../../utils/apiConfig";

export const loginUser = async ({ email, password }) => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to login.");
    error.status = response.status;
    throw error;
  }

  return data;
};

export const registerUser = async ({ name, email, password }) => {
  const response = await fetch(`${API_URL}/api/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data.message || "Failed to register.");
    error.status = response.status;
    throw error;
  }

  return data;
};
