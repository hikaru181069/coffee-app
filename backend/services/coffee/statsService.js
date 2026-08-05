import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildStats } from "../../core/stats/statsBuilder.js";

/**
 * 統計のユースケース。
 *
 * graphService.js / insightService.js / searchService.js と同じ構成:
 * core/stats/statsBuilder.js（純粋関数）と repository（DB問い合わせ）を
 * つなぐだけ。フィルターは持たない（記録全体を通した統計のため）。
 */
export const buildStatsForUser = async (userId) => {
  const records = await coffeeRecordRepository.findAllForUser(userId);
  const serialized = serializeCoffeeRecords(records);

  return buildStats(serialized);
};
