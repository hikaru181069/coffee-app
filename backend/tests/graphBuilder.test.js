/**
 * core/graph/graphBuilder.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数なので、モック無しでテストできる。
 * services/coffee/coffeeRecordSerializer.js が返す形と同じ
 * プレーンオブジェクトを直接組み立てて渡す。
 */

import { buildGraph, findRecordIdsConnectedToNode } from "../core/graph/graphBuilder.js";

/** テスト用の最小限の記録を作る。必要な項目だけ上書きする */
const buildRecord = (overrides = {}) => ({
  id: "record-1",
  title: "Ethiopia Natural",
  consumedAt: "2026-07-31T09:00:00.000Z",
  recordType: "home",
  rating: 5,
  notes: "",
  origin: null,
  farmName: "",
  varieties: [],
  process: null,
  roastLevel: null,
  flavors: [],
  cafeName: "",
  ...overrides,
});

describe("空の記録", () => {
  test("記録が0件なら空グラフを返す（docs/knowledge-graph.md Tests）", () => {
    const graph = buildGraph([]);

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.summary).toEqual({ recordCount: 0, nodeCount: 0, edgeCount: 0 });
  });
});

describe("recordノード", () => {
  test("記録ごとに1つのrecordノードを作る", () => {
    const graph = buildGraph([
      buildRecord({ id: "a", title: "Ethiopia" }),
      buildRecord({ id: "b", title: "Kenya" }),
    ]);

    const recordNodes = graph.nodes.filter((node) => node.type === "record");
    expect(recordNodes).toHaveLength(2);
    expect(recordNodes.map((node) => node.id).sort()).toEqual(["record:a", "record:b"]);
  });

  test("recordノードのmetadataにrecordId/consumedAt/ratingを持つ", () => {
    const graph = buildGraph([
      buildRecord({ id: "a", title: "Ethiopia", consumedAt: "2026-01-01", rating: 4 }),
    ]);

    const node = graph.nodes.find((n) => n.id === "record:a");
    expect(node.label).toBe("Ethiopia");
    expect(node.metadata).toEqual({
      recordId: "a",
      consumedAt: "2026-01-01",
      rating: 4,
    });
  });

  test("null項目は属性ノードを作らない（docs/knowledge-graph.md Tests）", () => {
    const graph = buildGraph([buildRecord({ id: "a" })]);

    // originId等がすべてnull/空のときは record ノードだけになる
    expect(graph.nodes).toHaveLength(1);
    expect(graph.nodes[0].type).toBe("record");
    expect(graph.edges).toHaveLength(0);
  });
});

