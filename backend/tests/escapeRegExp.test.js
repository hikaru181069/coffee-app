/**
 * utils/escapeRegExp.js のユニットテスト。
 *
 * ユーザー入力を$regexへそのまま渡すと、意図しないパターンマッチや
 * ReDoSにつながる。特殊文字がすべて無害化されることを確かめる。
 */

import { escapeRegExp } from "../utils/escapeRegExp.js";

describe("escapeRegExp", () => {
  test("正規表現の特殊文字をすべてエスケープする", () => {
    expect(escapeRegExp(".*+?^${}()|[]\\")).toBe("\\.\\*\\+\\?\\^\\$\\{\\}\\(\\)\\|\\[\\]\\\\");
  });

  test("特殊文字を含まない文字列はそのまま返す", () => {
    expect(escapeRegExp("Ethiopia Guji")).toBe("Ethiopia Guji");
  });

  test("エスケープ後の文字列を正規表現として使うと、元の文字列自体にしか一致しない", () => {
    const input = "a.b";
    const pattern = new RegExp(escapeRegExp(input));

    expect(pattern.test("a.b")).toBe(true);
    // エスケープしていなければ "." が任意の1文字に一致してしまう
    expect(pattern.test("aXb")).toBe(false);
  });

  test("空文字はそのまま返す", () => {
    expect(escapeRegExp("")).toBe("");
  });
});
