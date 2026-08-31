import rateLimit from "express-rate-limit";

/**
 * ブルートフォース対策の共通ファクトリ。
 *
 * authRoutes.js（register/login）とuserRoutes.js（パスワード変更）の
 * 両方で同じ設定（15分あたり10回まで）のレート制限が必要になったため、
 * 設定の重複を避けてここへ集約した。message文言だけ呼び出し側で変えられる。
 */
export const createBruteForceLimiter = (message) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message },
    // テストは同一IP（supertestのローカル呼び出し）から大量にリクエストするため、
    // Jestが自動設定するNODE_ENV=testのときだけ制限を無効化する
    skip: () => process.env.NODE_ENV === "test",
  });
