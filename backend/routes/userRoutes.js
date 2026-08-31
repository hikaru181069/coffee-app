import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { createBruteForceLimiter } from "../middleware/rateLimiter.js";
import { changePassword, deleteAccount, getMe, updateProfile } from "../controllers/userController.js";

const router = express.Router();

router.use(authenticate);

// 2026-08、authRoutes.js（register/login）と同じ総当たり対策。
// パスワード変更は認証済みだが、currentPasswordの総当たりに使われうるため
// login/registerと同じ設定のlimiterを別インスタンスとして適用する
// （同じインスタンスを共有すると、login試行の失敗回数とパスワード変更の
// 試行回数が同じ枠を食い合ってしまうため分ける）
const passwordChangeRateLimiter = createBruteForceLimiter("Too many attempts. Please try again later.");

router.get("/me", getMe);
router.patch("/me", updateProfile);
router.patch("/me/password", passwordChangeRateLimiter, changePassword);
router.delete("/me", deleteAccount);

export default router;
