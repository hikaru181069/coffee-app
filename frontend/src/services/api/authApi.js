import { API_URL } from "../../utils/apiConfig";

/**
 * !response.ok のときに投げる共通処理。
 *
 * backendは { error: { code, message, details } } を返す
 * （2026-08、backend/controllers/authController.js参照）。
 * codeをerror.codeへ載せておくことで、utils/errorMessage.jsが
 * コードベースで多言語メッセージへ変換できる。
 */
const throwApiError = (response, data, fallbackMessage) => {
  const apiError = data?.error;
  const error = new Error(apiError?.message || fallbackMessage);
  error.status = response.status;
  error.code = apiError?.code;
  throw error;
};

export const loginUser = async ({ email, password }) => {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();

  if (!response.ok) throwApiError(response, data, "Failed to login.");

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

  if (!response.ok) throwApiError(response, data, "Failed to register.");

  return data;
};
