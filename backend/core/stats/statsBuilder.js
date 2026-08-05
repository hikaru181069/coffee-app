import { normalizeName } from "../../utils/normalizeName.js";
import { originNodeId, varietyNodeId, processNodeId, flavorNodeId, cafeNodeId } from "../graph/nodeId.js";

/**
 * 記録全体を通した統計を組み立てる純粋関数。
 *
 * docs/stats.md参照。core/insights/insightBuilder.jsと同じ集計パターン
 * （グループ化→件数）を使うが、Insightが「1つの傾向を一文で見せる」のに
 * 対し、こちらは「記録全体を通した数字を一望できる」ことが目的で
 * 別モジュールにしている。
 *
 * ランキング項目のidは、graphBuilder.jsが使うstable ID
 * （docs/knowledge-graph.mdの「Stable IDs」）と同じ形式にしている。
 * これにより、Stats画面のランキングからエンティティ詳細ページ
 * （docs/entity-detail.md、/entities/:nodeId）へそのままリンクできる。
 */

const TOP_N = 5;

const average = (numbers) => (numbers.length === 0 ? null : numbers.reduce((sum, n) => sum + n, 0) / numbers.length);
const roundTo1 = (value) => (value == null ? null : Math.round(value * 10) / 10);

/** 単数の参照（origin/process）でグループ化し、stable IDをキーにする */
const groupBySingleRef = (records, getRef, toNodeId) => {
  const groups = new Map();
  for (const record of records) {
    const ref = getRef(record);
    if (!ref) continue;
    const nodeId = toNodeId(ref.id);
    if (!groups.has(nodeId)) groups.set(nodeId, { label: ref.name, count: 0 });
    groups.get(nodeId).count += 1;
  }
  return groups;
};

/** 複数の参照（variety/flavor）でグループ化し、stable IDをキーにする */
const groupByMultiRef = (records, getRefs, toNodeId) => {
  const groups = new Map();
  for (const record of records) {
    for (const ref of getRefs(record) ?? []) {
      const nodeId = toNodeId(ref.id);
      if (!groups.has(nodeId)) groups.set(nodeId, { label: ref.name, count: 0 });
      groups.get(nodeId).count += 1;
    }
  }
  return groups;
};

/** cafeNameは別コレクションを持たない自由記述のため、正規化した名前をIDにする（farmと同じ扱い） */
const groupByCafe = (records) => {
  const groups = new Map();
  for (const record of records) {
    if (!record.cafeName) continue;
    const nodeId = cafeNodeId(normalizeName(record.cafeName));
    if (!groups.has(nodeId)) groups.set(nodeId, { label: record.cafeName, count: 0 });
    groups.get(nodeId).count += 1;
  }
  return groups;
};

const topN = (groups, limit) =>
  [...groups.entries()]
    .map(([id, { label, count }]) => ({ id, label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);

const ratingsOf = (records) => records.map((record) => record.rating).filter((rating) => rating != null);

const buildRatingDistribution = (records) => {
  const counts = new Map([1, 2, 3, 4, 5].map((rating) => [rating, 0]));
  for (const record of records) {
    if (record.rating == null) continue;
    counts.set(record.rating, (counts.get(record.rating) ?? 0) + 1);
  }
  return [...counts.entries()].map(([rating, count]) => ({ rating, count }));
};

const buildHomeVsCafe = (records) => {
  const summarize = (filtered) => ({ count: filtered.length, avgRating: roundTo1(average(ratingsOf(filtered))) });
  return {
    home: summarize(records.filter((record) => record.recordType === "home")),
    cafe: summarize(records.filter((record) => record.recordType === "cafe")),
  };
};

/** consumedAtの年月ごとに件数を集計し、古い順に並べる */
const buildMonthlyTrend = (records) => {
  const counts = new Map();
  for (const record of records) {
    if (!record.consumedAt) continue;
    const date = new Date(record.consumedAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    counts.set(month, (counts.get(month) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));
};

const findFirstRecordedAt = (records) =>
  records.reduce((earliest, record) => {
    if (!record.consumedAt) return earliest;
    return !earliest || new Date(record.consumedAt) < new Date(earliest) ? record.consumedAt : earliest;
  }, null);

/**
 * 記録の配列から統計をまとめて返す。
 *
 * @param {Array} records services/coffee/coffeeRecordSerializer.js が返す形と同じ配列
 * @returns {object}
 */
export const buildStats = (records) => {
  const originGroups = groupBySingleRef(records, (record) => record.origin, originNodeId);
  const varietyGroups = groupByMultiRef(records, (record) => record.varieties, varietyNodeId);
  const processGroups = groupBySingleRef(records, (record) => record.process, processNodeId);
  const flavorGroups = groupByMultiRef(records, (record) => record.flavors, flavorNodeId);
  const cafeGroups = groupByCafe(records);

  return {
    overview: {
      recordCount: records.length,
      originCount: originGroups.size,
      varietyCount: varietyGroups.size,
      flavorCount: flavorGroups.size,
      avgRating: roundTo1(average(ratingsOf(records))),
      firstRecordedAt: findFirstRecordedAt(records),
    },
    topOrigins: topN(originGroups, TOP_N),
    topVarieties: topN(varietyGroups, TOP_N),
    topProcesses: topN(processGroups, TOP_N),
    topFlavors: topN(flavorGroups, TOP_N),
    topCafes: topN(cafeGroups, TOP_N),
    ratingDistribution: buildRatingDistribution(records),
    homeVsCafe: buildHomeVsCafe(records),
    monthlyTrend: buildMonthlyTrend(records),
  };
};
