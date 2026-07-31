/**
 * validators/coffeeRecordValidator.js のユニットテスト。
 *
 * ここはHTTP境界の門番。壊れた入力を400として返せず素通しすると、
 * Mongooseの CastError になって500を返してしまう。
 */

import {
  validateCreateCoffeeRecord,
  validateUpdateCoffeeRecord,
  pickCoffeeRecordFields,
} from "../validators/coffeeRecordValidator.js";

const VALID_ID = "507f1f77bcf86cd799439011";

const validBody = (overrides = {}) => ({
  title: "Ethiopia Natural",
  consumedAt: "2026-07-31T09:00:00.000Z",
  recordType: "home",
  ...overrides,
});

/** エラーになったフィールド名の一覧を取り出す */
const fieldsOf = (result) => result.details.map((detail) => detail.field).sort();

describe("validateCreateCoffeeRecord", () => {
  test("必須項目がそろっていれば通る", () => {
    expect(validateCreateCoffeeRecord(validBody()).valid).toBe(true);
  });

  test("空の本文では必須3項目がエラーになる", () => {
    const result = validateCreateCoffeeRecord({});

    expect(result.valid).toBe(false);
    expect(fieldsOf(result)).toEqual(["consumedAt", "recordType", "title"]);
  });

  test("引数なしでも落ちない", () => {
    expect(validateCreateCoffeeRecord().valid).toBe(false);
  });

  test("titleが空白のみならエラー", () => {
    expect(fieldsOf(validateCreateCoffeeRecord(validBody({ title: "   " })))).toContain(
      "title",
    );
  });

  test("titleが120文字を超えるとエラー", () => {
    expect(
      validateCreateCoffeeRecord(validBody({ title: "a".repeat(120) })).valid,
    ).toBe(true);
    expect(
      validateCreateCoffeeRecord(validBody({ title: "a".repeat(121) })).valid,
    ).toBe(false);
  });

  test("日付として解釈できない値はエラー", () => {
    expect(
      fieldsOf(validateCreateCoffeeRecord(validBody({ consumedAt: "きのう" }))),
    ).toContain("consumedAt");
  });

  test("recordTypeは home / cafe のみ", () => {
    expect(validateCreateCoffeeRecord(validBody({ recordType: "cafe" })).valid).toBe(
      true,
    );
    expect(validateCreateCoffeeRecord(validBody({ recordType: "office" })).valid).toBe(
      false,
    );
  });

  describe("rating", () => {
    test("未指定・null は許可する（未評価）", () => {
      expect(validateCreateCoffeeRecord(validBody()).valid).toBe(true);
      expect(validateCreateCoffeeRecord(validBody({ rating: null })).valid).toBe(true);
    });

    test("1〜5の整数を許可する", () => {
      for (const rating of [1, 3, 5]) {
        expect(validateCreateCoffeeRecord(validBody({ rating })).valid).toBe(true);
      }
    });

    test("範囲外・小数・文字列は拒否する", () => {
      for (const rating of [0, 6, 3.5, "5"]) {
        expect(validateCreateCoffeeRecord(validBody({ rating })).valid).toBe(false);
      }
    });
  });

  describe("マスターデータへの参照", () => {
    test("正しいObjectId文字列を受け入れる", () => {
      const body = validBody({
        originId: VALID_ID,
        processId: VALID_ID,
        roastLevelId: VALID_ID,
        varietyIds: [VALID_ID],
        flavorIds: [VALID_ID, VALID_ID],
      });

      expect(validateCreateCoffeeRecord(body).valid).toBe(true);
    });

    test("未選択（null / 空文字 / 空配列）を許可する", () => {
      const body = validBody({
        originId: null,
        processId: "",
        varietyIds: [],
        flavorIds: [],
      });

      expect(validateCreateCoffeeRecord(body).valid).toBe(true);
    });

    test("不正なIDは拒否する（500ではなく400にするため）", () => {
      expect(
        fieldsOf(validateCreateCoffeeRecord(validBody({ originId: "abc" }))),
      ).toContain("originId");
    });

    test("配列の中に1つでも不正なIDがあれば拒否する", () => {
      expect(
        fieldsOf(
          validateCreateCoffeeRecord(validBody({ flavorIds: [VALID_ID, "abc"] })),
        ),
      ).toContain("flavorIds");
    });

    test("配列であるべき項目に配列以外が来たら拒否する", () => {
      expect(
        fieldsOf(validateCreateCoffeeRecord(validBody({ flavorIds: VALID_ID }))),
      ).toContain("flavorIds");
    });
  });

  test("複数の問題をまとめて返す（1つずつ直させない）", () => {
    const result = validateCreateCoffeeRecord({
      title: "",
      recordType: "office",
      rating: 9,
    });

    expect(fieldsOf(result)).toEqual(["consumedAt", "rating", "recordType", "title"]);
  });
});

describe("validateUpdateCoffeeRecord", () => {
  test("送られてきた項目だけを検証する", () => {
    expect(validateUpdateCoffeeRecord({ rating: 4 }).valid).toBe(true);
  });

  test("空の本文は拒否する", () => {
    const result = validateUpdateCoffeeRecord({});

    expect(result.valid).toBe(false);
    expect(fieldsOf(result)).toEqual(["body"]);
  });

  test("送られてきた必須項目を空にはできない", () => {
    expect(validateUpdateCoffeeRecord({ title: "" }).valid).toBe(false);
    expect(validateUpdateCoffeeRecord({ consumedAt: null }).valid).toBe(false);
    expect(validateUpdateCoffeeRecord({ recordType: "" }).valid).toBe(false);
  });

  test("送っていない必須項目はエラーにしない", () => {
    // title だけ送っても consumedAt / recordType のエラーは出ない
    expect(validateUpdateCoffeeRecord({ title: "Kenya AA" }).valid).toBe(true);
  });

  test("null を明示的に送って選択を外せる", () => {
    expect(validateUpdateCoffeeRecord({ originId: null }).valid).toBe(true);
    expect(validateUpdateCoffeeRecord({ rating: null }).valid).toBe(true);
  });

  test("不正なIDは拒否する", () => {
    expect(validateUpdateCoffeeRecord({ processId: "abc" }).valid).toBe(false);
  });
});

describe("pickCoffeeRecordFields", () => {
  test("書き込んでよい項目だけを抜き出す", () => {
    const result = pickCoffeeRecordFields(validBody({ rating: 5, notes: "おいしい" }));

    expect(Object.keys(result).sort()).toEqual([
      "consumedAt",
      "notes",
      "rating",
      "recordType",
      "title",
    ]);
  });

  test("userId を本文から受け取らない（認証情報から設定するため）", () => {
    const result = pickCoffeeRecordFields(
      validBody({ userId: "507f1f77bcf86cd799439099" }),
    );

    expect(result).not.toHaveProperty("userId");
  });

  test("_id や createdAt などの内部項目も捨てる", () => {
    const result = pickCoffeeRecordFields(
      validBody({ _id: VALID_ID, createdAt: "2020-01-01", isAdmin: true }),
    );

    expect(result).not.toHaveProperty("_id");
    expect(result).not.toHaveProperty("createdAt");
    expect(result).not.toHaveProperty("isAdmin");
  });

  test("送られていない項目は結果に含めない（部分更新のため）", () => {
    const result = pickCoffeeRecordFields({ rating: 3 });

    expect(result).toEqual({ rating: 3 });
  });
});
