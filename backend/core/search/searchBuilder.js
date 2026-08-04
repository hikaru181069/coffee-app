import { buildGraph } from "../graph/graphBuilder.js";

/**
 * 記録・属性を横断して検索する純粋関数。
 *
 * docs/search.md 参照。graphBuilder.js（DB/HTTP非依存の純粋関数）を
 * そのまま使い、グラフのノード・エッジから検索結果を組み立てる。
 * 産地・農園・品種・精製方法・焙煎度・フレーバー・カフェは属性ノードから、
 * コーヒー名（記録のtitle）は記録自体から、それぞれ検索する
 * （単なるコーヒー名検索だけでなく、属性を横断して検索できるように
 * するための機能）。
 *
 * 属性ノードがヒットした場合は、その属性が付いた記録に共起する
 * フレーバー（属性自体がフレーバーの場合は産地）を上位3件まで添える。
 * 属性同士の直接エッジは持たない（docs/knowledge-graph.md）ため、
 * 「その属性が付いた記録」を経由して間接的に集計する。
 */

const MAX_RELATED_LABELS = 3;

const matchesQuery = (label, normalizedQuery) => (label ?? "").toLowerCase().includes(normalizedQuery);

const buildNodeMap = (graph) => new Map(graph.nodes.map((node) => [node.id, node]));

/** attributeNodeIdに接続する記録ノードのID一覧（"record:xxx"形式）。エッジは常にrecord→属性の向き */
const findConnectedRecordIds = (graph, attributeNodeId) => {
  const recordIds = new Set();
  for (const edge of graph.edges) {
    if (edge.target === attributeNodeId) recordIds.add(edge.source);
  }
  return recordIds;
};

/**
 * attributeNodeIdと同じ記録に共起する、relatedType のノードを
 * 登場回数の多い順に返す。
 */
const findRelatedLabels = (graph, nodeMap, attributeNodeId, relatedType, limit) => {
  const recordIds = findConnectedRecordIds(graph, attributeNodeId);
  const counts = new Map();

  for (const edge of graph.edges) {
    if (!recordIds.has(edge.source) || edge.target === attributeNodeId) continue;
    const node = nodeMap.get(edge.target);
    if (!node || node.type !== relatedType) continue;

    const entry = counts.get(edge.target) ?? { label: node.label, count: 0 };
    entry.count += 1;
    counts.set(edge.target, entry);
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((entry) => entry.label);
};

/**
 * 記録からInsightではなく検索結果を組み立てる。
 *
 * @param {Array} records services/coffee/coffeeRecordSerializer.js が返す形と同じ配列
 * @param {string} query 検索語
 * @returns {{ entities: Array, records: Array }}
 */
export const buildSearchResults = (records, query) => {
  const normalizedQuery = (query ?? "").trim().toLowerCase();
  if (!normalizedQuery) return { entities: [], records: [] };

  const graph = buildGraph(records);
  const nodeMap = buildNodeMap(graph);

  const entities = graph.nodes
    .filter((node) => node.type !== "record" && matchesQuery(node.label, normalizedQuery))
    .map((node) => {
      // フレーバー自体がヒットしたときは「よく一緒に登場する産地」を、
      // それ以外は「よく一緒に登場するフレーバー」を添える
      const relatedType = node.type === "flavor" ? "origin" : "flavor";
      return {
        id: node.id,
        type: node.type,
        label: node.label,
        recordCount: node.metadata.recordCount,
        relatedType,
        relatedLabels: findRelatedLabels(graph, nodeMap, node.id, relatedType, MAX_RELATED_LABELS),
      };
    })
    .sort((a, b) => b.recordCount - a.recordCount);

  const matchedRecords = records.filter((record) => matchesQuery(record.title, normalizedQuery));

  return { entities, records: matchedRecords };
};
