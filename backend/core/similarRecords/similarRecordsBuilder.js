import { buildGraph, findRecordIdsConnectedToNode } from "../graph/graphBuilder.js";

/**
 * 「似た記録」を組み立てる純粋関数。
 *
 * docs/features.md「Similar Records」参照。DB・HTTPに依存しない
 * （graphBuilder.js / discoverBuilder.js と同じ方針）。
 *
 * AI/NLPは使わない。指定した記録につながる属性ノード（産地・農園・品種・
 * 精製方法・焙煎度・フレーバー・カフェ・キーワード）を1つずつたどり、
 * 同じ属性ノードにつながる他の記録を`findRecordIdsConnectedToNode`
 * （graphBuilder.jsが既に持つグラフ照会関数）でそのまま数え上げるだけの
 * ルールベース集計。「知識グラフの共起関係」をそのまま使う、
 * このプロダクトの中心体験（docs/product.md「Connect」「Discover」）を
 * 一段深掘りする機能という位置付け。
 */

const THRESHOLDS = {
  // Insight/Discoverと同じ「偶然の一致を断定しない」ための閾値。
  // 1つの属性だけ一致（例: 同じ精製方法というだけ）では類似とは呼べないため
  minSharedAttributes: 2,
};

const MAX_SIMILAR_RECORDS = 5;

/**
 * @param {Array} records services/coffee/coffeeRecordSerializer.js が返す形と同じ配列（自分の記録すべて）
 * @param {string} targetRecordId 起点にする記録のID
 * @returns {{ similarRecords: Array<{ record: object, sharedCount: number, sharedAttributes: Array<{type: string, label: string}> }> }}
 *   sharedCountの多い順（同数ならrating降順）。starRecordId自体は含まない
 */
export const buildSimilarRecords = (records, targetRecordId) => {
  const graph = buildGraph(records);
  const targetNodeId = `record:${targetRecordId}`;
  const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));

  // 対象記録につながる属性ノードID（エッジは常にrecord→属性の向き）
  const targetAttributeIds = graph.edges
    .filter((edge) => edge.source === targetNodeId)
    .map((edge) => edge.target);

  const sharedCountByRecordId = new Map();
  const sharedAttributesByRecordId = new Map();

  for (const attributeId of targetAttributeIds) {
    const attributeNode = nodesById.get(attributeId);

    for (const recordId of findRecordIdsConnectedToNode(graph, attributeId)) {
      if (recordId === targetRecordId) continue;

      sharedCountByRecordId.set(recordId, (sharedCountByRecordId.get(recordId) ?? 0) + 1);

      const attributes = sharedAttributesByRecordId.get(recordId) ?? [];
      attributes.push({ type: attributeNode.type, label: attributeNode.label });
      sharedAttributesByRecordId.set(recordId, attributes);
    }
  }

  const recordsById = new Map(records.map((record) => [record.id, record]));

  const similarRecords = [...sharedCountByRecordId.entries()]
    .filter(([, sharedCount]) => sharedCount >= THRESHOLDS.minSharedAttributes)
    .map(([recordId, sharedCount]) => ({
      record: recordsById.get(recordId),
      sharedCount,
      sharedAttributes: sharedAttributesByRecordId.get(recordId),
    }))
    .sort((a, b) => b.sharedCount - a.sharedCount || (b.record.rating ?? 0) - (a.record.rating ?? 0))
    .slice(0, MAX_SIMILAR_RECORDS);

  return { similarRecords };
};
