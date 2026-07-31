/**
 * validators/graphQueryValidator.js のユニットテスト。
 */

import { validateGraphQuery } from "../validators/graphQueryValidator.js";

describe("validateGraphQuery", () => {
  test("未指定なら絞り込みなしを返す", () => {
    const { valid, query } = validateGraphQuery({});

    expect(valid).toBe(true);
    expect(query.recordFilter).toEqual({});
    expect(query.nodeTypes).toBeNull();
  });

  test("引数なしでも落ちない", () => {
    expect(validateGraphQuery().valid).toBe(true);
  });

  describe("nodeTypes", () => {
    test("カンマ区切りの文字列を配列へ変換する", () => {
      const { valid, query } = validateGraphQuery({ nodeTypes: "origin,flavor" });

      expect(valid).toBe(true);
      expect(query.nodeTypes).toEqual(["origin", "flavor"]);
    });

    test("配列でも受け付ける（?nodeTypes=a&nodeTypes=b の場合）", () => {
      const { query } = validateGraphQuery({ nodeTypes: ["origin", "process"] });

      expect(query.nodeTypes).toEqual(["origin", "process"]);
    });

    test("前後の空白を無視する", () => {
      const { query } = validateGraphQuery({ nodeTypes: " origin , flavor " });

      expect(query.nodeTypes).toEqual(["origin", "flavor"]);
    });

    test("許可されていない種別は拒否する", () => {
      const result = validateGraphQuery({ nodeTypes: "origin,unknown" });

      expect(result.valid).toBe(false);
      expect(result.details[0].field).toBe("nodeTypes");
    });

    test("recordは指定できない（属性の絞り込み専用のため）", () => {
      expect(validateGraphQuery({ nodeTypes: "record" }).valid).toBe(false);
    });

    test("空文字は「絞り込みなし」として扱う", () => {
      const { query } = validateGraphQuery({ nodeTypes: "" });

      expect(query.nodeTypes).toBeNull();
    });
  });

  describe("記録の絞り込み", () => {
    test("recordTypeを検証する", () => {
      expect(validateGraphQuery({ recordType: "cafe" }).query.recordFilter).toEqual({
        recordType: "cafe",
      });
      expect(validateGraphQuery({ recordType: "office" }).valid).toBe(false);
    });

    test("ratingMinを検証する", () => {
      expect(validateGraphQuery({ ratingMin: "4" }).query.recordFilter).toEqual({
        rating: { $gte: 4 },
      });
      expect(validateGraphQuery({ ratingMin: "9" }).valid).toBe(false);
    });

    test("期間を検証する", () => {
      const { query } = validateGraphQuery({
        dateFrom: "2026-01-01",
        dateTo: "2026-12-31",
      });

      expect(query.recordFilter.consumedAt.$gte).toBeInstanceOf(Date);
      expect(query.recordFilter.consumedAt.$lte).toBeInstanceOf(Date);
    });

    test("originId/flavorIdは受け付けない（docs/api.md GET /graph のクエリに無いため）", () => {
      const { query } = validateGraphQuery({ originId: "507f1f77bcf86cd799439011" });

      // 一覧APIのvalidatorと違い、originIdは無視され filter に含まれない。
      // 不正な値でもエラーにしない(そもそも見ていないフィールドのため)
      expect(query.recordFilter).not.toHaveProperty("originId");
      expect(validateGraphQuery({ originId: "abc" }).valid).toBe(true);
    });
  });

  test("複数の問題をまとめて返す", () => {
    const result = validateGraphQuery({
      nodeTypes: "unknown",
      recordType: "office",
      ratingMin: "9",
    });

    expect(result.details.map((d) => d.field).sort()).toEqual([
      "nodeTypes",
      "ratingMin",
      "recordType",
    ]);
  });
});
