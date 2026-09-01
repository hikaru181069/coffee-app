import { ATTRIBUTE_NODE_TYPES } from "./graphBuilder.js";
import { average, roundTo1 } from "../shared/aggregationHelpers.js";

/**
 * 属性ノード1件の詳細（統計・関連属性・関連記録）を組み立てる純粋関数。
 *
 * docs/entity-detail.md参照。graphBuilder.js（DB/HTTP非依存の純粋関数）が
 * 作ったグラフと、元になった記録の配列（services/coffee/coffeeRecordSerializer.js
 * と同じ形）の両方を受け取る。recordCountや関連属性はグラフのエッジから
 * 求まるが、平均評価・最終記録日は記録本体（rating/consumedAt）を
 * 見る必要があるため、グラフだけでは完結しない。
 *
 * 知識グラフをただの可視化ではなくナビゲーションにする（プロダクト方針）
 * ための機能。産地・農園・品種・精製方法・焙煎度・フレーバー・カフェの
 * どの種別でも同じ形で使える汎用関数にしている（種別ごとに個別のロジックを
 * 作らない）。
 */

const RECORD_PREFIX = "record:";

/** attributeNodeIdに接続する記録ノードのID一覧（"record:xxx"形式）。エッジは常にrecord→属性の向き */
const findConnectedRecordNodeIds = (graph, attributeNodeId) => {
  const ids = new Set();
  for (const edge of graph.edges) {
    if (edge.target === attributeNodeId) ids.add(edge.source);
  }
  return ids;
};

/**
 * selfNodeIdと同じ記録に共起する属性を、種別ごと・登場回数の多い順に
 * 集計する。属性同士の直接エッジは持たないため、記録を介して間接的に
 * 集計する（core/search/searchBuilder.js の findRelatedLabels と同じ
 * 考え方。こちらは1種別だけでなく他のすべての種別を同時に集計する）。
 *
 * 同じ種別同士（例: origin自身から見たorigin）は直接エッジが無く
 * 常に空になるため、selfTypeは結果から除外する。
 *
 * 2026-08、種別ごと最大5件までに切り詰めていたが、「全部見る手段が無い」
 * という指摘を受けて撤廃した（docs/features.md「Entity Detail」参照）。
 * 1ユーザーの記録から導出される属性の種類数は多くても数十件程度で
 * （自分の記録に登場した産地・フレーバー等の実数が上限のため）、
 * 返却件数が際限なく増える心配は無い。表示側の「最初は5件、もっと見るで
 * 展開」はフロントエンド（EntityDetailPage.jsx）の責務にした。
 */
const findRelatedAttributesByType = (graph, nodeMap, connectedRecordNodeIds, selfNodeId, selfType) => {
  const countsByType = new Map();

  for (const edge of graph.edges) {
    if (!connectedRecordNodeIds.has(edge.source) || edge.target === selfNodeId) continue;
    const target = nodeMap.get(edge.target);
    if (!target || target.type === selfType) continue;

    if (!countsByType.has(target.type)) countsByType.set(target.type, new Map());
    const counts = countsByType.get(target.type);
    const entry = counts.get(edge.target) ?? { id: edge.target, label: target.label, count: 0 };
    entry.count += 1;
    counts.set(edge.target, entry);
  }

  const result = {};
  for (const type of ATTRIBUTE_NODE_TYPES) {
    const counts = countsByType.get(type);
    if (!counts || counts.size === 0) continue;
    result[type] = [...counts.values()].sort((a, b) => b.count - a.count);
  }
  return result;
};

/**
 * 指定した属性ノードの詳細を組み立てる。
 *
 * @param {{nodes: Array, edges: Array}} graph graphBuilder.jsのbuildGraphの結果
 * @param {Array} records serializeCoffeeRecordsが返す形と同じ配列（graphの生成元と同じもの）
 * @param {string} nodeId "origin:507f..." のようなstable ID
 * @returns {object | null} 該当ノードが存在しなければnull
 */
export const buildEntityDetail = (graph, records, nodeId) => {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) return null;

  const nodeMap = new Map(graph.nodes.map((candidate) => [candidate.id, candidate]));
  const connectedRecordNodeIds = findConnectedRecordNodeIds(graph, nodeId);
  const connectedRecordIds = new Set(
    [...connectedRecordNodeIds].map((recordNodeId) => recordNodeId.slice(RECORD_PREFIX.length)),
  );
  const connectedRecords = records.filter((record) => connectedRecordIds.has(record.id));

  const ratings = connectedRecords.map((record) => record.rating).filter((rating) => rating != null);
  const lastConsumedAt = connectedRecords.reduce((latest, record) => {
    if (!record.consumedAt) return latest;
    return !latest || new Date(record.consumedAt) > new Date(latest) ? record.consumedAt : latest;
  }, null);

  return {
    id: node.id,
    type: node.type,
    label: node.label,
    recordCount: node.metadata.recordCount,
    avgRating: roundTo1(average(ratings)),
    lastConsumedAt,
    relatedAttributes: findRelatedAttributesByType(graph, nodeMap, connectedRecordNodeIds, nodeId, node.type),
    connectedRecords,
  };
};
