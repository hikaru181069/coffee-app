/**
 * utils/textExcerpt.js のユニットテスト。
 */

import { excerptNotes } from "../utils/textExcerpt.js";

describe("excerptNotes", () => {
  test("60文字以下ならそのまま返す", () => {
    expect(excerptNotes("バランス型。悪くはないが強い印象は無い。")).toBe(
      "バランス型。悪くはないが強い印象は無い。",
    );
  });

  test("60文字を超えると60文字で切って…を付ける", () => {
    const long = "あ".repeat(61);
    const result = excerptNotes(long);

    expect(result).toBe(`${"あ".repeat(60)}…`);
  });

  test("ちょうど60文字なら…を付けない", () => {
    const exact = "あ".repeat(60);
    expect(excerptNotes(exact)).toBe(exact);
  });

  test("notesが空・未指定なら空文字を返す", () => {
    expect(excerptNotes("")).toBe("");
    expect(excerptNotes(null)).toBe("");
    expect(excerptNotes(undefined)).toBe("");
  });
});
