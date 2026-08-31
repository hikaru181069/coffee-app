import express from "express";
import { createBruteForceLimiter } from "../middleware/rateLimiter.js";
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
const authRateLimiter = createBruteForceLimiter("Too many attempts. Please try again later.");

router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);

export default router;