/**
 * core/insights/insightBuilder.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数なので、モック無しでテストできる
 * （tests/graphBuilder.test.js と同じ方針）。
 */

import { buildInsights } from "../core/insights/insightBuilder.js";

const ORIGIN_ETHIOPIA = { id: "origin-ethiopia", name: "Ethiopia" };
const ORIGIN_KENYA = { id: "origin-kenya", name: "Kenya" };
const PROCESS_NATURAL = { id: "process-natural", name: "Natural" };
const PROCESS_WASHED = { id: "process-washed", name: "Washed" };
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
  ...overrides,
});

describe("空・不十分な記録", () => {
  test("記録が0件なら空配列を返す", () => {
    expect(buildInsights([])).toEqual({ insights: [] });
  });

  test("どの閾値も満たさない少数の記録では何も返さない", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, rating: 5 }),
      buildRecord({ id: "b", origin: ORIGIN_KENYA, rating: 3 }),
    ];
    expect(buildInsights(records)).toEqual({ insights: [] });
  });
});

describe("topOrigin", () => {
  test("同じ産地が3件以上で最多なら検出する", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "c", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "d", origin: ORIGIN_KENYA }),
    ];
    const { insights } = buildInsights(records);
    expect(insights).toContainEqual({ type: "topOrigin", label: "Ethiopia", count: 3 });
  });

  test("同率首位のときは検出しない", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "c", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "d", origin: ORIGIN_KENYA }),
      buildRecord({ id: "e", origin: ORIGIN_KENYA }),
      buildRecord({ id: "f", origin: ORIGIN_KENYA }),
    ];
    const { insights } = buildInsights(records);
    expect(insights.some((insight) => insight.type === "topOrigin")).toBe(false);
  });

  test("2件以下では検出しない（閾値未満）", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA }),
    ];
    const { insights } = buildInsights(records);
    expect(insights.some((insight) => insight.type === "topOrigin")).toBe(false);
  });
});

describe("topFlavor", () => {
  test("同じフレーバーが3件以上で最多なら検出する", () => {
    const records = [
      buildRecord({ id: "a", flavors: [FLAVOR_FLORAL] }),
      buildRecord({ id: "b", flavors: [FLAVOR_FLORAL] }),
      buildRecord({ id: "c", flavors: [FLAVOR_FLORAL] }),
    ];
    const { insights } = buildInsights(records);
    expect(insights).toContainEqual({ type: "topFlavor", label: "Floral", count: 3 });
  });
});

describe("topProcessRating", () => {
  test("2件以上・平均4.0以上の精製方法を検出する", () => {
    const records = [
      buildRecord({ id: "a", process: PROCESS_WASHED, rating: 5 }),
      buildRecord({ id: "b", process: PROCESS_WASHED, rating: 4 }),
    ];
    const { insights } = buildInsights(records);
    expect(insights).toContainEqual({
      type: "topProcessRating",
      label: "Washed",
      avgRating: 4.5,
      count: 2,
    });
  });

  test("平均4.0未満なら検出しない", () => {
    const records = [
      buildRecord({ id: "a", process: PROCESS_WASHED, rating: 3 }),
      buildRecord({ id: "b", process: PROCESS_WASHED, rating: 4 }),
    ];
    const { insights } = buildInsights(records);
    expect(insights.some((insight) => insight.type === "topProcessRating")).toBe(false);
  });
});

describe("topCombination", () => {
  test("産地×精製方法の組み合わせが2件以上・平均4.0以上で検出する", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL, rating: 5 }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL, rating: 4 }),
    ];
    const { insights } = buildInsights(records);
    expect(insights).toContainEqual({
      type: "topCombination",
      attributes: [
        { attrType: "origin", label: "Ethiopia" },
        { attrType: "process", label: "Natural" },
      ],
      avgRating: 4.5,
      count: 2,
    });
  });

  test("優先度が最も高く、他の条件を満たす記録があっても先頭に来る", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL, rating: 5 }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL, rating: 5 }),
      buildRecord({ id: "c", origin: ORIGIN_ETHIOPIA, rating: 4 }),
      buildRecord({ id: "d", origin: ORIGIN_ETHIOPIA, rating: 4 }),
    ];
    const { insights } = buildInsights(records);
    expect(insights[0].type).toBe("topCombination");
  });
});

describe("homeVsCafeDiff", () => {
  test("自宅・カフェ各2件以上で評価差が1.0以上なら検出する", () => {
    const records = [
      buildRecord({ id: "a", recordType: "home", rating: 3 }),
      buildRecord({ id: "b", recordType: "home", rating: 3 }),
      buildRecord({ id: "c", recordType: "cafe", rating: 5 }),
      buildRecord({ id: "d", recordType: "cafe", rating: 4 }),
    ];
    const { insights } = buildInsights(records);
    expect(insights).toContainEqual({
      type: "homeVsCafeDiff",
      higherType: "cafe",
      homeAvg: 3,
      cafeAvg: 4.5,
      homeCount: 2,
      cafeCount: 2,
    });
  });

  test("差が1.0未満なら検出しない", () => {
    const records = [
      buildRecord({ id: "a", recordType: "home", rating: 4 }),
      buildRecord({ id: "b", recordType: "home", rating: 4 }),
      buildRecord({ id: "c", recordType: "cafe", rating: 4 }),
      buildRecord({ id: "d", recordType: "cafe", rating: 4.5 }),
    ];
    const { insights } = buildInsights(records);
    expect(insights.some((insight) => insight.type === "homeVsCafeDiff")).toBe(false);
  });
});

describe("risingTrend", () => {
  test("直近側に偏って登場する産地を検出する", () => {
    const older = [
      buildRecord({ id: "a", consumedAt: "2026-01-01", origin: ORIGIN_KENYA }),
      buildRecord({ id: "b", consumedAt: "2026-02-01", origin: ORIGIN_KENYA }),
      buildRecord({ id: "c", consumedAt: "2026-03-01", origin: ORIGIN_KENYA }),
      buildRecord({ id: "d", consumedAt: "2026-04-01", origin: ORIGIN_KENYA }),
    ];
    const recent = [
      buildRecord({ id: "e", consumedAt: "2026-05-01", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "f", consumedAt: "2026-06-01", origin: ORIGIN_ETHIOPIA }),
    ];
    const { insights } = buildInsights([...older, ...recent]);
    expect(insights).toContainEqual({
      type: "risingTrend",
      label: "Ethiopia",
      recentCount: 2,
      earlierCount: 0,
    });
  });
});
