import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { search } from "../controllers/searchController.js";

/**
 * /api/search のルート定義。
 *
 * 自分の記録だけを対象にするため認証を必須にしている
 * （graphRoutes.js / insightRoutes.js と同じ方針）。
 */
const router = express.Router();

router.use(authenticate);

router.get("/", search);

export default router;
