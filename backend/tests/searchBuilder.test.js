/**
 * core/search/searchBuilder.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数なので、モック無しでテストできる
 * （tests/graphBuilder.test.js / tests/insightBuilder.test.js と同じ方針）。
 */

import { buildSearchResults } from "../core/search/searchBuilder.js";

const ORIGIN_ETHIOPIA = { id: "origin-ethiopia", name: "Ethiopia" };
const ORIGIN_KENYA = { id: "origin-kenya", name: "Kenya" };
const FLAVOR_BERRY = { id: "flavor-berry", name: "Berry" };
const FLAVOR_FLORAL = { id: "flavor-floral", name: "Floral" };
const FLAVOR_CITRUS = { id: "flavor-citrus", name: "Citrus" };

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

describe("空・該当なし", () => {
  test("クエリが空文字なら何も返さない", () => {
    const records = [buildRecord({ origin: ORIGIN_ETHIOPIA })];
    expect(buildSearchResults(records, "")).toEqual({ entities: [], entitiesTruncated: false, records: [] });
  });

  test("記録が0件なら何も返さない", () => {
    expect(buildSearchResults([], "ethiopia")).toEqual({ entities: [], entitiesTruncated: false, records: [] });
  });

  test("一致するものが無ければ空配列を返す", () => {
    const records = [buildRecord({ origin: ORIGIN_ETHIOPIA })];
    expect(buildSearchResults(records, "brazil")).toEqual({ entities: [], entitiesTruncated: false, records: [] });
  });
});

describe("属性ノードの検索", () => {
  test("産地名で部分一致・大文字小文字を区別せず検索できる", () => {
    const records = [buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA })];
    const { entities } = buildSearchResults(records, "ETHIO");

    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({ type: "origin", label: "Ethiopia", recordCount: 1 });
  });

  test("同じ産地の記録が複数あればrecordCountに反映される", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA }),
    ];
    const { entities } = buildSearchResults(records, "ethiopia");

    expect(entities[0].recordCount).toBe(2);
  });

  test("カフェ名でも検索できる（farmと同じ正規化ノード）", () => {
    const records = [buildRecord({ id: "a", cafeName: "Blue Bottle Coffee" })];
    const { entities } = buildSearchResults(records, "blue bottle");

    expect(entities).toHaveLength(1);
    expect(entities[0]).toMatchObject({ type: "cafe", label: "Blue Bottle Coffee", recordCount: 1 });
  });
});

describe("関連するフレーバー・産地", () => {
  test("産地ヒット時は共起するフレーバーを登場回数順に返す", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, flavors: [FLAVOR_BERRY, FLAVOR_FLORAL] }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, flavors: [FLAVOR_BERRY] }),
      buildRecord({ id: "c", origin: ORIGIN_ETHIOPIA, flavors: [FLAVOR_CITRUS] }),
    ];
    const { entities } = buildSearchResults(records, "ethiopia");

    expect(entities[0].relatedType).toBe("flavor");
    expect(entities[0].relatedLabels).toEqual(["Berry", "Floral", "Citrus"]);
  });

  test("フレーバーヒット時は共起する産地を返す", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, flavors: [FLAVOR_BERRY] }),
      buildRecord({ id: "b", origin: ORIGIN_KENYA, flavors: [FLAVOR_BERRY] }),
    ];
    const { entities } = buildSearchResults(records, "berry");

    expect(entities[0].relatedType).toBe("origin");
    expect(entities[0].relatedLabels.sort()).toEqual(["Ethiopia", "Kenya"]);
  });

  test("他の記録と一切共起しなければ空配列を返す", () => {
    const records = [buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA })];
    const { entities } = buildSearchResults(records, "ethiopia");

    expect(entities[0].relatedLabels).toEqual([]);
  });
});

describe("記録タイトルの検索", () => {
  test("タイトルの部分一致で記録自体を返す", () => {
    const records = [
      buildRecord({ id: "a", title: "Ethiopia Guji Natural" }),
      buildRecord({ id: "b", title: "Kenya Nyeri AA" }),
    ];
    const { records: matched } = buildSearchResults(records, "guji");

    expect(matched).toHaveLength(1);
    expect(matched[0].id).toBe("a");
  });

  test("属性ヒットと記録ヒットは同時に返ることがある", () => {
    const records = [
      buildRecord({ id: "a", title: "My Ethiopia Cup", origin: ORIGIN_ETHIOPIA }),
    ];
    const result = buildSearchResults(records, "ethiopia");

    expect(result.entities).toHaveLength(1);
    expect(result.records).toHaveLength(1);
  });
});

describe("2026-08、属性一覧の上限（entitiesTruncated）", () => {
  test("上限（20件）以下ならentitiesTruncatedはfalse", () => {
    const flavors = Array.from({ length: 20 }, (_, i) => ({ id: `flavor-${i}`, name: `Coffee Flavor ${i}` }));
    const records = flavors.map((flavor, i) => buildRecord({ id: `r-${i}`, flavors: [flavor] }));

    const result = buildSearchResults(records, "coffee flavor");

    expect(result.entities).toHaveLength(20);
    expect(result.entitiesTruncated).toBe(false);
  });

  test("上限を超える場合は20件に切り詰め、entitiesTruncated: trueを返す", () => {
    const flavors = Array.from({ length: 21 }, (_, i) => ({ id: `flavor-${i}`, name: `Coffee Flavor ${i}` }));
    const records = flavors.map((flavor, i) => buildRecord({ id: `r-${i}`, flavors: [flavor] }));

    const result = buildSearchResults(records, "coffee flavor");

    expect(result.entities).toHaveLength(20);
    expect(result.entitiesTruncated).toBe(true);
  });
});
