import { normalizeName } from "../../utils/normalizeName.js";
import {
  recordNodeId,
  originNodeId,
  farmNodeId,
  varietyNodeId,
  processNodeId,
  roastLevelNodeId,
  flavorNodeId,
  cafeNodeId,
  keywordNodeId,
  edgeId,
} from "./nodeId.js";
import { extractKeywords } from "./noteKeywordExtractor.js";

/**
 * 知識グラフを組み立てる純粋関数。
 *
 * HTTPやMongoDBの責務をここへ混ぜない（docs/architecture.md参照）。
 * 入力はプレーンなJSオブジェクトの配列（services/coffee/coffeeRecordSerializer.js
 * が返す形と同じ: { id, title, consumedAt, rating, components: [{ origin,
 * farmName, varieties, process }], roastLevel, flavors, ... }）。
 * 既存のserializerと同じ形を使うことで、CoffeeRecord APIとグラフAPIで
 * 「参照をどう表現するか」の理解が1つで済む。
 *
 * データの流れ（docs/knowledge-graph.md の Graph Generation）:
 *   1. 認証済みuserIdでCoffeeRecordを取得        … graphService の担当
 *   2. マスターデータをpopulateまたは集約         … repository の担当
 *   3. CoffeeRecordノードを生成                  … ここ
 *   4. 属性ノードを重複排除して生成               … ここ（notesを固定辞書と
 *      部分文字列一致で照合したkeywordも同じ手順でノード化する。
 *      backend/core/graph/noteKeywordExtractor.js参照）
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
  "cafe",
  "keyword",
];

/**
 * 1つの記録から生成される「属性の参照」を列挙する。
 *
 * record → 属性 の対応が7種類あり、単数（roastLevel/cafe）と複数
 * （flavor、および「コーヒーの詳細」componentsから展開されるorigin/
 * farm/variety/process）が混ざっている。ここで一度リストへ均すことで、
 * buildGraph 側のループが1種類の書き方で済む。
 *
 * @param {object} record
 * @param {Map<string, {id: string, name: string}>} [flavorsByNormalizedName]
 *   notesのキーワードをflavorへ統合するためのFlavorマスター索引
 *   （normalizeName(flavor.name) → {id, name}）。未指定ならkeywordは
 *   すべてkeywordノードのままになる（後方互換のため任意引数にしている）。
 *
 * buildGraph以外に、core/discoveries/discoveryBuilder.js（保存直後の
 * 「発見」検出）からも呼ばれる。属性参照を正規化する唯一の場所であり、
 * グラフ生成と発見検出でrefの形・recordCountの数え方がずれないようにするため。
 */
