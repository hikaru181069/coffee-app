import { API_URL } from "../../utils/apiConfig";
import { handleUnauthorized } from "../../utils/authStorage";

const createAuthHeaders = (token) => {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
};

/**
 * !response.ok のときに投げる共通処理。
 *
 * 401は「トークンが無効・期限切れ」として自動ログアウトする
 * （handleUnauthorized、utils/authStorage.js参照）。
 * ただしchangePasswordだけは、この関数を使わず個別にハンドリングする。
 * backend/controllers/userController.jsの「現在のパスワードが間違って
 * いる」判定も401を返すため、ここで一律に自動ログアウトすると
 * パスワードを打ち間違えただけで強制ログアウトされてしまう誤動作になる。
 */
const throwIfError = (response, data, fallbackMessage) => {
  if (response.ok) return;

  if (response.status === 401) handleUnauthorized();

  const error = new Error(data.message || fallbackMessage);
  error.status = response.status;
  throw error;
};

export const getCurrentUser = async (token) => {
  const response = await fetch(`${API_URL}/api/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await response.json();

  throwIfError(response, data, "Failed to load user.");

  return data;
};

export const updateProfile = async ({ name }, token) => {
  const response = await fetch(`${API_URL}/api/users/me`, {
    method: "PATCH",
    headers: createAuthHeaders(token),
    body: JSON.stringify({ name }),
  });
  const data = await response.json();

  throwIfError(response, data, "Failed to update profile.");

  return data;
};

/**
 * changePasswordだけはthrowIfErrorを使わない。
 * 401が「トークン無効」ではなく「現在のパスワードが間違っている」
 * （userController.js）を意味するケースがあり、ここで自動ログアウトすると
 * 誤動作になるため（throwIfErrorのコメント参照）。
 */
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

  throwIfError(response, data, "Failed to delete account.");

  return data;
};
