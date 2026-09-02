import { describe, expect, test } from "vitest";
import {
  validateBrewDetails,
  hasErrors,
  toBrewApiPayload,
  secondsToMinutesSecondsStrings,
} from "./brewDetailsValidation";

// 実際の翻訳文言は問わず、どのフィールドにエラーが出たかだけを確認するため、
// キーをそのまま返す最小限のモック（recordFormValidation.test.jsと同じ方針）
const t = (key) => key;

const emptyValues = () => ({
  doseWeight: "",
  waterWeight: "",
  brewTimeMinutes: "",
  brewTimeSecondsPart: "",
  pours: [],
});

describe("secondsToMinutesSecondsStrings", () => {
  test("nullは空文字のペアへ変換する（未記録）", () => {
    expect(secondsToMinutesSecondsStrings(null)).toEqual({ minutes: "", seconds: "" });
  });

  test("合計秒数を分・秒へ分解する", () => {
    expect(secondsToMinutesSecondsStrings(150)).toEqual({ minutes: "2", seconds: "30" });
  });

  test("1分未満は分0として返す", () => {
    expect(secondsToMinutesSecondsStrings(45)).toEqual({ minutes: "0", seconds: "45" });
  });
});

describe("validateBrewDetails", () => {
  test("すべて空なら検証を通る（未記録を許可）", () => {
    expect(hasErrors(validateBrewDetails(emptyValues(), t))).toBe(false);
  });

  test("正の数値を許可する", () => {
    const values = { ...emptyValues(), doseWeight: "18", waterWeight: "280" };
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

  test("抽出時間（分・秒）を許可する", () => {
    const values = { ...emptyValues(), brewTimeMinutes: "2", brewTimeSecondsPart: "30" };
    expect(hasErrors(validateBrewDetails(values, t))).toBe(false);
  });

  test("秒だけ・分だけの入力も許可する", () => {
    expect(hasErrors(validateBrewDetails({ ...emptyValues(), brewTimeSecondsPart: "45" }, t))).toBe(false);
    expect(hasErrors(validateBrewDetails({ ...emptyValues(), brewTimeMinutes: "3" }, t))).toBe(false);
  });

  test("抽出時間が上限（24時間）を超えるとエラーになる", () => {
    const errors = validateBrewDetails({ ...emptyValues(), brewTimeMinutes: "1441" }, t);
    expect(errors.brewTimeSeconds).toBeTruthy();
  });

  test("両方埋まっている注湯の行は許可する", () => {
    const values = {
      ...emptyValues(),
      pours: [
        { elapsedMinutes: "0", elapsedSecondsPart: "0", cumulativeWaterWeight: "50" },
        { elapsedMinutes: "0", elapsedSecondsPart: "45", cumulativeWaterWeight: "150" },
      ],
    };
    expect(hasErrors(validateBrewDetails(values, t))).toBe(false);
  });

  test("何も入力していない行は無視する（まだ入力していない行）", () => {
    const values = {
      ...emptyValues(),
      pours: [{ elapsedMinutes: "", elapsedSecondsPart: "", cumulativeWaterWeight: "" }],
    };
    expect(hasErrors(validateBrewDetails(values, t))).toBe(false);
  });

  test("経過時間だけ入力され湯量が空の行はエラーになる", () => {
    const values = {
      ...emptyValues(),
      pours: [{ elapsedMinutes: "0", elapsedSecondsPart: "0", cumulativeWaterWeight: "" }],
    };
    expect(validateBrewDetails(values, t).pours).toBeTruthy();
  });

  test("経過時間が前の行以下だとエラーになる", () => {
    const values = {
      ...emptyValues(),
      pours: [
        { elapsedMinutes: "0", elapsedSecondsPart: "45", cumulativeWaterWeight: "150" },
        { elapsedMinutes: "0", elapsedSecondsPart: "45", cumulativeWaterWeight: "200" },
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

  test("分・秒を合計秒数へ変換する", () => {
    const values = { ...emptyValues(), doseWeight: "18", brewTimeMinutes: "2", brewTimeSecondsPart: "30" };
    expect(toBrewApiPayload(values)).toEqual({
      doseWeight: 18,
      waterWeight: null,
      brewTimeSeconds: 150,
      pours: [],
    });
  });

  test("何も入力していない行を除去する", () => {
    const values = {
      ...emptyValues(),
      pours: [
        { elapsedMinutes: "0", elapsedSecondsPart: "0", cumulativeWaterWeight: "50" },
        { elapsedMinutes: "", elapsedSecondsPart: "", cumulativeWaterWeight: "" },
      ],
    };
    expect(toBrewApiPayload(values).pours).toEqual([{ elapsedSeconds: 0, cumulativeWaterWeight: 50 }]);
  });

  test("注湯の経過時間（分・秒）を合計秒数へ変換する", () => {
    const values = {
      ...emptyValues(),
      pours: [{ elapsedMinutes: "1", elapsedSecondsPart: "5", cumulativeWaterWeight: "150" }],
    };
    expect(toBrewApiPayload(values).pours).toEqual([{ elapsedSeconds: 65, cumulativeWaterWeight: 150 }]);
  });
});
