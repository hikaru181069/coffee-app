/**
 * validators/coffeeRecordQueryValidator.js のユニットテスト。
 *
 * クエリはすべて文字列で届くので、検証と同時に
 * 数値・日付・MongoDBの条件オブジェクトへ変換している。
 * APIテストでも間接的に確認しているが、境界値はここで細かく見る。
 */

import {
  validateCoffeeRecordListQuery,
  validateMasterDataQuery,
} from "../validators/coffeeRecordQueryValidator.js";

const VALID_ID = "507f1f77bcf86cd799439011";

describe("validateCoffeeRecordListQuery", () => {
  test("未指定なら既定値を返す", () => {
    const { valid, query } = validateCoffeeRecordListQuery({});

    expect(valid).toBe(true);
    expect(query.page).toBe(1);
    expect(query.limit).toBe(20);
    expect(query.sort).toEqual({ consumedAt: -1 });
    expect(query.filter).toEqual({});
  });

  test("引数なしでも落ちない", () => {
    expect(validateCoffeeRecordListQuery().valid).toBe(true);
  });

  describe("page / limit", () => {
    test("文字列の数値を整数へ変換する", () => {
      const { query } = validateCoffeeRecordListQuery({ page: "3", limit: "50" });

      expect(query.page).toBe(3);
      expect(query.limit).toBe(50);
    });

    test("0以下や小数は拒否する", () => {
      expect(validateCoffeeRecordListQuery({ page: "0" }).valid).toBe(false);
      expect(validateCoffeeRecordListQuery({ page: "-1" }).valid).toBe(false);
      expect(validateCoffeeRecordListQuery({ page: "1.5" }).valid).toBe(false);
      expect(validateCoffeeRecordListQuery({ limit: "0" }).valid).toBe(false);
    });

    test("数値でない値は拒否する", () => {
      expect(validateCoffeeRecordListQuery({ page: "abc" }).valid).toBe(false);
    });

    test("limitの上限は100（全件取得を防ぐ）", () => {
      expect(validateCoffeeRecordListQuery({ limit: "100" }).valid).toBe(true);
      expect(validateCoffeeRecordListQuery({ limit: "101" }).valid).toBe(false);
    });
  });

  describe("sort", () => {
    test("許可した値だけを受け入れる", () => {
      expect(validateCoffeeRecordListQuery({ sort: "rating" }).query.sort).toEqual({
        rating: 1,
      });
      expect(validateCoffeeRecordListQuery({ sort: "-rating" }).query.sort).toEqual({
        rating: -1,
      });
    });

    test("任意のフィールド名は指定できない", () => {
      // 許可リスト方式にしていないと、内部フィールドで並べ替えられてしまう
      expect(validateCoffeeRecordListQuery({ sort: "userId" }).valid).toBe(false);
      expect(validateCoffeeRecordListQuery({ sort: "{$where:1}" }).valid).toBe(false);
    });
  });

  describe("フィルター", () => {
    test("recordTypeは home / cafe のみ", () => {
      expect(validateCoffeeRecordListQuery({ recordType: "cafe" }).query.filter).toEqual({
        recordType: "cafe",
      });
      expect(validateCoffeeRecordListQuery({ recordType: "office" }).valid).toBe(false);
    });

    test("originIdはObjectIdの形式を確認する", () => {
      expect(validateCoffeeRecordListQuery({ originId: VALID_ID }).valid).toBe(true);
      expect(validateCoffeeRecordListQuery({ originId: "abc" }).valid).toBe(false);
    });

    test("flavorIdは配列フィールドへの「含む」条件になる", () => {
      const { query } = validateCoffeeRecordListQuery({ flavorId: VALID_ID });

      expect(query.filter).toEqual({ flavorIds: VALID_ID });
    });

    test("ratingMinは1〜5の整数で $gte になる", () => {
      expect(validateCoffeeRecordListQuery({ ratingMin: "4" }).query.filter).toEqual({
        rating: { $gte: 4 },
      });
      expect(validateCoffeeRecordListQuery({ ratingMin: "0" }).valid).toBe(false);
      expect(validateCoffeeRecordListQuery({ ratingMin: "6" }).valid).toBe(false);
    });
  });

  describe("期間", () => {
    test("dateFromだけなら $gte のみ", () => {
      const { query } = validateCoffeeRecordListQuery({ dateFrom: "2026-01-01" });

      expect(query.filter.consumedAt.$gte).toBeInstanceOf(Date);
      expect(query.filter.consumedAt.$lte).toBeUndefined();
    });

    test("両方指定すると範囲条件になる", () => {
      const { query } = validateCoffeeRecordListQuery({
        dateFrom: "2026-01-01",
        dateTo: "2026-12-31",
      });

      expect(query.filter.consumedAt.$gte).toBeInstanceOf(Date);
      expect(query.filter.consumedAt.$lte).toBeInstanceOf(Date);
    });

    test("日付として解釈できない値は拒否する", () => {
      expect(validateCoffeeRecordListQuery({ dateFrom: "きのう" }).valid).toBe(false);
    });

    test("開始日が終了日より後なら拒否する", () => {
      const result = validateCoffeeRecordListQuery({
        dateFrom: "2026-12-31",
        dateTo: "2026-01-01",
      });

      expect(result.valid).toBe(false);
      expect(result.details[0].field).toBe("dateFrom");
    });
  });

  test("複数の問題をまとめて返す", () => {
    const result = validateCoffeeRecordListQuery({
      page: "0",
      recordType: "office",
      ratingMin: "9",
    });

    expect(result.details.map((d) => d.field).sort()).toEqual([
      "page",
      "ratingMin",
      "recordType",
    ]);
  });
});

describe("validateMasterDataQuery", () => {
  test("未指定なら絞り込み無し", () => {
    const { valid, query } = validateMasterDataQuery({});

    expect(valid).toBe(true);
    expect(query.search).toBeUndefined();
    expect(query.limit).toBeUndefined();
  });

  test("searchをそのまま渡す（エスケープはrepositoryの担当）", () => {
    expect(validateMasterDataQuery({ search: "eth" }).query.search).toBe("eth");
  });

  test("limitは1〜100", () => {
    expect(validateMasterDataQuery({ limit: "10" }).query.limit).toBe(10);
    expect(validateMasterDataQuery({ limit: "0" }).valid).toBe(false);
    expect(validateMasterDataQuery({ limit: "101" }).valid).toBe(false);
  });
});
