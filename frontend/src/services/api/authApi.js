import { API_URL } from "../../utils/apiConfig";

/**
 * login/registerだけは、他のfeatureのAPIクライアントと違い
 * services/api/httpClient.js の apiRequest を使わず、生のfetchで実装している。
 *
 * apiRequestは401を受け取ると必ずhandleUnauthorized()（認証情報を消して
 * /loginへ強制遷移）を呼ぶ。しかしログイン画面の401は「トークン切れ」
 * ではなく「メール・パスワードが違う」という意味であり、共通クライアントを
 * 通すと、入力ミスをしただけのユーザーを誤ってログアウト処理してしまう。
 * そのためこのファイルだけ独自にfetch+エラー処理を持つ。
 */

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
