/**
 * core/discover/discoverBuilder.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数なので、モック無しでテストできる
 * （tests/insightBuilder.test.js と同じ方針）。
 */

import { buildOriginDiscovery, buildDiscoverTeaser } from "../core/discover/discoverBuilder.js";

const ORIGIN_ETHIOPIA = { id: "origin-ethiopia", name: "Ethiopia" };
const ORIGIN_KENYA = { id: "origin-kenya", name: "Kenya" };
const PROCESS_NATURAL = { id: "process-natural", name: "Natural" };
const PROCESS_WASHED = { id: "process-washed", name: "Washed" };

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

const CQI_DATASET = {
  entries: [
    { originName: "Ethiopia", processName: "Natural", avgQualityScore: 86.4, sampleSize: 210 },
    { originName: "Kenya", processName: "Natural", avgQualityScore: 83.8, sampleSize: 35 },
    { originName: "Yemen", processName: "Natural", avgQualityScore: 85.0, sampleSize: 15 },
    { originName: "Panama", processName: "Natural", avgQualityScore: 86.1, sampleSize: 35 },
    { originName: "Kenya", processName: "Washed", avgQualityScore: 86.0, sampleSize: 180 },
  ],
};

describe("記録が不十分なとき", () => {
  test("対象産地の記録が0件なら何も提案しない", () => {
    expect(buildOriginDiscovery([], CQI_DATASET, "Ethiopia")).toEqual({ suggestions: [] });
  });

  test("対象産地の記録が1件（閾値未満）なら何も提案しない", () => {
    const records = [buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL })];
    expect(buildOriginDiscovery(records, CQI_DATASET, "Ethiopia")).toEqual({ suggestions: [] });
  });

  test("その産地の精製方法が同率首位のときは断定しない", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, process: PROCESS_WASHED }),
    ];
    expect(buildOriginDiscovery(records, CQI_DATASET, "Ethiopia")).toEqual({ suggestions: [] });
  });
});

describe("提案の生成", () => {
  test("同じ精製方法で品質スコアが高い、まだ試していない産地を提案する", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
    ];

    const { suggestions } = buildOriginDiscovery(records, CQI_DATASET, "Ethiopia");

    // CQIのNatural: Ethiopia(86.4, 自分自身なので除外) > Panama(86.1) > Yemen(85.0) > Kenya(83.8)
    expect(suggestions).toEqual([
      {
        type: "similarProcessOrigin",
        basedOn: { originLabel: "Ethiopia", processLabel: "Natural", count: 2 },
        suggestedOrigin: { label: "Panama", avgQualityScore: 86.1 },
      },
      {
        type: "similarProcessOrigin",
        basedOn: { originLabel: "Ethiopia", processLabel: "Natural", count: 2 },
        suggestedOrigin: { label: "Yemen", avgQualityScore: 85.0 },
      },
    ]);
  });

  test("最大2件までしか提案しない", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
      buildRecord({ id: "c", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
    ];

    const { suggestions } = buildOriginDiscovery(records, CQI_DATASET, "Ethiopia");
    expect(suggestions).toHaveLength(2);
  });

  test("すでに記録した産地は候補から除外する", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
      // Panamaは精製方法が違っても、一度でも記録していれば「未経験」ではない
      buildRecord({ id: "c", origin: { id: "origin-panama", name: "Panama" }, process: PROCESS_WASHED }),
    ];

    const { suggestions } = buildOriginDiscovery(records, CQI_DATASET, "Ethiopia");
    // Panama(86.1)は既に記録済みなので除外され、Yemen(85.0)・Kenya(83.8)が残る
    expect(suggestions.map((s) => s.suggestedOrigin.label)).toEqual(["Yemen", "Kenya"]);
  });

  test("CQIに一致する精製方法のデータが無ければ何も提案しない", () => {
    const records = [
      buildRecord({ id: "a", origin: ORIGIN_KENYA, process: { id: "process-honey", name: "Honey" } }),
      buildRecord({ id: "b", origin: ORIGIN_KENYA, process: { id: "process-honey", name: "Honey" } }),
    ];

    expect(buildOriginDiscovery(records, CQI_DATASET, "Kenya")).toEqual({ suggestions: [] });
  });
});

describe("buildDiscoverTeaser（Home画面用の全産地横断1件）", () => {
  test("どの産地も条件を満たさなければnull", () => {
    const records = [buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL })];
    expect(buildDiscoverTeaser(records, CQI_DATASET)).toEqual({ teaser: null });
  });

  test("複数の産地に候補があるとき、品質スコアが最も高い1件を選ぶ", () => {
    const records = [
      // Ethiopia×Natural → 候補の最高スコアはPanama(86.1)
      buildRecord({ id: "a", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
      buildRecord({ id: "b", origin: ORIGIN_ETHIOPIA, process: PROCESS_NATURAL }),
      // Kenya×Washed → 候補はCQIに無い（Kenya×Washedしかエントリが無く、他産地のWashedデータが無いため空）
      buildRecord({ id: "c", origin: ORIGIN_KENYA, process: PROCESS_WASHED }),
      buildRecord({ id: "d", origin: ORIGIN_KENYA, process: PROCESS_WASHED }),
    ];

    const { teaser } = buildDiscoverTeaser(records, CQI_DATASET);
    expect(teaser).toEqual({
      nodeId: "origin:origin-ethiopia",
      type: "similarProcessOrigin",
      basedOn: { originLabel: "Ethiopia", processLabel: "Natural", count: 2 },
      suggestedOrigin: { label: "Panama", avgQualityScore: 86.1 },
    });
  });
});
