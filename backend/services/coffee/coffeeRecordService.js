import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { verifyReferencesExist } from "./masterDataService.js";
import { serializeCoffeeRecord, serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { notFoundError, validationError } from "../../utils/AppError.js";

/**
 * CoffeeRecord のユースケース。
 *
 * この層が持つもの:
 *   - 「誰の記録か」の決定（userId は必ず引数で受け取る）
 *   - マスターデータ参照の実在確認
 *   - ページネーションの計算
 *   - 見つからない場合に何を返すか
 *
 * この層が持たないもの:
 *   - Mongooseのクエリ（repository の担当）
 *   - HTTPのステータスコードやreq/res（controller と errorHandler の担当）
 *     ただし「見つからない」等は AppError として投げる。どの状況が
 *     404 なのかを判断できるのはこの層だけなので、判断はここでし、
 *     HTTPへの変換は errorHandler がまとめて行う。
 */

/**
 * 記録を作成する。
 *
 * @param {string} userId 認証情報から渡される。リクエスト本文からは受け取らない
 * @param {object} fields validator を通した書き込み可能な項目のみ
 */
export const createRecord = async (userId, fields) => {
  // 形式は validator が確認済み。ここでは「実在するか」だけを見る
  const references = await verifyReferencesExist(fields);
  if (!references.valid) {
    throw validationError(references.details);
  }

  const created = await coffeeRecordRepository.create({ ...fields, userId });

  // 作成直後は参照がIDのままなので、名前を解決してから返す。
  // フロントが作成後にもう一度詳細を取りに行かなくて済む
  const populated = await coffeeRecordRepository.findOneByIdForUser(
    created._id,
    userId,
    { populate: true },
  );

  return serializeCoffeeRecord(populated);
};

/**
 * 記録を1件取得する。
 *
 * 他ユーザーの記録は「存在しない」として 404 を返す。
 * 403（権限が無い）にすると、そのIDの記録が存在することを
 * 教えてしまうため（docs/architecture.md の Security）。
 */
export const getRecord = async (userId, recordId) => {
  const record = await coffeeRecordRepository.findOneByIdForUser(recordId, userId, {
    populate: true,
  });

  if (!record) {
    throw notFoundError("記録が見つかりません");
  }

  return serializeCoffeeRecord(record);
};

/**
 * 自分の記録を一覧取得する。
 *
 * @param {object} query validator が組み立てた { page, limit, sort, filter }
 */
export const listRecords = async (userId, { page, limit, sort, filter }) => {
  const skip = (page - 1) * limit;

  // 件数と本体は互いに依存しないので同時に問い合わせる
  const [records, total] = await Promise.all([
    coffeeRecordRepository.findManyForUser(userId, {
      filter,
      sort,
      skip,
      limit,
      populate: true,
    }),
    coffeeRecordRepository.countForUser(userId, filter),
  ]);

  return {
    data: serializeCoffeeRecords(records),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * 記録を部分更新する。
 *
 * repository のクエリが userId を条件に含むため、
 * 他ユーザーの記録は更新されず null が返る → 404 になる。
 */
export const updateRecord = async (userId, recordId, fields) => {
  const references = await verifyReferencesExist(fields);
  if (!references.valid) {
    throw validationError(references.details);
  }

  const updated = await coffeeRecordRepository.updateOneForUser(recordId, userId, fields);

  if (!updated) {
    throw notFoundError("記録が見つかりません");
  }

  const populated = await coffeeRecordRepository.findOneByIdForUser(recordId, userId, {
    populate: true,
  });

  return serializeCoffeeRecord(populated);
};

/** 記録を削除する。他ユーザーの記録は削除されず 404 になる */
export const deleteRecord = async (userId, recordId) => {
  const deleted = await coffeeRecordRepository.deleteOneForUser(recordId, userId);

  if (!deleted) {
    throw notFoundError("記録が見つかりません");
  }
};
