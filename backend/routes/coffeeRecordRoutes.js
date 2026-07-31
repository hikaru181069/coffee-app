import express from "express";
import { authenticate } from "../middleware/authenticate.js";
import {
  listCoffeeRecords,
  createCoffeeRecord,
  getCoffeeRecord,
  updateCoffeeRecord,
  deleteCoffeeRecord,
} from "../controllers/coffeeRecordController.js";

/**
 * /api/coffee-records のルート定義。
 *
 * ここはURLとmiddleware・controllerの接続だけを担当する。
 *
 * router.use(authenticate) をルートごとではなく先頭に1回書いている。
 * 記録は例外なく本人だけが触れるものなので、
 * ルートを追加したときに認証を付け忘れる事故を防げる。
 */
const router = express.Router();

router.use(authenticate);

router.route("/").get(listCoffeeRecords).post(createCoffeeRecord);

router
  .route("/:recordId")
  .get(getCoffeeRecord)
  .patch(updateCoffeeRecord)
  .delete(deleteCoffeeRecord);

export default router;
