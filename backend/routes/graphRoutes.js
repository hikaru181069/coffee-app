import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getGraph, getNodeRecords } from "../controllers/graphController.js";

/**
 * /api/graph のルート定義。
 *
 * どちらも自分の記録だけを対象にするため、認証を必須にしている
 * （coffeeRecordRoutes.js と同じ方針）。
 */
const router = express.Router();

router.use(authenticate);

router.get("/", getGraph);
router.get("/nodes/:nodeId/records", getNodeRecords);

export default router;
