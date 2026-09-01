import { apiRequest } from "../../features/coffee-records/api/httpClient";

/**
 * ログイン中ユーザー自身のプロフィールAPI。
 *
 * 2026-08、以前は生fetchで実装しており、他のfeature（coffee-records等）
 * が使う共通クライアント（features/coffee-records/api/httpClient.js）とは
 * 別のエラー処理を個別に持っていた。当時はchangePasswordの「現在の
 * パスワードが違う」を401で返しており、共通クライアントの「401は必ず
 * トークン無効」という前提と衝突するため独自実装にしていたが、backend側で
 * 400（INVALID_CURRENT_PASSWORD）へ改めたことでこの前提が成り立つように
 * なり、他のfeatureと同じ共通クライアントへ揃えられるようになった。
 */

export const getCurrentUser = ({ signal } = {}) => apiRequest("/api/users/me", { signal });

export const updateProfile = ({ name }) =>
  apiRequest("/api/users/me", { method: "PATCH", body: { name } });

export const changePassword = ({ currentPassword, newPassword }) =>
  apiRequest("/api/users/me/password", {
    method: "PATCH",
    body: { currentPassword, newPassword },
  });

export const deleteAccount = () => apiRequest("/api/users/me", { method: "DELETE" });
