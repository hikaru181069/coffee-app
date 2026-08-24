import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * notesの自由記述から、固定辞書との部分文字列一致で味覚キーワードを
 * 抽出する純粋関数。DB・HTTPに依存しない（graphBuilder.jsと同じ制約）。
 *
 * ルールベースであり、形態素解析・AI/自然言語処理は使わない
 * （docs/product.md「MVP Before Intelligence」、backend/core/insights/
 * insightBuilder.js・backend/core/discover/discoverBuilder.jsと同じ方針）。
 *
 * 辞書データ（backend/data/tasteKeywords.json）は起動後に一度だけ読み込み、
 * メモリにキャッシュする（discoverService.jsのloadCqiDatasetと同じ
 * load-once-cacheパターン）。
 */

let cachedDataset = null;

const loadTasteKeywordDataset = () => {
  if (!cachedDataset) {
    const filePath = path.join(import.meta.dirname, "../../data/tasteKeywords.json");
    cachedDataset = JSON.parse(readFileSync(filePath, "utf-8"));
  }
  return cachedDataset;
};

// マッチした語の直後、この文字数以内に否定表現が続く場合は誤検出として除外する。
// い形容詞（甘い/苦い/酸っぱい等）は活用で語幹が変わるため
// （「苦くない」は文字列として「苦い」を含まない）、このガードが無くても
// 自然に誤検出を避けられる。ガードが実際に効くのは、な形容詞・外来語・
// 名詞的表現（フルーティー/まろやか等）で、辞書の文字列がそのまま
// 残った後ろに否定が続くケース（例:「フルーティーじゃない」）。
//
// 既知の限界: この判定はマッチ直後の狭い範囲しか見ないため、離れた場所で
// 文全体を打ち消す言い回し（例:「チョコレートのようなコクのある
// コーヒーだと思っていたら、違っていた。」）には対応できず、誤検出する。
// 文構造を追う否定判定にはAI/NLPが必要になり、docs/product.md
// 「MVP Before Intelligence」の方針で意図的にスコープ外としている
// （IMPLEMENTATION.mdの未解決事項に記録済み）。否定パターンを個別に
// 追加する対症療法は取らない方針。
const NEGATION_WINDOW = 6;
const NEGATION_PARTICLES = ["くない", "じゃない", "ではない", "なかった", "ない"];

/**
 * notesから辞書に一致するキーワードを抽出する。
 *
 * flavorAliasを持つエントリは、そのまま結果に含める（DBへの参照解決は
 * ここでは行わない。純粋関数のまま保つため）。呼び出し側
 * （graphBuilder.js）が、実在するFlavorマスターと一致するかどうかを
 * 判定し、一致すればkeywordノードの代わりに既存のflavorノードへ
 * 統合する（backend/data/tasteKeywords.jsonの_comment参照）。
 *
 * @param {string} notes
 * @returns {Array<{ keyword: string, category: string, flavorAlias?: string }>}
 */
export const extractKeywords = (notes) => {
  if (!notes) return [];

  const { entries } = loadTasteKeywordDataset();

  // 長い語から先に判定する。例えば辞書に「コク」と「コクがある」の
  // 両方があるとき、「コクがある」を先に確定させ、その範囲と重なる
  // 「コク」の一致はスキップする（1つの言及から重複した2ノードが
  // 生まれるのを防ぐ）。
  const sortedEntries = [...entries].sort((a, b) => b.canonical.length - a.canonical.length);

  const matchedRanges = [];
  const results = [];

  for (const { canonical, category, flavorAlias } of sortedEntries) {
    const start = notes.indexOf(canonical);
    if (start === -1) continue;

    const end = start + canonical.length;
    const overlapsExistingMatch = matchedRanges.some(
      ([existingStart, existingEnd]) => start < existingEnd && existingStart < end,
    );
    if (overlapsExistingMatch) continue;

    const trailing = notes.slice(end, end + NEGATION_WINDOW);
    const isNegated = NEGATION_PARTICLES.some((particle) => trailing.includes(particle));
    if (isNegated) continue;

    matchedRanges.push([start, end]);
    results.push(flavorAlias ? { keyword: canonical, category, flavorAlias } : { keyword: canonical, category });
  }

  return results;
};
