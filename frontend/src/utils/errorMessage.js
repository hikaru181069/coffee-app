/**
 * APIエラーを表示用の多言語メッセージへ変換する。
 *
 * バックエンドは変更せず、フロントエンド側だけで日英を切り替えるための層。
 *
 *   coffee-record/master-data/graph系 … ApiError.code（VALIDATION_ERROR等）を
 *     持つため、code をキーに errors.byCode から引く。
 *   auth/users系（mlb-app由来、そのまま再利用）… code を持たず、固定の
 *     英語メッセージ（"Invalid email or password" 等）を返すだけなので、
 *     その文字列をキーに errors.legacy から引く。
 *
 * どちらにも一致しなければ、サーバーが返した message をそのまま表示する
 * （想定外のエラーで無言にしないため）。
 */

const CODE_KEYS = new Set([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "NETWORK_ERROR",
  "UNKNOWN_ERROR",
  "INTERNAL_ERROR",
]);

const LEGACY_MESSAGE_KEYS = {
  "Invalid email or password": "errors.legacy.invalidCredentials",
  "User already exists": "errors.legacy.userExists",
  "Failed to login": "errors.legacy.loginFailed",
  "Failed to register user": "errors.legacy.registerFailed",
  "Failed to load user.": "errors.legacy.loadUserFailed",
  "Failed to update profile.": "errors.legacy.updateProfileFailed",
  "Failed to change password.": "errors.legacy.changePasswordFailed",
  "Failed to delete account.": "errors.legacy.deleteAccountFailed",
};

/** @param {Error} error  @param {Function} t react-i18nextのt関数 */
export const getErrorMessage = (error, t) => {
  if (!error) return "";

  if (error.code && CODE_KEYS.has(error.code)) {
    return t(`errors.byCode.${error.code}`);
  }

  if (error.message && LEGACY_MESSAGE_KEYS[error.message]) {
    return t(LEGACY_MESSAGE_KEYS[error.message]);
  }

  return error.message || t("errors.byCode.UNKNOWN_ERROR");
};
