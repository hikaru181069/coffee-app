import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getInsights } from "../controllers/insightController.js";

/**
 * /api/insights のルート定義。
 *
 * 自分の記録だけを対象にするため認証を必須にしている
 * （graphRoutes.js と同じ方針）。
 */
const router = express.Router();

router.use(authenticate);

router.get("/", getInsights);

export default router;
