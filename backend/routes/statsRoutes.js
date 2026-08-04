import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getStats } from "../controllers/statsController.js";

/**
 * /api/stats のルート定義。
 *
 * 自分の記録だけを対象にするため認証を必須にしている
 * （graphRoutes.js / insightRoutes.js / searchRoutes.js と同じ方針）。
 */
const router = express.Router();

router.use(authenticate);

router.get("/", getStats);

export default router;
