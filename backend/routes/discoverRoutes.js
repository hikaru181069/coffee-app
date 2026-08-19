import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getNodeDiscovery, getTeaser } from "../controllers/discoverController.js";

/**
 * /api/discover のルート定義。
 *
 * 自分の記録だけを対象にするため認証を必須にしている
 * （graphRoutes.js / insightRoutes.js と同じ方針）。
 */
const router = express.Router();

router.use(authenticate);

router.get("/", getTeaser);
router.get("/nodes/:nodeId", getNodeDiscovery);

export default router;
