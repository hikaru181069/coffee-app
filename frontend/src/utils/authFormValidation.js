/**
 * ログイン・新規登録フォームの入力検証（クライアント側）。
 *
 * 以前はここでの検証が無く、必須項目が空のまま送信するとサーバーの
 * エラー（例: "Name is required"）が翻訳されずそのまま1件だけ表示され、
 * どの欄が悪いかも分からなかった。features/coffee-records/validation/
 * recordFormValidation.js と同じ形（{ フィールド名: メッセージ }を
 * 一度にすべて返す）にそろえる。
 *
 * メールの形式チェックはサーバー側で強制されていないため、ここでも
 * 必須チェックのみに留める（サーバーに無い制約をフロントだけで
 * 勝手に増やさない）。
 */

/** @param {{ email: string, password: string }} values @param {Function} t */
export const validateLoginForm = (values, t) => {
  const errors = {};

  if (!values.email.trim()) {
    errors.email = t("validation.emailRequired");
  }
  if (!values.password) {
    errors.password = t("validation.passwordRequired");
  }

  return errors;
};

/** @param {{ name: string, email: string, password: string }} values @param {Function} t */
export const validateRegisterForm = (values, t) => {
  const errors = {};

  if (!values.name.trim()) {
    errors.name = t("validation.nameRequired");
  }
  if (!values.email.trim()) {
    errors.email = t("validation.emailRequired");
  }
  if (!values.password) {
    errors.password = t("validation.passwordRequired");
  }

  return errors;
};

export const hasErrors = (errors) => Object.keys(errors).length > 0;
