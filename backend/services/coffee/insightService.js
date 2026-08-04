import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildInsights } from "../../core/insights/insightBuilder.js";

/**
 * Insightのユースケース。
 *
 * graphService.js と同じ構成: core/insights/insightBuilder.js（純粋関数）と
 * repository（DB問い合わせ）をつなぐだけ。フィルターは持たない
 * （「自分の記録全体からの傾向」を示す機能のため、絞り込み表示である
 * Graph画面とは異なりフィルターを持つ必要が無い）。
 */
export const buildInsightsForUser = async (userId) => {
  const records = await coffeeRecordRepository.findAllForUser(userId);
  const serialized = serializeCoffeeRecords(records);

  return buildInsights(serialized);
};
