import { describe, expect, test } from "vitest";
import {
  RECORD_BASE_RADIUS,
  ATTRIBUTE_BASE_RADIUS,
  SELECTED_SCALE,
  recordRadius,
  attributeRadius,
  nodeRadius,
  nodeCollideRadius,
} from "./graphNodeSizing";

describe("recordRadius", () => {
  test("degreeが0ならベースの半径のまま", () => {
    expect(recordRadius({ degree: 0 })).toBe(RECORD_BASE_RADIUS);
  });

  test("degreeが増えるほど半径が大きくなる", () => {
    const low = recordRadius({ degree: 1 });
    const mid = recordRadius({ degree: 6 });
    const high = recordRadius({ degree: 15 });
    expect(mid).toBeGreaterThan(low);
    expect(high).toBeGreaterThan(mid);
  });

  test("degreeが多いほど伸び幅は穏やかになる（sqrtカーブ）", () => {
    const growth1to6 = recordRadius({ degree: 6 }) - recordRadius({ degree: 1 });
    const growth6to11 = recordRadius({ degree: 11 }) - recordRadius({ degree: 6 });
    expect(growth6to11).toBeLessThan(growth1to6);
  });

  test("選択中はSELECTED_SCALE倍になる", () => {
    const base = recordRadius({ degree: 4 }, false);
    const selected = recordRadius({ degree: 4 }, true);
    expect(selected).toBeCloseTo(base * SELECTED_SCALE);
  });

  test("degreeが極端に多くても青天井にはならない（安全弁）", () => {
    const huge = recordRadius({ degree: 10000 });
    const cappedInput = recordRadius({ degree: 60 });
    expect(huge).toBeCloseTo(cappedInput);
  });
});

describe("attributeRadius", () => {
  test("degreeが0ならベースの半径のまま", () => {
    expect(attributeRadius({ degree: 0 })).toBe(ATTRIBUTE_BASE_RADIUS);
  });

  test("degreeが増えるほど半径が大きくなる", () => {
    expect(attributeRadius({ degree: 6 })).toBeGreaterThan(attributeRadius({ degree: 1 }));
  });

  test("選択中はSELECTED_SCALE倍になる", () => {
    const base = attributeRadius({ degree: 4 }, false);
    const selected = attributeRadius({ degree: 4 }, true);
    expect(selected).toBeCloseTo(base * SELECTED_SCALE);
  });
});

describe("nodeRadius", () => {
  test("record nodeはrecordRadiusと同じ", () => {
    const node = { type: "record", degree: 3 };
    expect(nodeRadius(node)).toBe(recordRadius(node));
  });

  test("attribute nodeはattributeRadiusと同じ", () => {
    const node = { type: "flavor", degree: 3 };
    expect(nodeRadius(node)).toBe(attributeRadius(node));
  });
});

describe("nodeCollideRadius", () => {
  test("record nodeはrecordRadius相当に、ラベル分の余白が上乗せされる", () => {
    const node = { type: "record", degree: 3 };
    expect(nodeCollideRadius(node)).toBeGreaterThan(recordRadius(node));
  });

  test("attribute nodeはattributeRadius相当に、ラベル分の余白が上乗せされる", () => {
    const node = { type: "flavor", degree: 3 };
    expect(nodeCollideRadius(node)).toBeGreaterThan(attributeRadius(node));
  });

  test("degreeが多いノードほど衝突半径も大きくなる（サイズと連動する）", () => {
    const small = nodeCollideRadius({ type: "origin", degree: 1 });
    const large = nodeCollideRadius({ type: "origin", degree: 15 });
    expect(large).toBeGreaterThan(small);
  });
});
