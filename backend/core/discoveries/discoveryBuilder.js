import { collectAttributeRefs } from "../graph/graphBuilder.js";

/**
 * 記録の保存直後に見せる「発見」を組み立てる純粋関数。
 *
 * docs/features.mdの他の機能（Insight/Discover/SimilarRecords）と同じく
 * DB・HTTPに依存しない。AI/NLPは使わず、既存の記録群に対する登録回数の
 * 閾値判定だけで完結する（docs/product.md「MVP Before Intelligence」）。
 *
 * 「新しく保存された1件によって、どの属性が初めて登場したか／区切りの
 * 良い件数に到達したか」を検出する。保存前後で2回グラフを計算し差分を
 * 取る方式ではなく、保存前の記録群から属性ごとの登録回数を集計し、
 * 新しい記録が持つ属性についてその回数へ+1した値で判定するだけで済む
 * （数学的に同値だが、保存後の全件再取得が不要な分軽い）。
 */

const THRESHOLDS = {
  // 区切りの良い件数のみをマイルストーンとする。2は「初めての再会」、
  // 3/5/10は達成感のある節目（insightBuilder.jsの各種閾値と感覚を揃えている）
  milestoneCounts: [2, 3, 5, 10],
};

// keywordはnoteKeywordExtractor.jsによる部分文字列一致の自動検出であり、
// ユーザーが選んだ値ではない（既知の誤検出リスクがnoteKeywordExtractor.js
// にコメントされている）。誤検出を「発見」として祝うと信頼を損なうため、
// 発見検出の対象からは意図的に外す（ATTRIBUTE_NODE_TYPESそのものは絞らない）
const DISCOVERY_NODE_TYPES = ["origin", "farm", "variety", "process", "roastLevel", "flavor", "cafe"];

// 1回の保存で祝う発見が多すぎると「静かな道具」というトーン
// （docs/design.md）を崩すため、最大3件に絞る
const MAX_DISCOVERIES = 3;

const countRefsByRecordId = (records, flavorsByNormalizedName) => {
  const counts = new Map();
  for (const record of records) {
    for (const ref of collectAttributeRefs(record, flavorsByNormalizedName)) {
      counts.set(ref.id, (counts.get(ref.id) ?? 0) + 1);
    }
  }
  return counts;
};

/**
 * @param {Array} existingRecords services/coffee/coffeeRecordSerializer.js が
 *   返す形と同じ配列（新しく保存された記録を含まない、保存前の自分の記録すべて）
 * @param {object} newRecord 保存された記録（同じくserializeCoffeeRecordの形）
 * @param {Map<string, {id: string, name: string}>} [flavorsByNormalizedName]
 *   graphBuilder.buildGraphと同じFlavorマスター索引
 * @returns {{ discoveries: Array<{ type: "firstAppearance"|"milestone",
 *   nodeType: string, nodeId: string, label: string, recordCount: number }> }}
 */
export const buildDiscoveries = (existingRecords, newRecord, flavorsByNormalizedName) => {
  const beforeCounts = countRefsByRecordId(existingRecords, flavorsByNormalizedName);
  const newRefs = collectAttributeRefs(newRecord, flavorsByNormalizedName).filter((ref) =>
    DISCOVERY_NODE_TYPES.includes(ref.type),
  );

  const discoveries = [];
  for (const ref of newRefs) {
    const before = beforeCounts.get(ref.id) ?? 0;
    const after = before + 1;

    if (before === 0) {
      discoveries.push({
        type: "firstAppearance",
        nodeType: ref.type,
        nodeId: ref.id,
        label: ref.label,
        recordCount: after,
      });
    } else if (THRESHOLDS.milestoneCounts.includes(after)) {
      discoveries.push({
        type: "milestone",
        nodeType: ref.type,
        nodeId: ref.id,
        label: ref.label,
        recordCount: after,
      });
    }
  }

  // firstAppearanceを優先し、milestone同士はrecordCountが大きい
  // （達成感が大きい）ものを上位にする
  discoveries.sort((a, b) => {
    if (a.type !== b.type) return a.type === "firstAppearance" ? -1 : 1;
    return b.recordCount - a.recordCount;
  });

  return { discoveries: discoveries.slice(0, MAX_DISCOVERIES) };
};
