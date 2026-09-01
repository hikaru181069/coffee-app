import { AppError } from "../utils/AppError.js";

/**
 * エラー応答を1か所へ集約する。
 *
 * これが無いと、各controllerが try/catch で個別に
 * res.status(500).json({ message: ... }) を書くことになり、
 * 形式がずれたり、エラーを握りつぶす箇所が生まれる
 * （CLAUDE.md「エラーを握りつぶさない」）。
 *
 * Express 5 では、asyncなハンドラが返したPromiseが reject すると
 * 自動でエラーミドルウェアへ渡される。そのため controller 側に
 * try/catch を書かなくてよい（Express 4 では next(error) が必要だった）。
 *
 * 応答形式は docs/api.md の「エラーレスポンスの形式」に従う:
 *   { "error": { "code": "...", "message": "...", "details": [] } }
 */

/** 新形式のエラー応答を組み立てる */
const buildErrorBody = (code, message, details = []) => ({
  error: { code, message, details },
});

/**
 * どのルートにも一致しなかったリクエストを 404 にする。
 * app.js で全ルート登録の後段に置き、すべてのAPIに対して統一形式で返す。
 */
export const notFoundHandler = (req, res) => {
  res
    .status(404)
    .json(buildErrorBody("NOT_FOUND", "リクエストされたエンドポイントは存在しません"));
};

/**
 * エラーミドルウェア。
 *
 * Expressは引数が4つの関数をエラーハンドラとして認識するため、
 * 使っていなくても next を残す必要がある。
 */
// eslint-disable-next-line no-unused-vars
export const errorHandler = (error, req, res, next) => {
  // 1. アプリが意図的に投げたエラー → そのまま伝える
  if (error instanceof AppError) {
    return res
      .status(error.statusCode)
      .json(buildErrorBody(error.code, error.message, error.details));
  }

  // 2. Mongooseのスキーマ検証エラー → 400にする。
  //    validatorをすり抜けた入力の最後の砦。項目ごとの理由を details に入れる
  if (error.name === "ValidationError" && error.errors) {
    const details = Object.entries(error.errors).map(([field, fieldError]) => ({
      field,
      message: fieldError.message,
    }));

    return res
      .status(400)
      .json(buildErrorBody("VALIDATION_ERROR", "入力内容を確認してください", details));
  }

  // 3. ObjectIdなどのキャスト失敗 → 400にする。
  //    これを拾わないと不正なIDが500になってしまう
  //    （CLAUDE.md「不正ObjectIdを500にしない」）
  if (error.name === "CastError") {
    return res
      .status(400)
      .json(
        buildErrorBody("VALIDATION_ERROR", "入力内容を確認してください", [
          { field: error.path, message: "IDの形式が正しくありません" },
        ]),
      );
  }

  // 4. unique index 違反 → 409
  if (error.code === 11000) {
    return res.status(409).json(buildErrorBody("CONFLICT", "すでに登録されています"));
  }

  // 5. 想定外のエラー → 500。
  //    原因はサーバーログにだけ残し、クライアントへは詳細を返さない。
  //    スタックトレースに内部構造やトークンが含まれることがあるため
  console.error("Unhandled error:", error);

  return res
    .status(500)
    .json(buildErrorBody("INTERNAL_ERROR", "サーバー内部でエラーが発生しました"));
};
