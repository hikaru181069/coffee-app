import { describe, expect, test } from "vitest";
import { computeRanks } from "./rankings";

describe("computeRanks", () => {
  test("countがすべて異なる場合は単純な連番になる", () => {
    const items = [{ count: 4 }, { count: 3 }, { count: 2 }];
    expect(computeRanks(items)).toEqual([1, 2, 3]);
  });

  test("同率の項目は同じ順位になり、その次は間を空けて連番へ戻る（1224形式）", () => {
    const items = [{ count: 4 }, { count: 4 }, { count: 4 }, { count: 3 }, { count: 2 }];
    expect(computeRanks(items)).toEqual([1, 1, 1, 4, 5]);
  });

  test("複数箇所で同率が発生しても、それぞれ独立して計算される", () => {
    const items = [{ count: 2 }, { count: 2 }, { count: 1 }, { count: 1 }, { count: 1 }];
    expect(computeRanks(items)).toEqual([1, 1, 3, 3, 3]);
  });

  test("要素が1件だけなら1位になる", () => {
    expect(computeRanks([{ count: 5 }])).toEqual([1]);
  });

  test("空配列を渡しても空配列を返す", () => {
    expect(computeRanks([])).toEqual([]);
  });
});
