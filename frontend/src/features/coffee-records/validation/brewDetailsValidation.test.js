import { describe, expect, test } from "vitest";
import { validateBrewDetails, hasErrors, toBrewApiPayload } from "./brewDetailsValidation";

// 実際の翻訳文言は問わず、どのフィールドにエラーが出たかだけを確認するため、
// キーをそのまま返す最小限のモック（recordFormValidation.test.jsと同じ方針）
const t = (key) => key;

const emptyValues = () => ({
  doseWeight: "",
  waterWeight: "",
  brewTimeSeconds: "",
  pours: [],
});

describe("validateBrewDetails", () => {
  test("すべて空なら検証を通る（未記録を許可）", () => {
    expect(hasErrors(validateBrewDetails(emptyValues(), t))).toBe(false);
  });

  test("正の数値を許可する", () => {
    const values = { ...emptyValues(), doseWeight: "18", waterWeight: "280", brewTimeSeconds: "150" };
    expect(hasErrors(validateBrewDetails(values, t))).toBe(false);
  });

  test("0以下はエラーになる", () => {
    const errors = validateBrewDetails({ ...emptyValues(), doseWeight: "0" }, t);
    expect(errors.doseWeight).toBeTruthy();
  });

  test("上限を超える値はエラーになる", () => {
    const errors = validateBrewDetails({ ...emptyValues(), waterWeight: "5001" }, t);
    expect(errors.waterWeight).toBeTruthy();
  });

  test("両方埋まっている注湯の行は許可する", () => {
    const values = {
      ...emptyValues(),
      pours: [
        { elapsedSeconds: "0", cumulativeWaterWeight: "50" },
        { elapsedSeconds: "45", cumulativeWaterWeight: "150" },
      ],
    };
    expect(hasErrors(validateBrewDetails(values, t))).toBe(false);
  });

  test("両方空の行は無視する（まだ入力していない行）", () => {
    const values = { ...emptyValues(), pours: [{ elapsedSeconds: "", cumulativeWaterWeight: "" }] };
    expect(hasErrors(validateBrewDetails(values, t))).toBe(false);
  });

  test("片方だけ入力されている行はエラーになる", () => {
    const values = { ...emptyValues(), pours: [{ elapsedSeconds: "0", cumulativeWaterWeight: "" }] };
    expect(validateBrewDetails(values, t).pours).toBeTruthy();
  });

  test("経過時間が前の行以下だとエラーになる", () => {
    const values = {
      ...emptyValues(),
      pours: [
        { elapsedSeconds: "45", cumulativeWaterWeight: "150" },
        { elapsedSeconds: "45", cumulativeWaterWeight: "200" },
      ],
    };
    expect(validateBrewDetails(values, t).pours).toBeTruthy();
  });
});

describe("toBrewApiPayload", () => {
  test("空文字はnullへ変換する", () => {
    expect(toBrewApiPayload(emptyValues())).toEqual({
      doseWeight: null,
      waterWeight: null,
      brewTimeSeconds: null,
      pours: [],
    });
  });

  test("数値文字列をNumberへ変換する", () => {
    const values = { ...emptyValues(), doseWeight: "18", waterWeight: "280", brewTimeSeconds: "150" };
    expect(toBrewApiPayload(values)).toEqual({
      doseWeight: 18,
      waterWeight: 280,
      brewTimeSeconds: 150,
      pours: [],
    });
  });

  test("両方空の行を除去する", () => {
    const values = {
      ...emptyValues(),
      pours: [
        { elapsedSeconds: "0", cumulativeWaterWeight: "50" },
        { elapsedSeconds: "", cumulativeWaterWeight: "" },
      ],
    };
    expect(toBrewApiPayload(values).pours).toEqual([{ elapsedSeconds: 0, cumulativeWaterWeight: 50 }]);
  });
});
