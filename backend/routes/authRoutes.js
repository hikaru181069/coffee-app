import express from "express";
import rateLimit from "express-rate-limit";
import { registerUser, loginUser } from "../controllers/authController.js";

const router = express.Router();

/**
 * パスワードの総当たり攻撃対策。
 *
 * 同一IPからの試行を15分あたり10回までに制限する。register/loginを
 * 同じlimiterで共有しているのは、どちらもメールアドレス宛の総当たりに
 * 使われうるため。数値は目安であり、実際に運用する場合は
 * ログイン失敗率などを見て調整する想定。
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts. Please try again later." },
  // テストは同一IP（supertestのローカル呼び出し）から大量にリクエストするため、
  // Jestが自動設定するNODE_ENV=testのときだけ制限を無効化する
  skip: () => process.env.NODE_ENV === "test",
});

router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);

export default router;