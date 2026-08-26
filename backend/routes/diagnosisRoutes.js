import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getDiagnosis } from "../controllers/diagnosisController.js";

/**
 * /api/diagnosis のルート定義。
 *
 * 自分の記録だけを対象にするため認証を必須にしている
 * （insightRoutes.jsと同じ方針）。
 */
const router = express.Router();

router.use(authenticate);

router.get("/", getDiagnosis);

export default router;
