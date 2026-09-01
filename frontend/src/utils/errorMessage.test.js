import { describe, expect, test } from "vitest";
import { getErrorMessage } from "./errorMessage";

// byCode.<CODE>を呼ばれたコードのままそのまま返す最小限のスタブ。
// 実際の翻訳文言のテストはロケールファイル側の責務なので、ここでは
// 「どのキーが選ばれたか」だけを見る
const t = (key) => key;

describe("getErrorMessage", () => {
  test("codeが既知の値なら、対応するerrors.byCode.<CODE>キーを返す", () => {
    const error = { code: "VALIDATION_ERROR", message: "入力内容を確認してください" };
    expect(getErrorMessage(error, t)).toBe("errors.byCode.VALIDATION_ERROR");
  });

  test.each([
    "UNAUTHORIZED",
    "FORBIDDEN",
    "NOT_FOUND",
    "CONFLICT",
    "INVALID_CREDENTIALS",
    "INVALID_CURRENT_PASSWORD",
    "NETWORK_ERROR",
    "UNKNOWN_ERROR",
    "INTERNAL_ERROR",
  ])("code=%s も対応するキーを返す", (code) => {
    expect(getErrorMessage({ code, message: "何か" }, t)).toBe(`errors.byCode.${code}`);
  });

  test("codeが未知の値なら、サーバーが返したmessageをそのまま返す", () => {
    const error = { code: "SOME_UNKNOWN_CODE", message: "サーバー由来のメッセージ" };
    expect(getErrorMessage(error, t)).toBe("サーバー由来のメッセージ");
  });

  test("codeが無くmessageがあれば、messageをそのまま返す", () => {
    const error = { message: "ネットワークエラー" };
    expect(getErrorMessage(error, t)).toBe("ネットワークエラー");
  });

  test("codeもmessageも無ければ、UNKNOWN_ERRORの文言を返す", () => {
    expect(getErrorMessage({}, t)).toBe("errors.byCode.UNKNOWN_ERROR");
  });

  test("errorがnull/undefinedなら空文字を返す", () => {
    expect(getErrorMessage(null, t)).toBe("");
    expect(getErrorMessage(undefined, t)).toBe("");
  });
});
