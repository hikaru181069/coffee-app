/**
 * アプリケーションが意図的に投げるエラー。
 *
 * 「想定内の失敗（404, 403, 400 など）」と「想定外の失敗（バグ、DB障害）」を
 * 型で区別するために使う。errorHandler はこのクラスかどうかで、
 * クライアントへ理由を伝えるか、500として詳細を隠すかを決める。
 *
 * code は docs/architecture.md の Error Response の code に対応する。
 */
export class AppError extends Error {
  /**
   * @param {string} code       VALIDATION_ERROR / NOT_FOUND など
   * @param {number} statusCode HTTPステータス
   * @param {string} message    ユーザーへ見せてよいメッセージ
   * @param {Array}  details    項目ごとの詳細（主にバリデーション用）
   */
  constructor(code, statusCode, message, details = []) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

// よく使うものは生成関数を用意する。
// controller / service 側で statusCode と code の対応を毎回書かずに済み、
// 対応表がこのファイルに集約される。

export const validationError = (details = [], message = "入力内容を確認してください") =>
  new AppError("VALIDATION_ERROR", 400, message, details);

export const unauthorizedError = (message = "ログインが必要です") =>
  new AppError("UNAUTHORIZED", 401, message);

export const forbiddenError = (message = "この操作は許可されていません") =>
  new AppError("FORBIDDEN", 403, message);

export const notFoundError = (message = "対象が見つかりません") =>
  new AppError("NOT_FOUND", 404, message);

export const conflictError = (message = "すでに存在します") =>
  new AppError("CONFLICT", 409, message);
