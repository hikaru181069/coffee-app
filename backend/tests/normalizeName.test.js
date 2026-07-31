/**
 * utils/normalizeName.js のユニットテスト。
 *
 * 表記揺れを吸収できているかを確かめる。ここが壊れると、
 * 同じ産地が知識グラフ上で複数ノードに分裂する。
 */

import { normalizeName } from "../utils/normalizeName.js";

describe("normalizeName", () => {
  test("前後の空白を除去して小文字にする", () => {
    expect(normalizeName("  Ethiopia  ")).toBe("ethiopia");
  });

  test("大文字小文字の違いを吸収する", () => {
    expect(normalizeName("ETHIOPIA")).toBe(normalizeName("Ethiopia"));
    expect(normalizeName("wAsHeD")).toBe("washed");
  });

  test("全角スペースを半角として扱う", () => {
    expect(normalizeName("Dark　Chocolate")).toBe("dark chocolate");
  });

  test("連続する空白を1つにまとめる", () => {
    expect(normalizeName("Costa    Rica")).toBe("costa rica");
  });

  test("ハイフンは残す（medium-dark と medium dark を区別するため）", () => {
    expect(normalizeName("Medium-Dark")).toBe("medium-dark");
    expect(normalizeName("Medium Dark")).toBe("medium dark");
    expect(normalizeName("Medium-Dark")).not.toBe(normalizeName("Medium Dark"));
  });

  test("文字列以外は空文字を返す", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
    expect(normalizeName(123)).toBe("");
  });
});
