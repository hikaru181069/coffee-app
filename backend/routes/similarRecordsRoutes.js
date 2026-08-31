import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getSimilarRecords } from "../controllers/similarRecordsController.js";

/**
 * /api/similar-records のルート定義。
 *
 * 自分の記録だけを対象にするため認証を必須にしている
 * （discoverRoutes.js / graphRoutes.js と同じ方針）。
 */
const router = express.Router();

router.use(authenticate);

router.get("/:recordId", getSimilarRecords);

export default router;
