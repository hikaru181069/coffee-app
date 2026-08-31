import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildSimilarRecords } from "../../core/similarRecords/similarRecordsBuilder.js";
import { excerptNotes } from "../../utils/textExcerpt.js";
import { notFoundError } from "../../utils/AppError.js";

/**
 * 「似た記録」のユースケース。
 *
 * discoverService.js / graphService.js と同じ構成: core/similarRecords/
 * similarRecordsBuilder.js（純粋関数）と repository（DB問い合わせ）をつなぐ。
 */

/**
 * 指定した記録1件について、似た記録の一覧を返す
 * （GET /similar-records/:recordId）。
 *
 * 自分の記録に無いrecordId（存在しない・他ユーザーの記録）は404にする
 * （docs/entity-detail.mdの404方針と同じ: 存在の有無を漏らさない）。
 */
export const getSimilarRecords = async (userId, recordId) => {
  const records = await coffeeRecordRepository.findAllForUser(userId);
  const serialized = serializeCoffeeRecords(records);

  const targetExists = serialized.some((record) => record.id === recordId);
  if (!targetExists) {
    throw notFoundError("指定された記録が見つかりません");
  }

  const { similarRecords } = buildSimilarRecords(serialized, recordId);

  return {
    similarRecords: similarRecords.map(({ record, sharedCount, sharedAttributes }) => ({
      id: record.id,
      title: record.title,
      consumedAt: record.consumedAt,
      rating: record.rating,
      notesExcerpt: excerptNotes(record.notes),
      sharedCount,
      sharedAttributes,
    })),
  };
};
