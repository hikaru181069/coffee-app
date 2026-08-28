import { describe, expect, test } from "vitest";
import { buildVisitedByNumericId } from "./visitedOrigins";

const originNode = (overrides = {}) => ({
  id: "origin:1",
  type: "origin",
  label: "Ethiopia",
  metadata: { originId: "1", countryCode: "ET", recordCount: 3 },
  ...overrides,
});

describe("buildVisitedByNumericId", () => {
  test("countryCodeを持つoriginノードをnumeric idキーのMapへ変換する", () => {
    const map = buildVisitedByNumericId([originNode()]);
    expect(map.get("231")).toEqual({ id: "origin:1", label: "Ethiopia", recordCount: 3 });
  });

  test("countryCodeがnullのノードは除外する", () => {
    const map = buildVisitedByNumericId([
      originNode({ id: "origin:2", label: "謎の産地", metadata: { originId: "2", countryCode: null, recordCount: 1 } }),
    ]);
    expect(map.size).toBe(0);
  });

  test("ALPHA2_TO_NUMERICに対応が無いcountryCodeは除外する", () => {
    const map = buildVisitedByNumericId([
      originNode({ metadata: { originId: "1", countryCode: "ZZ", recordCount: 1 } }),
    ]);
    expect(map.size).toBe(0);
  });

  test("複数の産地をそれぞれ別キーで保持する", () => {
    const map = buildVisitedByNumericId([
      originNode(),
      originNode({ id: "origin:2", label: "Kenya", metadata: { originId: "2", countryCode: "KE", recordCount: 5 } }),
    ]);
    expect(map.size).toBe(2);
    expect(map.get("404").label).toBe("Kenya");
  });

  test("空配列を渡すと空のMapを返す", () => {
    expect(buildVisitedByNumericId([]).size).toBe(0);
  });
});
