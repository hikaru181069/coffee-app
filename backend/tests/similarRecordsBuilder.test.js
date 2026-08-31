/**
 * core/similarRecords/similarRecordsBuilder.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数なので、モック無しでテストできる。
 * graphBuilder.test.js と同じ、services/coffee/coffeeRecordSerializer.js
 * が返す形と同じプレーンオブジェクトを直接組み立てて渡す。
 */

import { buildSimilarRecords } from "../core/similarRecords/similarRecordsBuilder.js";

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

const ETHIOPIA = { id: "origin-eth", name: "Ethiopia" };
const NATURAL = { id: "process-natural", name: "Natural" };
const WASHED = { id: "process-washed", name: "Washed" };
const BERRY = { id: "flavor-berry", name: "Berry" };
const GUATEMALA = { id: "origin-gt", name: "Guatemala" };

describe("buildSimilarRecords", () => {
  test("対象記録に属性が無ければ空配列を返す", () => {
    const target = buildRecord({ id: "a" });
    const other = buildRecord({ id: "b", origin: ETHIOPIA, process: NATURAL });

    const { similarRecords } = buildSimilarRecords([target, other], "a");

    expect(similarRecords).toEqual([]);
  });

  test("共有する属性が閾値（2件）未満なら候補に含めない", () => {
    const target = buildRecord({ id: "a", origin: ETHIOPIA });
    // originだけ一致（1件）。閾値未満のため含まれない
    const other = buildRecord({ id: "b", origin: ETHIOPIA, process: WASHED });

    const { similarRecords } = buildSimilarRecords([target, other], "a");

    expect(similarRecords).toEqual([]);
  });

  test("2つ以上の属性を共有する記録を候補として返す", () => {
    const target = buildRecord({ id: "a", origin: ETHIOPIA, process: NATURAL, flavors: [BERRY] });
    const other = buildRecord({ id: "b", origin: ETHIOPIA, process: NATURAL });

    const { similarRecords } = buildSimilarRecords([target, other], "a");

    expect(similarRecords).toHaveLength(1);
    expect(similarRecords[0].record.id).toBe("b");
    expect(similarRecords[0].sharedCount).toBe(2);
    expect(similarRecords[0].sharedAttributes).toEqual(
      expect.arrayContaining([
        { type: "origin", label: "Ethiopia" },
        { type: "process", label: "Natural" },
      ]),
    );
  });

  test("対象記録自身は候補に含まれない", () => {
    const target = buildRecord({ id: "a", origin: ETHIOPIA, process: NATURAL });

    const { similarRecords } = buildSimilarRecords([target], "a");

    expect(similarRecords).toEqual([]);
  });

  test("共有数が多い順に並び、同数ならratingの高い順になる", () => {
    const target = buildRecord({ id: "a", origin: ETHIOPIA, process: NATURAL, flavors: [BERRY] });
    // 3件共有（最上位）
    const bestMatch = buildRecord({
      id: "b",
      origin: ETHIOPIA,
      process: NATURAL,
      flavors: [BERRY],
      rating: 3,
    });
    // 2件共有・rating高い
    const tieHighRating = buildRecord({ id: "c", origin: ETHIOPIA, process: NATURAL, rating: 5 });
    // 2件共有・rating低い
    const tieLowRating = buildRecord({ id: "d", origin: ETHIOPIA, process: NATURAL, rating: 2 });

    const { similarRecords } = buildSimilarRecords(
      [target, bestMatch, tieHighRating, tieLowRating],
      "a",
    );

    expect(similarRecords.map((s) => s.record.id)).toEqual(["b", "c", "d"]);
  });

  test("関係の無い記録（共有属性ゼロ）は候補に含まれない", () => {
    const target = buildRecord({ id: "a", origin: ETHIOPIA, process: NATURAL });
    const unrelated = buildRecord({ id: "b", origin: GUATEMALA, process: WASHED });

    const { similarRecords } = buildSimilarRecords([target, unrelated], "a");

    expect(similarRecords).toEqual([]);
  });

  test("最大5件までに絞る", () => {
    const target = buildRecord({ id: "a", origin: ETHIOPIA, process: NATURAL });
    const others = Array.from({ length: 8 }, (_, index) =>
      buildRecord({ id: `other-${index}`, origin: ETHIOPIA, process: NATURAL }),
    );

    const { similarRecords } = buildSimilarRecords([target, ...others], "a");

    expect(similarRecords).toHaveLength(5);
  });
});
