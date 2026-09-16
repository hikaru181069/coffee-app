import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { previewDiscovery } from "../controllers/discoveryPreviewController.js";

/**
 * /api/discoveries のルート定義。
 *
 * 自分の記録だけを対象にするため認証を必須にしている
 * （discoverRoutes.js / graphRoutes.js と同じ方針）。
 */
const router = express.Router();

router.use(authenticate);

router.post("/preview", previewDiscovery);

export default router;
