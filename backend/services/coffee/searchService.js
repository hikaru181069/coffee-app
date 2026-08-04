import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildSearchResults } from "../../core/search/searchBuilder.js";

/**
 * 横断検索のユースケース。
 *
 * graphService.js / insightService.js と同じ構成: core/search/searchBuilder.js
 * （純粋関数）と repository（DB問い合わせ）をつなぐだけ。
 */
export const searchForUser = async (userId, query) => {
  const records = await coffeeRecordRepository.findAllForUser(userId);
  const serialized = serializeCoffeeRecords(records);

  return buildSearchResults(serialized, query);
};
