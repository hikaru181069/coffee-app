/**
 * 知識グラフの隣接関係（同じ精製方法）を使って、まだ試していない産地を
 * 提案する純粋関数。
 *
 * docs/features.md「Discover」参照。DB・HTTPに依存しない（graphBuilder.js /
 * insightBuilder.js と同じ方針）。CoffeeRecord（自分の記録）と、
 * 静的なCQI（Coffee Quality Institute）参照データの両方を受け取る。
 *
 * CQIデータは「Country of Origin × Processing Method」の品質スコア集計
 * だけを使う（docs/product.md「Personal Knowledge Over Global
 * Completeness」に沿い、アプリ側に対応する概念が無い項目までは広げない）。
 *
 * insightBuilder.jsと同じ理由（統計的に意味の無い偶然を断定しない）で
 * 閾値を設ける。同率首位のときに断定しない、というパターンも合わせている。
 *
 * Insight機能（core/insights/insightBuilder.js）とは完全に独立したモジュール。
 * docs/features.md「Insights」の「Source of Truth: MongoDBのCoffeeRecordとマスター
 * データを正とする」と矛盾させないため、既存6種別・PRIORITY配列には
 * 一切混ぜない。
 */

import { pickTop } from "../shared/aggregationHelpers.js";

const THRESHOLDS = {
  // 「よく選んでいる」と言うための、その産地の最低記録数
  minRecordsForOrigin: 2,
};

const MAX_SUGGESTIONS = 2;

/**
 * 指定した産地について、記録ごとに「その産地とペアになっている精製方法」
 * （同じcomponent内のprocess）を集め、最も多く登場する精製方法を見つける。
 * 同率首位のときは「近い精製方法」を1つに決められないため断定しない。
 *
 * record全体のprocess一覧ではなく、その産地を持つcomponent単位で見ることで、
 * ブレンド記録で別の産地の精製方法と混同しない（例: Ethiopia×Natural +
 * Kenya×Washedのブレンドで、Kenyaの提案にNaturalを紛れ込ませない）。
 * 同じ記録の中に同じ産地×精製方法のcomponentが複数あっても、その記録は
 * 1回だけ数える（他の集計と同じ「記録を各値へ1回ずつカウントする」考え方）。
 */
const findDominantProcess = (records, originName) => {
  const counts = new Map();

  for (const record of records) {
    const processesForOrigin = new Map();
    for (const component of record.components ?? []) {
      if (component.origin?.name !== originName || !component.process) continue;
      processesForOrigin.set(component.process.id, component.process);
    }

    for (const process of processesForOrigin.values()) {
      const entry = counts.get(process.id) ?? { label: process.name, count: 0 };
      entry.count += 1;
      counts.set(process.id, entry);
    }
  }

  return pickTop([...counts.values()]);
};

/**
 * 指定した産地について、隣接する（同じ精製方法の）まだ試していない産地を
 * CQIデータから提案する。
 *
 * @param {Array} records serializeCoffeeRecordsが返す形と同じ配列（自分の記録すべて）
 * @param {{ entries: Array<{ originName: string, processName: string, avgQualityScore: number, sampleSize: number }> }} cqiDataset
 * @param {string} originName 提案の起点にする産地名（Entity Detailで見ている産地）
 * @returns {{ suggestions: Array }}
 */
export const buildOriginDiscovery = (records, cqiDataset, originName) => {
  // ブレンド記録（componentsが複数）は、含まれる産地それぞれの集計へ1件と
  // して数える（varietyIds/flavorIdsの集計と同じ考え方。docs/domain-model.md参照）
  const originRecords = records.filter((record) =>
    (record.components ?? []).some((component) => component.origin?.name === originName),
  );
  if (originRecords.length < THRESHOLDS.minRecordsForOrigin) {
    return { suggestions: [] };
  }

  const dominantProcess = findDominantProcess(originRecords, originName);
  if (!dominantProcess) {
    return { suggestions: [] };
  }

  // 産地・精製方法を問わず、これまでに一度でも記録した産地は「未経験」ではない
  const triedOriginNames = new Set(
    records.flatMap((record) => (record.components ?? []).map((component) => component.origin?.name)).filter(Boolean),
  );

  const suggestions = (cqiDataset.entries ?? [])
    .filter((entry) => entry.processName === dominantProcess.label)
    .filter((entry) => entry.originName !== originName && !triedOriginNames.has(entry.originName))
    .sort((a, b) => b.avgQualityScore - a.avgQualityScore)
    .slice(0, MAX_SUGGESTIONS)
    .map((entry) => ({
      type: "similarProcessOrigin",
      basedOn: {
        originLabel: originName,
        processLabel: dominantProcess.label,
        count: dominantProcess.count,
      },
      suggestedOrigin: {
        label: entry.originName,
        avgQualityScore: entry.avgQualityScore,
      },
    }));

  return { suggestions };
};

/**
 * Home画面用の、全産地を横断した提案1件（最も品質スコアが高いもの）。
 *
 * docs/features.md「Discover」の「Home Teaser」参照。Entity Detailページ（特定の産地）
 * ではなく、Home画面から「Discover機能があること」への導線を作るための
 * 集計。ユーザーが記録した産地をすべて走査してbuildOriginDiscoveryを
 * 呼び、候補が1つも無ければteaser: nullを返す（InsightBannerと同じ
 * 「条件を満たすものが無ければ何も出さない」方針）。
 *
 * @param {Array} records serializeCoffeeRecordsが返す形と同じ配列（自分の記録すべて）
 * @param {object} cqiDataset buildOriginDiscoveryと同じCQI参照データ
 * @returns {{ teaser: null | { nodeId: string, type: string, basedOn: object, suggestedOrigin: object } }}
 */
export const buildDiscoverTeaser = (records, cqiDataset) => {
  const originIdByName = new Map();
  for (const record of records) {
    for (const component of record.components ?? []) {
      if (!component.origin || originIdByName.has(component.origin.name)) continue;
      originIdByName.set(component.origin.name, component.origin.id);
    }
  }

  const candidates = [];
  for (const [originName, originId] of originIdByName) {
    const { suggestions } = buildOriginDiscovery(records, cqiDataset, originName);
    for (const suggestion of suggestions) {
      candidates.push({ ...suggestion, originId });
    }
  }

  if (candidates.length === 0) return { teaser: null };

  candidates.sort((a, b) => b.suggestedOrigin.avgQualityScore - a.suggestedOrigin.avgQualityScore);
  const { originId, type, basedOn, suggestedOrigin } = candidates[0];

  return { teaser: { nodeId: `origin:${originId}`, type, basedOn, suggestedOrigin } };
};