export const collectAttributeRefs = (record, flavorsByNormalizedName) => {
  const refs = [];

  // 2026-09、ブレンドコーヒー対応で産地・農園・品種・精製方法を
  // 「コーヒーの詳細」1グループ（component）にまとめ、その配列
  // （record.components）を持つようにした（docs/domain-model.md参照）。
  // ここでは各グループを順に展開し、同じ考え方（単数はif、複数はfor）を
  // グループの中で適用する
  for (const component of record.components ?? []) {
    if (component.origin) {
      refs.push({
        type: "origin",
        id: originNodeId(component.origin.id),
        label: component.origin.name,
        // countryCodeは世界地図機能（2026-08）向け。coffeeRecordSerializer.js
        // のserializeRefがOriginをpopulateしたときだけ返すフィールドなので、
        // 元々countryCodeを持たない産地（未設定のOrigin）ではnullになる
        metadata: { originId: component.origin.id, countryCode: component.origin.countryCode ?? null },
        edgeType: "ORIGIN",
      });
    }

    if (component.farmName) {
      // farmだけは別コレクションを持たないため、正規化した名前をIDにする
      // （nodeId.js の farmNodeId を参照）
      const normalized = normalizeName(component.farmName);
      refs.push({
        type: "farm",
        id: farmNodeId(normalized),
        label: component.farmName,
        metadata: { farmName: component.farmName },
        edgeType: "FARM",
      });
    }

    for (const variety of component.varieties ?? []) {
      refs.push({
        type: "variety",
        id: varietyNodeId(variety.id),
        label: variety.name,
        metadata: { varietyId: variety.id },
        edgeType: "VARIETY",
      });
    }

    if (component.process) {
      refs.push({
        type: "process",
        id: processNodeId(component.process.id),
        label: component.process.name,
        metadata: { processId: component.process.id },
        edgeType: "PROCESS",
      });
    }
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

  if (record.cafeName) {
    // cafeもfarmと同じ理由（別コレクションを持たない自由記述）で、
    // 正規化した名前をIDにする（nodeId.js の cafeNodeId を参照）
    const normalized = normalizeName(record.cafeName);
    refs.push({
      type: "cafe",
      id: cafeNodeId(normalized),
      label: record.cafeName,
      metadata: { cafeName: record.cafeName },
      edgeType: "CAFE",
    });
  }

  // notesは自由記述だが、固定辞書との部分文字列一致で味覚キーワードを
  // 検出する（noteKeywordExtractor.js）。flavorと違いマスターデータを
  // 持たず、読み取り時に都度導出する点がfarm/cafeとも異なる
  // （farm/cafeはユーザーが直接入力した項目名そのもの。keywordは
  // ユーザーが選択・入力していない、自動検出された属性）。
  //
  // ただしflavorAliasを持つ語（例:「チョコレートのような」）が実在の
  // Flavorマスターと一致する場合は、新しいkeywordノードを作らず、
  // 既存のflavorノードへ統合する（tasteKeywords.jsonの_comment参照。
  // ユーザーが「Chocolate（手動選択したflavor）」と「チョコレートの
  // ような（notesの自由記述）」が別ノードに分かれるのは冗長だと
  // 指摘したための対応）。一致しなければ従来どおりkeywordノードにする。
  for (const { keyword, flavorAlias } of extractKeywords(record.notes)) {
    const matchedFlavor = flavorAlias
      ? flavorsByNormalizedName?.get(normalizeName(flavorAlias))
      : null;

    if (matchedFlavor) {
      refs.push({
        type: "flavor",
        id: flavorNodeId(matchedFlavor.id),
        label: matchedFlavor.name,
        metadata: { flavorId: matchedFlavor.id },
        edgeType: "FLAVOR",
      });
    } else {
      const normalized = normalizeName(keyword);
      refs.push({
        type: "keyword",
        id: keywordNodeId(normalized),
        label: keyword,
        metadata: { keyword },
        edgeType: "KEYWORD",
      });
    }
  }

  // 同じ記録が「Chocolate」をflavorとして明示選択し、かつnotesにも
  // 「チョコレートのような」と書いていた場合、上のロジックにより
  // 同じflavorノードへのrefが2つ生まれうる。buildGraph側のrecordCount
  // 集計は「そのrefを何回処理したか」を数えるため、ここで重複を
  // 取り除いておかないと同じ記録が2回とカウントされてしまう。
  const seenIds = new Set();
  return refs.filter((ref) => {
    if (seenIds.has(ref.id)) return false;
    seenIds.add(ref.id);
    return true;
  });
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
 * @param {Map<string, {id: string, name: string}>} [options.flavorsByNormalizedName]
 *   notesのキーワード（flavorAlias付き）をflavorノードへ統合するための
 *   Flavorマスター索引。graphService.jsがmasterDataRepositoryから取得して
 *   渡す。未指定なら統合せず、該当キーワードもkeywordノードのままになる。
 * @returns {{ nodes: Array, edges: Array, summary: object }}
 */
export const buildGraph = (records, { nodeTypes, flavorsByNormalizedName } = {}) => {
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

    for (const ref of collectAttributeRefs(record, flavorsByNormalizedName)) {
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
