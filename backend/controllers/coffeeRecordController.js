import * as coffeeRecordService from "../services/coffee/coffeeRecordService.js";
import {
  validateCreateCoffeeRecord,
  validateUpdateCoffeeRecord,
  pickCoffeeRecordFields,
} from "../validators/coffeeRecordValidator.js";
import { validateCoffeeRecordListQuery } from "../validators/coffeeRecordQueryValidator.js";
import { isObjectIdString } from "../utils/objectId.js";
import { validationError } from "../utils/AppError.js";

/**
 * CoffeeRecord の controller。
 *
 * ここでやること:
 *   1. req から値を取り出す
 *   2. 入力を検証する
 *   3. service を呼ぶ
 *   4. ステータスコードと共に response を返す
 *
 * ここでやらないこと:
 *   - Mongooseのクエリを書く（repository の担当）
 *   - 業務上の判断（service の担当）
 *   - try/catch でのエラー処理
 *     Express 5 は async ハンドラの reject を自動でエラーミドルウェアへ
 *     渡すので、投げっぱなしでよい。形式は errorHandler が統一する。
 *
 * userId は必ず req.user._id から取る。req.body.userId は見ない
 * （validator の pickCoffeeRecordFields が本文の userId を捨てている）。
 */

/**
 * URLパラメータの :recordId を検証する。
 *
 * ここで弾かないと "abc" のような値が Mongoose まで届いて
 * CastError になる。errorHandler でも拾っているが、
 * 意味のあるメッセージを返せるようこちらで先に確認する。
 */
const requireValidRecordId = (recordId) => {
  if (!isObjectIdString(recordId)) {
    throw validationError([
      { field: "recordId", message: "記録IDの形式が正しくありません" },
    ]);
  }
};

/** GET /api/coffee-records */
export const listCoffeeRecords = async (req, res) => {
  const { valid, details, query } = validateCoffeeRecordListQuery(req.query);
  if (!valid) throw validationError(details);

  const result = await coffeeRecordService.listRecords(req.user._id, query);

  res.status(200).json(result);
};

/** POST /api/coffee-records */
export const createCoffeeRecord = async (req, res) => {
  const { valid, details } = validateCreateCoffeeRecord(req.body);
  if (!valid) throw validationError(details);

  const fields = pickCoffeeRecordFields(req.body);
  const record = await coffeeRecordService.createRecord(req.user._id, fields);

  res.status(201).json({ data: record });
};

/** GET /api/coffee-records/:recordId */
export const getCoffeeRecord = async (req, res) => {
  requireValidRecordId(req.params.recordId);

  const record = await coffeeRecordService.getRecord(req.user._id, req.params.recordId);

  res.status(200).json({ data: record });
};

/** PATCH /api/coffee-records/:recordId */
export const updateCoffeeRecord = async (req, res) => {
  requireValidRecordId(req.params.recordId);

  const { valid, details } = validateUpdateCoffeeRecord(req.body);
  if (!valid) throw validationError(details);

  const fields = pickCoffeeRecordFields(req.body);
  const record = await coffeeRecordService.updateRecord(
    req.user._id,
    req.params.recordId,
    fields,
  );

  res.status(200).json({ data: record });
};

/** DELETE /api/coffee-records/:recordId */
export const deleteCoffeeRecord = async (req, res) => {
  requireValidRecordId(req.params.recordId);

  await coffeeRecordService.deleteRecord(req.user._id, req.params.recordId);

  // 204 は本文を持たないので send() で終える（docs/api.md の Status Codes）
  res.status(204).send();
};
