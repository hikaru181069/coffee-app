import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import { getNodeQuality, getAllQuality } from "../controllers/originQualityController.js";

/**
 * /api/origin-quality のルート定義。
 *
 * データ自体はCQI参照データ（静的）とOriginマスターだけから決まり、
 * ログインユーザーの記録には依存しないが、他のAPIと同じく認証は必須にする
 * （discoverRoutes.js / graphRoutes.js と同じ方針。未認証での外部アクセスを
 * 許す理由が無いため）。
 */
const router = express.Router();

router.use(authenticate);

router.get("/", getAllQuality);
router.get("/nodes/:nodeId", getNodeQuality);

export default router;
