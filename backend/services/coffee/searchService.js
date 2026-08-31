import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildSearchResults } from "../../core/search/searchBuilder.js";

/**
 * 横断検索のユースケース。
 *
 * graphService.js / insightService.js と同じ構成: core/search/searchBuilder.js
 * （純粋関数）と repository（DB問い合わせ）をつなぐだけ。
 *
 * 2026-08、検索ボックスとフィルターの併用に対応した。recordFilter
 * （recordFilterValidator.js。RecordsPage.jsxのフィルターと同じ形）を
 * 渡すと、その範囲内の記録だけを対象に検索する。渡さなければ従来通り
 * 自分の記録すべてが対象になる（getRelatedRecordsと同じ考え方）。
 */
export const searchForUser = async (userId, query, recordFilter = {}) => {
  const records = await coffeeRecordRepository.findAllForUser(userId, recordFilter);
  const serialized = serializeCoffeeRecords(records);

  return buildSearchResults(serialized, query);
};