describe("ノードの重複排除", () => {
  test("同一originが1ノードに統合される（docs/knowledge-graph.md Tests）", () => {
    const origin = { id: "origin-1", name: "Ethiopia" };
    const graph = buildGraph([
      buildRecord({ id: "a", origin }),
      buildRecord({ id: "b", origin }),
      buildRecord({ id: "c", origin }),
    ]);

    const originNodes = graph.nodes.filter((node) => node.type === "origin");
    expect(originNodes).toHaveLength(1);
    expect(originNodes[0]).toMatchObject({
      id: "origin:origin-1",
      label: "Ethiopia",
      metadata: { originId: "origin-1", recordCount: 3 },
    });
  });

  test("同一flavorが1ノードに統合される（docs/knowledge-graph.md Tests）", () => {
    const citrus = { id: "flavor-1", name: "Citrus", category: "fruity" };
    const graph = buildGraph([
      buildRecord({ id: "a", flavors: [citrus] }),
      buildRecord({ id: "b", flavors: [citrus] }),
    ]);

    const flavorNodes = graph.nodes.filter((node) => node.type === "flavor");
    expect(flavorNodes).toHaveLength(1);
    expect(flavorNodes[0].metadata.recordCount).toBe(2);
  });

  test("異なる産地は別ノードになる", () => {
    const graph = buildGraph([
      buildRecord({ id: "a", origin: { id: "o1", name: "Ethiopia" } }),
      buildRecord({ id: "b", origin: { id: "o2", name: "Kenya" } }),
    ]);

    const originNodes = graph.nodes.filter((node) => node.type === "origin");
    expect(originNodes).toHaveLength(2);
  });

  test("farmは正規化した名前で統合される（表記揺れを吸収する）", () => {
    const graph = buildGraph([
      buildRecord({ id: "a", farmName: "Konga Washing Station" }),
      buildRecord({ id: "b", farmName: "  konga washing station  " }),
    ]);

    const farmNodes = graph.nodes.filter((node) => node.type === "farm");
    expect(farmNodes).toHaveLength(1);
    expect(farmNodes[0].metadata.recordCount).toBe(2);
  });

  test("cafeは正規化した名前で統合される（farmと同じ扱い）", () => {
    const graph = buildGraph([
      buildRecord({ id: "a", cafeName: "Blue Bottle Coffee" }),
      buildRecord({ id: "b", cafeName: "  blue bottle coffee  " }),
    ]);

    const cafeNodes = graph.nodes.filter((node) => node.type === "cafe");
    expect(cafeNodes).toHaveLength(1);
    expect(cafeNodes[0].metadata.recordCount).toBe(2);
    expect(cafeNodes[0].label).toBe("Blue Bottle Coffee");
  });

  test("異なる種類の属性で偶然同じIDでも衝突しない（stable IDのプレフィックス）", () => {
    // originとflavorに同じ元IDを与えても、node.id は "origin:x" / "flavor:x" で別物になる
    const graph = buildGraph([
      buildRecord({
        id: "a",
        origin: { id: "shared-id", name: "Ethiopia" },
        flavors: [{ id: "shared-id", name: "Citrus" }],
      }),
    ]);

    const ids = graph.nodes.map((node) => node.id);
    expect(ids).toContain("origin:shared-id");
    expect(ids).toContain("flavor:shared-id");
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("エッジの生成", () => {
  test("recordごとに正しいedgeが生成される（docs/knowledge-graph.md Tests）", () => {
    const graph = buildGraph([
      buildRecord({
        id: "a",
        origin: { id: "o1", name: "Ethiopia" },
        farmName: "Konga",
        varieties: [{ id: "v1", name: "Heirloom" }],
        process: { id: "p1", name: "Natural" },
        roastLevel: { id: "r1", name: "Light" },
        flavors: [{ id: "f1", name: "Citrus" }],
      }),
    ]);

    const edgeTypes = graph.edges.map((edge) => edge.type).sort();
    expect(edgeTypes).toEqual(["FARM", "FLAVOR", "ORIGIN", "PROCESS", "ROAST_LEVEL", "VARIETY"]);

    const originEdge = graph.edges.find((edge) => edge.type === "ORIGIN");
    expect(originEdge).toEqual({
      id: "record:a-origin:o1",
      source: "record:a",
      target: "origin:o1",
      type: "ORIGIN",
    });
  });

  test("品種・フレーバーが複数あれば複数のedgeになる", () => {
    const graph = buildGraph([
      buildRecord({
        id: "a",
        varieties: [
          { id: "v1", name: "Heirloom" },
          { id: "v2", name: "Bourbon" },
        ],
      }),
    ]);

    const varietyEdges = graph.edges.filter((edge) => edge.type === "VARIETY");
    expect(varietyEdges).toHaveLength(2);
  });

  test("同じ属性への複数記録は複数のedgeを持つ（属性ノードは1つでもエッジは記録の数だけ）", () => {
    const origin = { id: "o1", name: "Ethiopia" };
    const graph = buildGraph([
      buildRecord({ id: "a", origin }),
      buildRecord({ id: "b", origin }),
    ]);

    const originEdges = graph.edges.filter((edge) => edge.type === "ORIGIN");
    expect(originEdges.map((edge) => edge.source).sort()).toEqual(["record:a", "record:b"]);
  });
});

describe("summary", () => {
  test("recordCount/nodeCount/edgeCountを集計する", () => {
    const graph = buildGraph([
      buildRecord({ id: "a", origin: { id: "o1", name: "Ethiopia" } }),
      buildRecord({ id: "b", origin: { id: "o1", name: "Ethiopia" } }),
    ]);

    expect(graph.summary).toEqual({
      recordCount: 2,
      nodeCount: 3, // record:a, record:b, origin:o1
      edgeCount: 2, // a→origin, b→origin
    });
  });
});

describe("nodeTypesフィルター", () => {
  const records = [
    buildRecord({
      id: "a",
      origin: { id: "o1", name: "Ethiopia" },
      flavors: [{ id: "f1", name: "Citrus" }],
      process: { id: "p1", name: "Washed" },
    }),
  ];

  test("未指定ならすべての属性種別を含める", () => {
    const graph = buildGraph(records);
    const types = new Set(graph.nodes.map((node) => node.type));

    expect(types).toEqual(new Set(["record", "origin", "flavor", "process"]));
  });

  test("指定した種別だけに絞り込む", () => {
    const graph = buildGraph(records, { nodeTypes: ["origin"] });
    const types = new Set(graph.nodes.map((node) => node.type));

    // recordは常に残り、指定していないflavor/processは除外される
    expect(types).toEqual(new Set(["record", "origin"]));
  });

  test("絞り込むと対応するエッジも除外される", () => {
    const graph = buildGraph(records, { nodeTypes: ["origin"] });

    expect(graph.edges).toHaveLength(1);
    expect(graph.edges[0].type).toBe("ORIGIN");
  });

  test("空配列は「絞り込みなし」として扱う", () => {
    const graph = buildGraph(records, { nodeTypes: [] });
    const types = new Set(graph.nodes.map((node) => node.type));

    expect(types).toEqual(new Set(["record", "origin", "flavor", "process"]));
  });
});

describe("findRecordIdsConnectedToNode", () => {
  test("指定ノードに向かうエッジの記録IDを集める", () => {
    const origin = { id: "o1", name: "Ethiopia" };
    const graph = buildGraph([
      buildRecord({ id: "a", origin }),
      buildRecord({ id: "b", origin }),
      buildRecord({ id: "c", origin: { id: "o2", name: "Kenya" } }),
    ]);

    const recordIds = findRecordIdsConnectedToNode(graph, "origin:o1");

    expect(recordIds).toEqual(new Set(["a", "b"]));
  });

  test("存在しないノードIDには空集合を返す", () => {
    const graph = buildGraph([buildRecord({ id: "a" })]);

    expect(findRecordIdsConnectedToNode(graph, "origin:does-not-exist")).toEqual(new Set());
  });

  test("recordノードのIDを渡しても空集合になる（エッジは常にrecord→属性の向き）", () => {
    const graph = buildGraph([buildRecord({ id: "a", origin: { id: "o1", name: "Ethiopia" } })]);

    expect(findRecordIdsConnectedToNode(graph, "record:a")).toEqual(new Set());
  });
});
