/**
 * register / login の入力を検証する。
 *
 * これまでauthController.jsには入力検証が無く、name/email/passwordが
 * 未入力のまま送られると、Mongooseのスキーマ検証エラーがそのまま
 * catch節に落ちて「Failed to register user」という不正確な500になって
 * いた。coffeeRecordValidator.jsと同じ「DB/Expressに依存しない純粋関数、
 * {valid, details}を返す」パターンに揃える。
 *
 * ただしauthController.js/userController.jsは、frontend側の
 * utils/errorMessage.jsが特定の英語メッセージ文字列（"Invalid email or
 * password"等）をそのまま照合する古い応答形式（{ message }）に依存して
 * いるため、他のvalidatorのようにAppError/validationErrorへは寄せず、
 * 既存の応答形式のまま使う（既存APIの互換性を理由なく壊さないため）。
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const isMissing = (value) => value === undefined || value === null || value === "";
const isBlankString = (value) => typeof value === "string" && value.trim() === "";

export const validateRegister = (body = {}) => {
  const details = [];

  if (isMissing(body.name) || isBlankString(body.name)) {
    details.push({ field: "name", message: "Name is required" });
  }

  if (isMissing(body.email)) {
    details.push({ field: "email", message: "Email is required" });
  } else if (typeof body.email !== "string" || !EMAIL_PATTERN.test(body.email)) {
    details.push({ field: "email", message: "Email format is invalid" });
  }

  if (isMissing(body.password)) {
    details.push({ field: "password", message: "Password is required" });
  } else if (typeof body.password !== "string" || body.password.length < MIN_PASSWORD_LENGTH) {
    details.push({
      field: "password",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
    });
  }

  return { valid: details.length === 0, details };
};

export const validateLogin = (body = {}) => {
  const details = [];

  // email/passwordがオブジェクトのまま素通りすると、authController.jsの
  // User.findOne({ email }) がそのままMongoの演算子として解釈してしまう
  // （例: { "$regex": "^a" } でメールアドレスの登録有無を推測できる、
  // NoSQLインジェクション）。validateRegisterは型チェックしているのに
  // こちらは漏れていたため、型チェックを追加する。
  if (isMissing(body.email)) {
    details.push({ field: "email", message: "Email is required" });
  } else if (typeof body.email !== "string") {
    details.push({ field: "email", message: "Email must be a string" });
  }

  if (isMissing(body.password)) {
    details.push({ field: "password", message: "Password is required" });
  } else if (typeof body.password !== "string") {
    details.push({ field: "password", message: "Password must be a string" });
  }

  return { valid: details.length === 0, details };
};
