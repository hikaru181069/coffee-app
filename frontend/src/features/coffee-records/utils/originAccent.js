/**
 * 産地ごとのアクセントカラー。
 *
 * 「その国を示すアクセント」として、HomeRecordCard.jsx の産地名の
 * 横に置く縦バーの色を、産地ごとに変える。
 *
 * 産地マスターにcolorフィールドを追加する案もあったが、見た目だけの
 * 目的でバックエンドのスキーマを変える必要性は薄いため、産地名から
 * 決定的にハッシュして固定パレットへ割り当てる（フロントエンドだけで
 * 完結する）。同じ産地名なら常に同じ色になり、産地が増えても
 * マスター側の追加作業なしに自動で色が付く。
 *
 * primary（主要アクション）とdanger（エラー・危険操作）は、
 * このアプリの他の箇所で意味を持たせているため、混同を避けるために
 * パレットから外している。
 */

// bg-*版とfill-*版は同じ7色を指す並行配列（同じindexが同じ色になるよう
// 順序を揃えている）。Tailwindはソースコードに実際に書かれた完全な
// クラス名の文字列だけを見てCSSを生成するため、`` `fill-${name}` ``の
// ようにJS側で文字列結合して作ると検出されずCSSが生成されない
// （2026-08、世界地図機能でbgTintClassを追加したときと同じ理由）。
// 2026-08、世界地図の国の塗り色にも同じ産地アクセントを使うために
// fill-*版を追加した
const ORIGIN_ACCENT_PALETTE = [
  "bg-accent-sky",
  "bg-accent-peach",
  "bg-accent-sapphire",
  "bg-accent-teal",
  "bg-accent-yellow",
  "bg-accent-pink",
  "bg-accent-lavender",
];

const ORIGIN_FILL_PALETTE = [
  "fill-accent-sky",
  "fill-accent-peach",
  "fill-accent-sapphire",
  "fill-accent-teal",
  "fill-accent-yellow",
  "fill-accent-pink",
  "fill-accent-lavender",
];

/** 文字列から安定したハッシュ値を作る（DJB2） */
const hashString = (value) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash);
};

/** 産地名から、ORIGIN_ACCENT_PALETTE/ORIGIN_FILL_PALETTE共通のインデックスを求める */
const getOriginAccentIndex = (originName) => {
  if (!originName) return 0;
  return hashString(originName) % ORIGIN_ACCENT_PALETTE.length;
};

/** 産地名から、その産地専用のアクセントカラー（Tailwindのbg-*クラス）を返す */
export const getOriginAccentClass = (originName) => ORIGIN_ACCENT_PALETTE[getOriginAccentIndex(originName)];

/** 産地名から、その産地専用のアクセントカラー（Tailwindのfill-*クラス。SVG用）を返す */
export const getOriginFillClass = (originName) => ORIGIN_FILL_PALETTE[getOriginAccentIndex(originName)];
