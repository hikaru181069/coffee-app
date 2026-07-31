import { normalizeName } from "../../utils/normalizeName.js";
import {
  recordNodeId,
  originNodeId,
  farmNodeId,
  varietyNodeId,
  processNodeId,
  roastLevelNodeId,
  flavorNodeId,
  edgeId,
} from "./nodeId.js";

/**
 * 知識グラフを組み立てる純粋関数。
 *
 * prompts/04 の制約により、HTTPやMongoDBの責務をここへ混ぜない。
 * 入力はプレーンなJSオブジェクトの配列（services/coffee/coffeeRecordSerializer.js
 * が返す形と同じ: { id, title, consumedAt, rating, origin, farmName,
 * varieties, process, roastLevel, flavors, ... }）。
 * 既存のserializerと同じ形を使うことで、CoffeeRecord APIとグラフAPIで
 * 「参照をどう表現するか」の理解が1つで済む。
 *
 * データの流れ（docs/knowledge-graph.md の Graph Generation）:
 *   1. 認証済みuserIdでCoffeeRecordを取得        … graphService の担当
 *   2. マスターデータをpopulateまたは集約         … repository の担当
 *   3. CoffeeRecordノードを生成                  … ここ
 *   4. 属性ノードを重複排除して生成               … ここ
 *   5. recordと属性のedgeを生成                  … ここ
 *   6. recordCountなどのmetadataを集計            … ここ
 *   7. frontend向け形式で返す                     … ここ
 */

/** 属性ノードの種別一覧。nodeTypesフィルターの検証にも使う */
export const ATTRIBUTE_NODE_TYPES = [
  "origin",
  "farm",
  "variety",
  "process",
  "roastLevel",
  "flavor",
];

/**
 * 1つの記録から生成される「属性の参照」を列挙する。
 *
 * record → 属性 の対応が5種類あり、単数（origin/process/roastLevel）と
 * 複数（variety/flavor）が混ざっている。ここで一度リストへ均すことで、
 * buildGraph 側のループが1種類の書き方で済む。
 */
const collectAttributeRefs = (record) => {
  const refs = [];

  if (record.origin) {
    refs.push({
      type: "origin",
      id: originNodeId(record.origin.id),
      label: record.origin.name,
      metadata: { originId: record.origin.id },
      edgeType: "ORIGIN",
    });
  }

  if (record.farmName) {
    // farmだけは別コレクションを持たないため、正規化した名前をIDにする
    // （nodeId.js の farmNodeId を参照）
    const normalized = normalizeName(record.farmName);
    refs.push({
      type: "farm",
      id: farmNodeId(normalized),
      label: record.farmName,
      metadata: { farmName: record.farmName },
      edgeType: "FARM",
    });
  }

  for (const variety of record.varieties ?? []) {
    refs.push({
      type: "variety",
      id: varietyNodeId(variety.id),
      label: variety.name,
      metadata: { varietyId: variety.id },
      edgeType: "VARIETY",
    });
  }

  if (record.process) {
    refs.push({
      type: "process",
      id: processNodeId(record.process.id),
      label: record.process.name,
      metadata: { processId: record.process.id },
      edgeType: "PROCESS",
    });
  }

  if (record.roastLevel) {
    refs.push({
      type: "roastLevel",
      id: roastLevelNodeId(record.roastLevel.id),
      label: record.roastLevel.name,
      metadata: { roastLevelId: record.roastLevel.id },
      edgeType: "ROAST_LEVEL",
    });
  }

  for (const flavor of record.flavors ?? []) {
    refs.push({
      type: "flavor",
      id: flavorNodeId(flavor.id),
      label: flavor.name,
      metadata: { flavorId: flavor.id },
      edgeType: "FLAVOR",
    });
  }

  return refs;
};

/**
 * CoffeeRecordの配列から知識グラフを組み立てる。
 *
 * @param {Array} records services/coffee/coffeeRecordSerializer.js と同じ形の配列
 * @param {object} [options]
 * @param {string[]} [options.nodeTypes]
 *   出力に含める属性ノードの種別（ATTRIBUTE_NODE_TYPES の部分集合）。
 *   未指定または空配列ならすべて含める。
 *   recordノードは常に含める。record自体を除外すると、属性ノードだけが
 *   浮いた意味のないグラフになるため（docs/knowledge-graph.md の Filters
 *   はnodeTypesを「属性の絞り込み」として説明している）。
 * @returns {{ nodes: Array, edges: Array, summary: object }}
 */
export const buildGraph = (records, { nodeTypes } = {}) => {
  const allowedTypes =
    Array.isArray(nodeTypes) && nodeTypes.length > 0 ? new Set(nodeTypes) : null;

  // Mapを使うのは、同じIDのノード/エッジが複数回現れても
  // 「後勝ち」ではなく「最初の1回だけ登録」にするため（重複排除）。
  const nodesById = new Map();
  const edgesById = new Map();

  for (const record of records) {
    const sourceId = recordNodeId(record.id);

    // recordノードは常に作る。nodeTypesフィルターの対象外
    // （このコメント直上の options.nodeTypes の説明を参照）
    nodesById.set(sourceId, {
      id: sourceId,
      type: "record",
      label: record.title,
      metadata: {
        recordId: record.id,
        consumedAt: record.consumedAt,
        rating: record.rating,
      },
    });

    for (const ref of collectAttributeRefs(record)) {
      if (allowedTypes && !allowedTypes.has(ref.type)) continue;

      // 既に同じ属性ノードがあれば recordCount を増やすだけ。
      // 例えば「Ethiopia」の記録が3件あっても、originノードは1つにまとまる
      const existing = nodesById.get(ref.id);
      if (existing) {
        existing.metadata.recordCount += 1;
      } else {
        nodesById.set(ref.id, {
          id: ref.id,
          type: ref.type,
          label: ref.label,
          metadata: { ...ref.metadata, recordCount: 1 },
        });
      }

      const eId = edgeId(sourceId, ref.id);
      // 同じ記録が同じ品種を重複して持つことは無い
      // （models/CoffeeRecord.js の varietyIds/flavorIds が保存時に重複除去する）が、
      // 万一の重複データでもエッジが二重にならないようMapで防いでおく
      if (!edgesById.has(eId)) {
        edgesById.set(eId, { id: eId, source: sourceId, target: ref.id, type: ref.edgeType });
      }
    }
  }

  const nodes = [...nodesById.values()];
  const edges = [...edgesById.values()];

  return {
    nodes,
    edges,
    summary: {
      recordCount: records.length,
      nodeCount: nodes.length,
      edgeCount: edges.length,
    },
  };
};

/**
 * 指定したノードへ向かうエッジの記録IDを集める（関連記録の抽出用）。
 *
 * record自体のノードにはエッジが向かわない（エッジは常にrecord→属性の
 * 向きなので）。attribute nodeId を渡したときだけ意味のある結果になる。
 */
export const findRecordIdsConnectedToNode = (graph, nodeId) => {
  const recordIds = new Set();

  for (const edge of graph.edges) {
    if (edge.target !== nodeId) continue;

    // "record:abc" → "abc"
    const recordId = edge.source.slice("record:".length);
    recordIds.add(recordId);
  }

  return recordIds;
};
