/**
 * core/discoveries/discoveryBuilder.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数なので、モック無しでテストできる。
 * similarRecordsBuilder.test.js と同じ、services/coffee/coffeeRecordSerializer.js
 * が返す形と同じプレーンオブジェクトを直接組み立てて渡す。
 */

import { buildDiscoveries } from "../core/discoveries/discoveryBuilder.js";

/** 「コーヒーの詳細」1グループ分のテスト用オブジェクトを作る */
const component = (overrides = {}) => ({ origin: null, farmName: "", varieties: [], process: null, ...overrides });

/** テスト用の最小限の記録を作る。必要な項目だけ上書きする */
const buildRecord = (overrides = {}) => ({
  id: "record-1",
  title: "Ethiopia Natural",
  consumedAt: "2026-07-31T09:00:00.000Z",
  recordType: "home",
  rating: 5,
  notes: "",
  components: [],
  roastLevel: null,
  flavors: [],
  cafeName: "",
  ...overrides,
});

const ETHIOPIA = { id: "origin-eth", name: "Ethiopia" };
const GUATEMALA = { id: "origin-gt", name: "Guatemala" };
const BERRY = { id: "flavor-berry", name: "Berry" };
const LIGHT_ROAST = { id: "roast-light", name: "Light" };

describe("buildDiscoveries", () => {
  test("既存記録が無い状態で初めての産地を記録すると初登場として検出する", () => {
    const newRecord = buildRecord({ id: "new", components: [component({ origin: ETHIOPIA })] });

    const { discoveries } = buildDiscoveries([], newRecord);

    expect(discoveries).toEqual([
      { type: "firstAppearance", nodeType: "origin", nodeId: "origin:origin-eth", label: "Ethiopia", recordCount: 1 },
    ]);
  });

  test("既に1件ある属性で2件目を記録するとマイルストーン（2件目）として検出する", () => {
    const existing = [buildRecord({ id: "a", components: [component({ origin: ETHIOPIA })] })];
    const newRecord = buildRecord({ id: "new", components: [component({ origin: ETHIOPIA })] });

    const { discoveries } = buildDiscoveries(existing, newRecord);

    expect(discoveries).toEqual([
      { type: "milestone", nodeType: "origin", nodeId: "origin:origin-eth", label: "Ethiopia", recordCount: 2 },
    ]);
  });

  test("区切りの良い件数（2,3,5,10）以外に到達したときは検出しない", () => {
    // 既に3件あり、これで4件目（区切りの良い数値ではない）
    const existing = Array.from({ length: 3 }, (_, i) =>
      buildRecord({ id: `existing-${i}`, components: [component({ origin: ETHIOPIA })] }),
    );
    const newRecord = buildRecord({ id: "new", components: [component({ origin: ETHIOPIA })] });

    const { discoveries } = buildDiscoveries(existing, newRecord);

    expect(discoveries).toEqual([]);
  });

  test("3件目・5件目はマイルストーンとして検出する", () => {
    const twoExisting = Array.from({ length: 2 }, (_, i) =>
      buildRecord({ id: `e2-${i}`, components: [component({ origin: ETHIOPIA })] }),
    );
    const newRecordThird = buildRecord({ id: "new-3", components: [component({ origin: ETHIOPIA })] });
    expect(buildDiscoveries(twoExisting, newRecordThird).discoveries).toEqual([
      { type: "milestone", nodeType: "origin", nodeId: "origin:origin-eth", label: "Ethiopia", recordCount: 3 },
    ]);

    const fourExisting = Array.from({ length: 4 }, (_, i) =>
      buildRecord({ id: `e4-${i}`, components: [component({ origin: ETHIOPIA })] }),
    );
    const newRecordFifth = buildRecord({ id: "new-5", components: [component({ origin: ETHIOPIA })] });
    expect(buildDiscoveries(fourExisting, newRecordFifth).discoveries).toEqual([
      { type: "milestone", nodeType: "origin", nodeId: "origin:origin-eth", label: "Ethiopia", recordCount: 5 },
    ]);
  });

  test("同じ記録内で同じ属性が重複しても1回だけ数える", () => {
    // ブレンド記録で同じ産地が2つのcomponentに登場するケース
    const existing = [
      buildRecord({
        id: "a",
        components: [component({ origin: ETHIOPIA }), component({ origin: ETHIOPIA })],
      }),
    ];
    const newRecord = buildRecord({ id: "new", components: [component({ origin: ETHIOPIA })] });

    // 既存1件（重複排除済み）+ 今回1件 = 2件目のマイルストーン
    const { discoveries } = buildDiscoveries(existing, newRecord);

    expect(discoveries).toEqual([
      { type: "milestone", nodeType: "origin", nodeId: "origin:origin-eth", label: "Ethiopia", recordCount: 2 },
    ]);
  });

  test("notesのキーワードがflavorへ統合される場合、flavor側でカウントされる", () => {
    const flavorsByNormalizedName = new Map([["chocolate", { id: "flavor-choc", name: "Chocolate" }]]);
    const existing = [
      buildRecord({ id: "a", notes: "チョコレートのような甘さ", flavors: [] }),
    ];
    const newRecord = buildRecord({ id: "new", notes: "今日もチョコレートのような味わい", flavors: [] });

    const { discoveries } = buildDiscoveries(existing, newRecord, flavorsByNormalizedName);

    expect(discoveries).toEqual([
      { type: "milestone", nodeType: "flavor", nodeId: "flavor:flavor-choc", label: "Chocolate", recordCount: 2 },
    ]);
  });

  test("keyword型の属性は発見として検出しない", () => {
    const newRecord = buildRecord({ id: "new", notes: "とても甘いコーヒーだった" });

    const { discoveries } = buildDiscoveries([], newRecord);

    expect(discoveries.some((d) => d.nodeType === "keyword")).toBe(false);
  });

  test("1回の保存で複数の発見がある場合、最大3件に絞りfirstAppearance優先・milestoneはrecordCount降順", () => {
    // 既存: Ethiopia 2件、Guatemala 4件、Berry 9件（いずれもnewRecordで
    // 到達する件数が区切りの良い値になるよう調整）
    const existing = [
      ...Array.from({ length: 2 }, (_, i) => buildRecord({ id: `eth-${i}`, components: [component({ origin: ETHIOPIA })] })),
      ...Array.from({ length: 4 }, (_, i) => buildRecord({ id: `gt-${i}`, components: [component({ origin: GUATEMALA })] })),
      ...Array.from({ length: 9 }, (_, i) => buildRecord({ id: `berry-${i}`, flavors: [BERRY] })),
    ];
    const newRecord = buildRecord({
      id: "new",
      components: [component({ origin: ETHIOPIA }), component({ origin: GUATEMALA })],
      flavors: [BERRY],
      roastLevel: LIGHT_ROAST, // 未登場のroastLevel（別種別、firstAppearance）
    });

    const { discoveries } = buildDiscoveries(existing, newRecord);

    // firstAppearance(roastLevel) が先頭、続いてmilestoneがrecordCount降順（10, 5, 3）のうち上位2件のみ
    expect(discoveries).toHaveLength(3);
    expect(discoveries[0]).toEqual(
      expect.objectContaining({ type: "firstAppearance", nodeType: "roastLevel" }),
    );
    expect(discoveries[1]).toEqual(expect.objectContaining({ type: "milestone", recordCount: 10 }));
    expect(discoveries[2]).toEqual(expect.objectContaining({ type: "milestone", recordCount: 5 }));
  });
});
