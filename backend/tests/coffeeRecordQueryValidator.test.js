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

    test("originIdsはObjectIdの形式を確認する", () => {
      expect(validateCoffeeRecordListQuery({ originIds: VALID_ID }).valid).toBe(true);
      expect(validateCoffeeRecordListQuery({ originIds: "abc" }).valid).toBe(false);
    });

    test("originIdsを1件だけ指定すると等価条件になる", () => {
      const { query } = validateCoffeeRecordListQuery({ originIds: VALID_ID });

      expect(query.filter).toEqual({ originId: VALID_ID });
    });

    test("originIdsをカンマ区切りで複数指定すると$in条件になる（複数選択フィルター）", () => {
      const otherId = "507f1f77bcf86cd799439012";
      const { query } = validateCoffeeRecordListQuery({ originIds: `${VALID_ID},${otherId}` });

      expect(query.filter).toEqual({ originId: { $in: [VALID_ID, otherId] } });
    });

    test("flavorIdsは配列フィールドへの「いずれかを含む」条件になる", () => {
      const { query } = validateCoffeeRecordListQuery({ flavorIds: VALID_ID });

      expect(query.filter).toEqual({ flavorIds: VALID_ID });
    });

    test("21件以上のIDは拒否する（$inの暴走防止）", () => {
      const tooMany = Array.from({ length: 21 }, (_, i) => VALID_ID.slice(0, -2) + String(i).padStart(2, "0")).join(",");
      const result = validateCoffeeRecordListQuery({ originIds: tooMany });

      expect(result.valid).toBe(false);
      expect(result.details[0].field).toBe("originIds");
    });

    test("processIds / roastLevelIds / varietyIdsも同じ形式で受け付ける", () => {
      const { query } = validateCoffeeRecordListQuery({
        processIds: VALID_ID,
        roastLevelIds: VALID_ID,
        varietyIds: VALID_ID,
      });

      expect(query.filter).toEqual({
        processId: VALID_ID,
        roastLevelId: VALID_ID,
        varietyIds: VALID_ID,
      });
    });

    test("titleは部分一致の正規表現条件になる", () => {
      const { query } = validateCoffeeRecordListQuery({ title: "Ethiopia" });

      expect(query.filter.title).toEqual({ $regex: "Ethiopia", $options: "i" });
    });

    test("titleの正規表現特殊文字はエスケープされる", () => {
      const { query } = validateCoffeeRecordListQuery({ title: "a.b*c" });

      expect(query.filter.title.$regex).toBe("a\\.b\\*c");
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
