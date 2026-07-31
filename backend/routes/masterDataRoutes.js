import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  getAllMasterData,
  getMasterDataByType,
} from "../controllers/masterDataController.js";

/**
 * /api/master-data のルート定義。
 *
 * 記録フォームからしか使わないため認証を必須にしている。
 * 公開しても害のない参照データだが、認証済みの画面でしか
 * 必要にならないので、入口を絞っておく。
 */
const router = express.Router();

router.use(authenticate);

// フォーム初期表示用に全種類まとめて
router.get("/", getAllMasterData);

// 種類別（検索・件数制限つき）
router.get("/:type", getMasterDataByType);

export default router;
