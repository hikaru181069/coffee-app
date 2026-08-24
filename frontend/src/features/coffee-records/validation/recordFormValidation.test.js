/**
 * validateRecordForm / hasErrors / toApiPayload のテスト。
 *
 * DOM・APIに依存しない純粋関数なので、モック無しでテストできる
 * （backend/tests/coffeeRecordValidator.test.jsと同じ方針）。
 */
import { describe, expect, test } from "vitest";

import { hasErrors, toApiPayload, validateRecordForm } from "./recordFormValidation";
import { TASTE_AXES } from "../utils/recordFormat";

// 実際の翻訳文言は問わず、どのフィールドにエラーが出たかだけを確認するため、
// キーをそのまま返す最小限のモック
const t = (key) => key;

const buildValues = (overrides = {}) => ({
  title: "Ethiopia Natural",
  consumedAt: "2026-07-31T09:00:00.000Z",
  recordType: "home",
  rating: "",
  notes: "",
  cafeName: "",
  roasterName: "",
  farmName: "",
  originId: "",
  varietyIds: [],
  processId: "",
  roastLevelId: "",
  flavorIds: [],
  ...overrides,
});

describe("validateRecordForm", () => {
  test("必須項目が揃っていればエラー無し", () => {
    const errors = validateRecordForm(buildValues(), t);
    expect(hasErrors(errors)).toBe(false);
  });

  test("titleが空ならエラー", () => {
    const errors = validateRecordForm(buildValues({ title: "  " }), t);
    expect(errors.title).toBe("validation.titleRequired");
  });

  test("titleが上限文字数を超えるとエラー", () => {
    const errors = validateRecordForm(buildValues({ title: "a".repeat(121) }), t);
    expect(errors.title).toBe("validation.maxLength");
  });

  test("consumedAtが未指定ならエラー", () => {
    const errors = validateRecordForm(buildValues({ consumedAt: "" }), t);
    expect(errors.consumedAt).toBe("validation.dateRequired");
  });

  test("consumedAtが不正な日付文字列ならエラー", () => {
    const errors = validateRecordForm(buildValues({ consumedAt: "not-a-date" }), t);
    expect(errors.consumedAt).toBe("validation.dateInvalid");
  });

  test("recordTypeがhome/cafe以外ならエラー", () => {
    const errors = validateRecordForm(buildValues({ recordType: "" }), t);
    expect(errors.recordType).toBe("validation.recordTypeRequired");
  });

  test("ratingが未評価（空文字）ならエラーにしない", () => {
    const errors = validateRecordForm(buildValues({ rating: "" }), t);
    expect(errors.rating).toBeUndefined();
  });

  test("ratingが範囲外（0や6）ならエラー", () => {
    expect(validateRecordForm(buildValues({ rating: "0" }), t).rating).toBe("validation.ratingRange");
    expect(validateRecordForm(buildValues({ rating: "6" }), t).rating).toBe("validation.ratingRange");
  });

  test("notes等の任意項目が上限文字数を超えるとエラー", () => {
    const errors = validateRecordForm(buildValues({ notes: "a".repeat(2001) }), t);
    expect(errors.notes).toBe("validation.maxLength");
  });

  describe.each(TASTE_AXES)("味覚グラフ: $field", ({ field }) => {
    test("未評価（空文字）ならエラーにしない", () => {
      const errors = validateRecordForm(buildValues({ [field]: "" }), t);
      expect(errors[field]).toBeUndefined();
    });

    test("範囲外（0や6）ならエラー", () => {
      expect(validateRecordForm(buildValues({ [field]: "0" }), t)[field]).toBe(
        "validation.ratingRange",
      );
      expect(validateRecordForm(buildValues({ [field]: "6" }), t)[field]).toBe(
        "validation.ratingRange",
      );
    });
  });
});

describe("toApiPayload", () => {
  test("前後の空白をtrimし、数値・null・配列へ変換する", () => {
    const payload = toApiPayload(
      buildValues({
        title: "  Ethiopia Natural  ",
        rating: "5",
        notes: "  美味しい  ",
        originId: "origin-1",
      }),
    );

    expect(payload.title).toBe("Ethiopia Natural");
    expect(payload.rating).toBe(5);
    expect(payload.notes).toBe("美味しい");
    expect(payload.originId).toBe("origin-1");
  });

  test("ratingが空文字ならnullにする（未評価）", () => {
    const payload = toApiPayload(buildValues({ rating: "" }));
    expect(payload.rating).toBeNull();
  });

  test("recordTypeがhomeのときcafeNameを送らない", () => {
    const payload = toApiPayload(buildValues({ recordType: "home", cafeName: "Blue Bottle Coffee" }));
    expect(payload.cafeName).toBe("");
  });

  test("recordTypeがcafeのときcafeNameを送る", () => {
    const payload = toApiPayload(buildValues({ recordType: "cafe", cafeName: "Blue Bottle Coffee" }));
    expect(payload.cafeName).toBe("Blue Bottle Coffee");
  });

  test("未選択の参照項目は空文字ではなくnullにする（サーバーが選択解除として扱うため）", () => {
    const payload = toApiPayload(buildValues({ originId: "", processId: "", roastLevelId: "" }));
    expect(payload.originId).toBeNull();
    expect(payload.processId).toBeNull();
    expect(payload.roastLevelId).toBeNull();
  });

  test("味覚グラフの6軸は数値へ変換し、空文字はnullにする", () => {
    const payload = toApiPayload(
      buildValues({
        tasteSweetness: "4",
        tasteBitterness: "",
        tasteAcidity: "2",
        tasteBody: "",
        tasteAroma: "",
        tasteAftertaste: "",
      }),
    );

    expect(payload.tasteSweetness).toBe(4);
    expect(payload.tasteBitterness).toBeNull();
    expect(payload.tasteAcidity).toBe(2);
  });
});
