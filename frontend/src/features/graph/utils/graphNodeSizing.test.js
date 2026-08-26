import { describe, expect, test } from "vitest";
import {
  RECORD_BASE_RADIUS,
  ATTRIBUTE_BASE_HALF_WIDTH,
  ATTRIBUTE_HALF_HEIGHT,
  SELECTED_SCALE,
  recordRadius,
  attributeHalfWidth,
  attributeHalfHeight,
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

describe("attributeHalfWidth / attributeHalfHeight", () => {
  test("degreeが0ならベースの半幅のまま", () => {
    expect(attributeHalfWidth({ degree: 0 })).toBe(ATTRIBUTE_BASE_HALF_WIDTH);
  });

  test("degreeが増えるほど半幅が大きくなる", () => {
    expect(attributeHalfWidth({ degree: 6 })).toBeGreaterThan(attributeHalfWidth({ degree: 1 }));
  });

  test("半高さはdegreeに依存せず、選択時のみ拡大する", () => {
    expect(attributeHalfHeight(false)).toBe(ATTRIBUTE_HALF_HEIGHT);
    expect(attributeHalfHeight(true)).toBeCloseTo(ATTRIBUTE_HALF_HEIGHT * SELECTED_SCALE);
  });
});

describe("nodeCollideRadius", () => {
  test("record nodeはrecordRadius相当に、ラベル分の余白が上乗せされる", () => {
    const node = { type: "record", degree: 3 };
    expect(nodeCollideRadius(node)).toBeGreaterThan(recordRadius(node));
  });

  test("attribute nodeはattributeHalfWidth/Heightの対角線相当に、ラベル分の余白が上乗せされる", () => {
    const node = { type: "flavor", degree: 3 };
    const diagonal = Math.hypot(attributeHalfWidth(node), attributeHalfHeight());
    expect(nodeCollideRadius(node)).toBeGreaterThan(diagonal);
  });

  test("degreeが多いノードほど衝突半径も大きくなる（サイズと連動する）", () => {
    const small = nodeCollideRadius({ type: "origin", degree: 1 });
    const large = nodeCollideRadius({ type: "origin", degree: 15 });
    expect(large).toBeGreaterThan(small);
  });
});
