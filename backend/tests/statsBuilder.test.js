/**
 * core/stats/statsBuilder.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数なので、モック無しでテストできる
 * （tests/insightBuilder.test.js / tests/searchBuilder.test.js と同じ方針）。
 */

import { buildStats } from "../core/stats/statsBuilder.js";

const ORIGIN_ETHIOPIA = { id: "origin-ethiopia", name: "Ethiopia" };
const ORIGIN_KENYA = { id: "origin-kenya", name: "Kenya" };
const PROCESS_WASHED = { id: "process-washed", name: "Washed" };
const VARIETY_HEIRLOOM = { id: "variety-heirloom", name: "Heirloom" };
const FLAVOR_BERRY = { id: "flavor-berry", name: "Berry" };

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

describe("空の記録", () => {
  test("記録が0件でもクラッシュせず、空の統計を返す", () => {
    const stats = buildStats([]);

    expect(stats.overview).toEqual({
      recordCount: 0,
      originCount: 0,
      varietyCount: 0,
      flavorCount: 0,
      avgRating: null,
      firstRecordedAt: null,
    });
    expect(stats.topOrigins).toEqual([]);
    expect(stats.ratingDistribution).toEqual([
      { rating: 1, count: 0 },
      { rating: 2, count: 0 },
      { rating: 3, count: 0 },
      { rating: 4, count: 0 },
      { rating: 5, count: 0 },
    ]);
    expect(stats.homeVsCafe).toEqual({
      home: { count: 0, avgRating: null },
      cafe: { count: 0, avgRating: null },
    });
    expect(stats.monthlyTrend).toEqual([]);
  });
});

describe("overview", () => {
  test("recordCount・各属性の種類数・平均評価を集計する", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, flavors: [FLAVOR_BERRY], rating: 5 }),
      buildRecord({ id: "b", origin: ORIGIN_KENYA, rating: 3 }),
    ];
    const stats = buildStats(records);

    expect(stats.overview).toMatchObject({
      recordCount: 2,
      originCount: 2,
      flavorCount: 1,
      avgRating: 4,
    });
  });

  test("最も古いconsumedAtをfirstRecordedAtにする", () => {
    const records = [
      buildRecord({ id: "a", consumedAt: "2026-03-01T00:00:00.000Z" }),
      buildRecord({ id: "b", consumedAt: "2026-01-15T00:00:00.000Z" }),
    ];
    const stats = buildStats(records);

    expect(stats.overview.firstRecordedAt).toBe("2026-01-15T00:00:00.000Z");
  });
});

describe("ランキング", () => {
  test("産地を登場回数順に返し、idはgraphBuilderと同じstable ID形式にする", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "c", origin: ORIGIN_KENYA }),
    ];
    const stats = buildStats(records);

    expect(stats.topOrigins).toEqual([
      { id: "origin:origin-ethiopia", label: "Ethiopia", count: 2 },
      { id: "origin:origin-kenya", label: "Kenya", count: 1 },
    ]);
  });

  test("品種・フレーバーは複数値でも正しく集計する", () => {
    const records = [buildRecord({ id: "a", varieties: [VARIETY_HEIRLOOM], flavors: [FLAVOR_BERRY] })];
    const stats = buildStats(records);

    expect(stats.topVarieties).toEqual([{ id: "variety:variety-heirloom", label: "Heirloom", count: 1 }]);
    expect(stats.topFlavors).toEqual([{ id: "flavor:flavor-berry", label: "Berry", count: 1 }]);
  });

  test("カフェ名は正規化した名前で統合される（farmと同じ扱い）", () => {
    const records = [
      buildRecord({ id: "a", cafeName: "Blue Bottle Coffee" }),
      buildRecord({ id: "b", cafeName: "  blue bottle coffee  " }),
    ];
    const stats = buildStats(records);

    expect(stats.topCafes).toEqual([
      { id: "cafe:blue bottle coffee", label: "Blue Bottle Coffee", count: 2 },
    ]);
  });

  test("6件を超える種類があっても上位5件までに絞る", () => {
    const records = Array.from({ length: 6 }, (_, i) =>
      buildRecord({ id: `r${i}`, process: { id: `process-${i}`, name: `Process ${i}` } }),
    );
    const stats = buildStats(records);

    expect(stats.topProcesses).toHaveLength(5);
  });
});

describe("評価の分布", () => {
  test("評価ごとの件数を1〜5すべて含めて返す（0件でも0として含む）", () => {
    const records = [
      buildRecord({ id: "a", rating: 5 }),
      buildRecord({ id: "b", rating: 5 }),
      buildRecord({ id: "c", rating: 3 }),
    ];
    const stats = buildStats(records);

    expect(stats.ratingDistribution).toEqual([
      { rating: 1, count: 0 },
      { rating: 2, count: 0 },
      { rating: 3, count: 1 },
      { rating: 4, count: 0 },
      { rating: 5, count: 2 },
    ]);
  });
});

describe("自宅とカフェ", () => {
  test("recordTypeごとに件数・平均評価を分けて返す", () => {
    const records = [
      buildRecord({ id: "a", recordType: "home", rating: 3 }),
      buildRecord({ id: "b", recordType: "cafe", rating: 5 }),
      buildRecord({ id: "c", recordType: "cafe", rating: 4 }),
    ];
    const stats = buildStats(records);

    expect(stats.homeVsCafe).toEqual({
      home: { count: 1, avgRating: 3 },
      cafe: { count: 2, avgRating: 4.5 },
    });
  });
});

describe("月別の推移", () => {
  test("年月ごとに件数を集計し、古い順に並べる", () => {
    const records = [
      buildRecord({ id: "a", consumedAt: "2026-03-15T00:00:00.000Z" }),
      buildRecord({ id: "b", consumedAt: "2026-01-05T00:00:00.000Z" }),
      buildRecord({ id: "c", consumedAt: "2026-01-20T00:00:00.000Z" }),
    ];
    const stats = buildStats(records);

    expect(stats.monthlyTrend).toEqual([
      { month: "2026-01", count: 2 },
      { month: "2026-03", count: 1 },
    ]);
  });
});
