import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import * as masterDataRepository from "../../repositories/masterDataRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildArchetype } from "../../core/diagnosis/diagnosisBuilder.js";
import { buildInsightsForUser } from "./insightService.js";
import { buildStatsForUser } from "./statsService.js";

/**
 * コーヒー診断のユースケース。
 *
 * 新しい発見ロジックを増やすのではなく、既存の3つの機能
 * （archetype判定・Insight・Stats）を1つのレスポンスへ束ねる。
 * insightService.js / statsService.js が既にユーザー単位の集計を
 * 提供しているため、ここではそれらをそのまま呼び出して合成するだけに
 * とどめ、diagnosisBuilder.jsにはarchetype判定だけを持たせる
 * （discoverBuilder.jsが他のcore/*を意図的にimportしない前例に倣う）。
 */

/**
 * RoastLevelの_id文字列 → order(1〜5)の索引を作る。
 *
 * RoastLevelはnormalizedNameを持たない（models/RoastLevel.js。固定5値の
 * 順序つきマスターで、名前の表記ゆれ対策が不要なため）。そのため
 * graphService.jsのloadFlavorsByNormalizedNameと違い、_idをキーにする。
 */
const loadRoastOrderById = async () => {
  const roastLevels = await masterDataRepository.findMany("roastLevels");
  return new Map(roastLevels.map((roastLevel) => [String(roastLevel._id), roastLevel.order]));
};

/** Flavorの_id文字列 → categoryの索引を作る */
const loadFlavorCategoryById = async () => {
  const flavors = await masterDataRepository.findMany("flavors");
  return new Map(flavors.map((flavor) => [String(flavor._id), flavor.category]));
};

/**
 * 自分の記録から診断結果を組み立てる（GET /api/diagnosis）。
 *
 * findAllForUserがここ・insightService内・statsService内で計3回
 * 走る点は許容する。既存のservice間でDB取得を共有する前例が無く、
 * 無理に共有すると個々のserviceの独立性を崩すため。
 */
export const buildDiagnosisForUser = async (userId) => {
  const [records, roastOrderById, flavorCategoryById, insightsResult, stats] = await Promise.all([
    coffeeRecordRepository.findAllForUser(userId),
    loadRoastOrderById(),
    loadFlavorCategoryById(),
    buildInsightsForUser(userId),
    buildStatsForUser(userId),
  ]);
  const serialized = serializeCoffeeRecords(records);
  const { archetype } = buildArchetype(serialized, roastOrderById, flavorCategoryById);

  return { archetype, insights: insightsResult.insights, stats };
};
