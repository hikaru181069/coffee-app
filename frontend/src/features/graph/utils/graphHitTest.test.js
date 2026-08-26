import { describe, expect, test } from "vitest";
import { findNodeAtGraphPoint } from "./graphHitTest";
import { recordRadius, attributeHalfWidth, attributeHalfHeight } from "./graphNodeSizing";

const RECORD_NODE = { id: "record-1", type: "record", x: 100, y: 100, degree: 0 };
const FLAVOR_NODE = { id: "flavor-1", type: "flavor", x: 300, y: 300, degree: 0 };

describe("findNodeAtGraphPoint - record（円）", () => {
  test("中心をクリックすると見つかる", () => {
    expect(findNodeAtGraphPoint([RECORD_NODE], 100, 100, null)).toBe(RECORD_NODE);
  });

  test("視覚半径のすぐ外側でも、ヒットパディング分は反応する", () => {
    const radius = recordRadius(RECORD_NODE);
    expect(findNodeAtGraphPoint([RECORD_NODE], 100 + radius + 2, 100, null)).toBe(RECORD_NODE);
  });

  test("ヒットパディングを超えた外側では見つからない", () => {
    const radius = recordRadius(RECORD_NODE);
    expect(findNodeAtGraphPoint([RECORD_NODE], 100 + radius + 20, 100, null)).toBeNull();
  });

  test("座標が離れていれば見つからない", () => {
    expect(findNodeAtGraphPoint([RECORD_NODE], 500, 500, null)).toBeNull();
  });
});

describe("findNodeAtGraphPoint - attribute（角丸矩形）", () => {
  test("中心をクリックすると見つかる", () => {
    expect(findNodeAtGraphPoint([FLAVOR_NODE], 300, 300, null)).toBe(FLAVOR_NODE);
  });

  test("半幅のすぐ外側でも、ヒットパディング分は反応する", () => {
    const halfWidth = attributeHalfWidth(FLAVOR_NODE);
    expect(findNodeAtGraphPoint([FLAVOR_NODE], 300 + halfWidth + 2, 300, null)).toBe(FLAVOR_NODE);
  });

  test("半高さを縦方向に超えると見つからない", () => {
    const halfHeight = attributeHalfHeight();
    expect(findNodeAtGraphPoint([FLAVOR_NODE], 300, 300 + halfHeight + 20, null)).toBeNull();
  });
});

describe("findNodeAtGraphPoint - 座標未確定のノード", () => {
  test("x/yがnullのノードはスキップする", () => {
    const pending = { id: "pending", type: "record", x: null, y: null, degree: 0 };
    expect(findNodeAtGraphPoint([pending], 0, 0, null)).toBeNull();
  });
});

describe("findNodeAtGraphPoint - 複数ノード", () => {
  test("該当するノードだけを返す", () => {
    const nodes = [RECORD_NODE, FLAVOR_NODE];
    expect(findNodeAtGraphPoint(nodes, 300, 300, null)).toBe(FLAVOR_NODE);
    expect(findNodeAtGraphPoint(nodes, 100, 100, null)).toBe(RECORD_NODE);
  });
});
