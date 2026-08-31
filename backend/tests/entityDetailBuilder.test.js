/**
 * core/graph/entityDetailBuilder.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数なので、モック無しでテストできる
 * （tests/graphBuilder.test.js / tests/searchBuilder.test.js と同じ方針）。
 */

import { buildGraph } from "../core/graph/graphBuilder.js";
import { buildEntityDetail } from "../core/graph/entityDetailBuilder.js";

const ORIGIN_ETHIOPIA = { id: "origin-ethiopia", name: "Ethiopia" };
const ORIGIN_KENYA = { id: "origin-kenya", name: "Kenya" };
const PROCESS_WASHED = { id: "process-washed", name: "Washed" };
const VARIETY_HEIRLOOM = { id: "variety-heirloom", name: "Heirloom" };
const FLAVOR_BERRY = { id: "flavor-berry", name: "Berry" };
const FLAVOR_FLORAL = { id: "flavor-floral", name: "Floral" };

/** テスト用の最小限の記録を作る。必要な項目だけ上書きする */
const buildRecord = (overrides = {}) => ({
  id: "record-1",
  title: "Test Coffee",
  consumedAt: "2026-07-01T09:00:00.000Z",
  recordType: "home",
  rating: null,
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

describe("該当ノードが無い場合", () => {
  test("nullを返す", () => {
    const records = [buildRecord({ origin: ORIGIN_ETHIOPIA })];
    const graph = buildGraph(records);

    expect(buildEntityDetail(graph, records, "origin:does-not-exist")).toBeNull();
  });
});

describe("基本情報", () => {
  test("id/type/label/recordCountを返す", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA }),
    ];
    const graph = buildGraph(records);
    const detail = buildEntityDetail(graph, records, "origin:origin-ethiopia");

    expect(detail).toMatchObject({
      id: "origin:origin-ethiopia",
      type: "origin",
      label: "Ethiopia",
      recordCount: 2,
    });
  });
});

describe("平均評価", () => {
  test("関連記録の評価を平均する（小数第2位で四捨五入）", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, rating: 5 }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, rating: 4 }),
    ];
    const graph = buildGraph(records);
    const detail = buildEntityDetail(graph, records, "origin:origin-ethiopia");

    expect(detail.avgRating).toBe(4.5);
  });

  test("評価が1件も無ければnull", () => {
    const records = [buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, rating: null })];
    const graph = buildGraph(records);
    const detail = buildEntityDetail(graph, records, "origin:origin-ethiopia");

    expect(detail.avgRating).toBeNull();
  });
});

describe("最終記録日", () => {
  test("関連記録の中で最も新しいconsumedAtを返す", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, consumedAt: "2026-01-01T00:00:00.000Z" }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, consumedAt: "2026-06-01T00:00:00.000Z" }),
      buildRecord({ id: "c", origin: ORIGIN_ETHIOPIA, consumedAt: "2026-03-01T00:00:00.000Z" }),
    ];
    const graph = buildGraph(records);
    const detail = buildEntityDetail(graph, records, "origin:origin-ethiopia");

    expect(detail.lastConsumedAt).toBe("2026-06-01T00:00:00.000Z");
  });
});

describe("関連属性", () => {
  test("種別ごとに登場回数の多い順で集計する", () => {
    const records = [
      buildRecord({
        id: "a",
        origin: ORIGIN_ETHIOPIA,
        process: PROCESS_WASHED,
        varieties: [VARIETY_HEIRLOOM],
        flavors: [FLAVOR_BERRY, FLAVOR_FLORAL],
      }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, flavors: [FLAVOR_BERRY] }),
    ];
    const graph = buildGraph(records);
    const detail = buildEntityDetail(graph, records, "origin:origin-ethiopia");

    expect(detail.relatedAttributes.flavor).toEqual([
      { id: "flavor:flavor-berry", label: "Berry", count: 2 },
      { id: "flavor:flavor-floral", label: "Floral", count: 1 },
    ]);
    expect(detail.relatedAttributes.process).toEqual([
      { id: "process:process-washed", label: "Washed", count: 1 },
    ]);
    expect(detail.relatedAttributes.variety).toEqual([
      { id: "variety:variety-heirloom", label: "Heirloom", count: 1 },
    ]);
  });

  test("同じ種別同士は関連属性に含めない（origin自身から見たoriginなど）", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "b", origin: ORIGIN_KENYA }),
    ];
    const graph = buildGraph(records);
    const detail = buildEntityDetail(graph, records, "origin:origin-ethiopia");

    expect(detail.relatedAttributes.origin).toBeUndefined();
  });

  test("共起する属性が無い種別はキー自体を含めない", () => {
    const records = [buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA })];
    const graph = buildGraph(records);
    const detail = buildEntityDetail(graph, records, "origin:origin-ethiopia");

    expect(detail.relatedAttributes).toEqual({});
  });

  test("2026-08、種別ごと5件までの上限は撤廃済み。6件以上あってもすべて返す", () => {
    const flavors = Array.from({ length: 6 }, (_, i) => ({ id: `flavor-${i}`, name: `Flavor${i}` }));
    const records = [buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, flavors })];
    const graph = buildGraph(records);
    const detail = buildEntityDetail(graph, records, "origin:origin-ethiopia");

    expect(detail.relatedAttributes.flavor).toHaveLength(6);
  });
});

describe("関連記録", () => {
  test("そのノードに接続する記録だけを返す（他の記録は含めない）", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "b", origin: ORIGIN_KENYA }),
    ];
    const graph = buildGraph(records);
    const detail = buildEntityDetail(graph, records, "origin:origin-ethiopia");

    expect(detail.connectedRecords.map((record) => record.id)).toEqual(["a"]);
  });
});
