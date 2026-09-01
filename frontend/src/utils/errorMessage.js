/**
 * APIエラーを表示用の多言語メッセージへ変換する。
 *
 * バックエンドは変更せず、フロントエンド側だけで日英を切り替えるための層。
 * すべてのAPI（coffee-record/master-data/graph系だけでなくauth/users系も
 * 2026-08以降）が ApiError.code（VALIDATION_ERROR等）を持つため、code を
 * キーに errors.byCode から引く。どちらにも一致しなければ、サーバーが
 * 返した message をそのまま表示する（想定外のエラーで無言にしないため）。
 */

const CODE_KEYS = new Set([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "CONFLICT",
  "INVALID_CREDENTIALS",
  "INVALID_CURRENT_PASSWORD",
  "NETWORK_ERROR",
  "UNKNOWN_ERROR",
  "INTERNAL_ERROR",
]);

/** @param {Error} error  @param {Function} t react-i18nextのt関数 */
export const getErrorMessage = (error, t) => {
  if (!error) return "";

  if (error.code && CODE_KEYS.has(error.code)) {
    return t(`errors.byCode.${error.code}`);
  }

  return error.message || t("errors.byCode.UNKNOWN_ERROR");
};
