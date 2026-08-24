/**
 * core/graph/noteKeywordExtractor.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数（辞書ファイルの読み込みのみ）なので、
 * モック無しでテストできる。
 */

import { extractKeywords } from "../core/graph/noteKeywordExtractor.js";

describe("extractKeywords", () => {
  test("空文字・null・undefinedは空配列を返す", () => {
    expect(extractKeywords("")).toEqual([]);
    expect(extractKeywords(null)).toEqual([]);
    expect(extractKeywords(undefined)).toEqual([]);
  });

  test("辞書語を1つ含むnotesは対応するkeywordを返す", () => {
    const result = extractKeywords("今日は甘いコーヒーだった");

    expect(result).toEqual([{ keyword: "甘い", category: "sweetness" }]);
  });

  test("辞書語を含まないnotesは空配列を返す", () => {
    expect(extractKeywords("特に感想は無い")).toEqual([]);
  });

  test("複数の辞書語を含むnotesは複数返す", () => {
    const result = extractKeywords("苦い味で、すっきりした後味だった");
    const keywords = result.map((entry) => entry.keyword).sort();

    expect(keywords).toEqual(["すっきり", "苦い"]);
  });

  test("否定ガード: 「フルーティーじゃない」はキーワードとして検出しない", () => {
    expect(extractKeywords("フルーティーじゃない味だった")).toEqual([]);
  });

  test("否定ガード: 「まろやかではない」はキーワードとして検出しない", () => {
    expect(extractKeywords("まろやかではない、角のある味")).toEqual([]);
  });

  test("い形容詞は活用によって否定ガード無しでも誤検出しない（苦くない は「苦い」を含まない）", () => {
    // 「苦くない」という文字列自体に部分文字列「苦い」は含まれないため、
    // 否定ガードを経由するまでもなく一致しない（設計上の仕様）。
    expect("苦くない".includes("苦い")).toBe(false);
    expect(extractKeywords("今日のは苦くない")).toEqual([]);
  });

  test("長い辞書語が優先され、重なる短い辞書語は重複ノード化しない", () => {
    // 「コクがある」と「コク」は両方辞書にあるが、同じ言及から
    // 2つのキーワードが生まれないよう、長い方が優先される。
    const result = extractKeywords("コクがあるコーヒーでした");

    expect(result).toEqual([{ keyword: "コクがある", category: "body" }]);
  });

  test("flavorAliasを持つ語はflavorAlias付きで返す（graphBuilder.jsがflavorノードへの統合可否を判定する）", () => {
    const result = extractKeywords("チョコレートのような風味だった");

    expect(result).toEqual([
      { keyword: "チョコレートのような", category: "aroma", flavorAlias: "Chocolate" },
    ]);
  });

  test("flavorAliasを持たない語はflavorAliasフィールドを含まない", () => {
    const result = extractKeywords("甘い味だった");

    expect(result[0]).not.toHaveProperty("flavorAlias");
  });
});
