/**
 * 知識グラフの隣接関係（同じ精製方法）を使って、まだ試していない産地を
 * 提案する純粋関数。
 *
 * docs/features.md「Discover」参照。DB・HTTPに依存しない（graphBuilder.js /
 * insightBuilder.js と同じ方針）。CoffeeRecord（自分の記録）と、
 * 静的なCQI（Coffee Quality Institute）参照データの両方を受け取る。
 *
 * CQIデータは「Country of Origin × Processing Method」の品質スコア集計
 * だけを使う（docs/product-principles.md「Personal Knowledge Over Global
 * Completeness」に沿い、アプリ側に対応する概念が無い項目までは広げない）。
 *
 * insightBuilder.jsと同じ理由（統計的に意味の無い偶然を断定しない）で
 * 閾値を設ける。同率首位のときに断定しない、というパターンも合わせている。
 *
 * Insight機能（core/insights/insightBuilder.js）とは完全に独立したモジュール。
 * docs/insights.mdの「Source of Truth: MongoDBのCoffeeRecordとマスター
 * データを正とする」と矛盾させないため、既存6種別・PRIORITY配列には
 * 一切混ぜない。
 */

const THRESHOLDS = {
  // 「よく選んでいる」と言うための、その産地の最低記録数
  minRecordsForOrigin: 2,
};

const MAX_SUGGESTIONS = 2;

/**
 * 指定した産地の記録の中で、最も多く登場する精製方法を見つける。
 * 同率首位のときは「近い精製方法」を1つに決められないため断定しない。
 */
const findDominantProcess = (originRecords) => {
  const counts = new Map();
  for (const record of originRecords) {
    if (!record.process) continue;
    const entry = counts.get(record.process.id) ?? { label: record.process.name, count: 0 };
    entry.count += 1;
    counts.set(record.process.id, entry);
  }

  const sorted = [...counts.values()].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  if (!top) return null;
  if (sorted[1]?.count === top.count) return null;

  return top;
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
  const originRecords = records.filter((record) => record.origin?.name === originName);
  if (originRecords.length < THRESHOLDS.minRecordsForOrigin) {
    return { suggestions: [] };
  }

  const dominantProcess = findDominantProcess(originRecords);
  if (!dominantProcess) {
    return { suggestions: [] };
  }

  // 産地・精製方法を問わず、これまでに一度でも記録した産地は「未経験」ではない
  const triedOriginNames = new Set(records.map((record) => record.origin?.name).filter(Boolean));

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
    if (!record.origin || originIdByName.has(record.origin.name)) continue;
    originIdByName.set(record.origin.name, record.origin.id);
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
