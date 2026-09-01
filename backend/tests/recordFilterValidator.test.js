/**
 * validators/recordFilterValidator.js のユニットテスト。
 *
 * coffeeRecordQueryValidator.js・graphQueryValidator.js・searchService.js
 * の3箇所から共有される中核ロジックだが、これまで間接的なAPIレベルの
 * テストでしか検証されていなかった。ここでは純粋関数として直接テストする。
 */

import { validateRecordFilterQuery } from "../validators/recordFilterValidator.js";

const VALID_ID_1 = "507f1f77bcf86cd799439011";
const VALID_ID_2 = "507f1f77bcf86cd799439012";

describe("recordType", () => {
  test("home/cafeを指定するとfilterに反映される", () => {
    const { details, filter } = validateRecordFilterQuery({ recordType: "home" });
    expect(details).toEqual([]);
    expect(filter.recordType).toBe("home");
  });

  test("不正な値は400相当のdetailsを返す", () => {
    const { details, filter } = validateRecordFilterQuery({ recordType: "office" });
    expect(details).toEqual([{ field: "recordType", message: expect.any(String) }]);
    expect(filter.recordType).toBeUndefined();
  });

  test("未指定なら何もfilterに追加しない", () => {
    const { details, filter } = validateRecordFilterQuery({});
    expect(details).toEqual([]);
    expect(filter).toEqual({});
  });
});

describe("参照系フィルター（産地・品種・精製方法・焙煎度・フレーバー）", () => {
  test("単一IDは等価条件になる", () => {
    const { filter } = validateRecordFilterQuery({ originIds: VALID_ID_1 });
    expect(filter.originId).toBe(VALID_ID_1);
  });

  test("複数IDは$in条件になる", () => {
    const { filter } = validateRecordFilterQuery({ originIds: `${VALID_ID_1},${VALID_ID_2}` });
    expect(filter.originId).toEqual({ $in: [VALID_ID_1, VALID_ID_2] });
  });

  test("ObjectId形式でない値はdetailsに積まれfilterに反映されない", () => {
    const { details, filter } = validateRecordFilterQuery({ originIds: "not-an-id" });
    expect(details).toEqual([{ field: "originIds", message: expect.any(String) }]);
    expect(filter.originId).toBeUndefined();
  });

  test("上限（20件）を超えるとdetailsに積まれる", () => {
    const ids = Array.from({ length: 21 }, (_, i) => VALID_ID_1).join(",");
    const { details, filter } = validateRecordFilterQuery({ originIds: ids });
    expect(details).toEqual([{ field: "originIds", message: expect.any(String) }]);
    expect(filter.originId).toBeUndefined();
  });

  test("varietyIds/flavorIdsは配列フィールド名(varietyIds/flavorIds)のまま条件になる", () => {
    const { filter } = validateRecordFilterQuery({ varietyIds: VALID_ID_1, flavorIds: VALID_ID_1 });
    expect(filter.varietyIds).toBe(VALID_ID_1);
    expect(filter.flavorIds).toBe(VALID_ID_1);
  });

  test("includeReferenceFilters:falseなら参照系フィールドは無視される（graphQueryValidator向け）", () => {
    const { details, filter } = validateRecordFilterQuery(
      { originIds: "not-an-id" },
      { includeReferenceFilters: false },
    );
    expect(details).toEqual([]);
    expect(filter).toEqual({});
  });
});

describe("ratingMin", () => {
  test("1〜5の整数は$gte条件になる", () => {
    const { filter } = validateRecordFilterQuery({ ratingMin: "4" });
    expect(filter.rating).toEqual({ $gte: 4 });
  });

  test("範囲外・非整数はdetailsに積まれる", () => {
    expect(validateRecordFilterQuery({ ratingMin: "0" }).details).toHaveLength(1);
    expect(validateRecordFilterQuery({ ratingMin: "6" }).details).toHaveLength(1);
    expect(validateRecordFilterQuery({ ratingMin: "abc" }).details).toHaveLength(1);
  });
});

describe("日付範囲", () => {
  test("dateFrom/dateToはconsumedAtの$gte/$lteになる", () => {
    const { filter } = validateRecordFilterQuery({ dateFrom: "2026-01-01", dateTo: "2026-01-31" });
    expect(filter.consumedAt.$gte).toEqual(new Date("2026-01-01"));
    expect(filter.consumedAt.$lte).toEqual(new Date("2026-01-31"));
  });

  test("不正な日付形式はdetailsに積まれる", () => {
    const { details } = validateRecordFilterQuery({ dateFrom: "not-a-date" });
    expect(details).toEqual([{ field: "dateFrom", message: expect.any(String) }]);
  });

  test("開始日が終了日より後だとdetailsに積まれる", () => {
    const { details } = validateRecordFilterQuery({ dateFrom: "2026-02-01", dateTo: "2026-01-01" });
    expect(details.some((d) => d.field === "dateFrom")).toBe(true);
  });
});

describe("title（横断検索とフィルターの併用向け）", () => {
  test("大文字小文字を区別しない正規表現条件になる", () => {
    const { filter } = validateRecordFilterQuery({ title: "Ethiopia" });
    expect(filter.title).toEqual({ $regex: "Ethiopia", $options: "i" });
  });

  test("正規表現の特殊文字はエスケープされる", () => {
    const { filter } = validateRecordFilterQuery({ title: "a.b" });
    expect(filter.title.$regex).toBe("a\\.b");
  });

  test("前後の空白のみなら何もfilterに追加しない", () => {
    const { filter } = validateRecordFilterQuery({ title: "   " });
    expect(filter.title).toBeUndefined();
  });

  test("文字列以外はdetailsに積まれる", () => {
    const { details } = validateRecordFilterQuery({ title: { $ne: null } });
    expect(details).toEqual([{ field: "title", message: expect.any(String) }]);
  });
});
