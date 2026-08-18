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

const ORIGIN_ACCENT_PALETTE = [
  "bg-accent-moss-light",
  "bg-accent-moss-dark",
  "bg-accent-slate",
  "bg-accent-clay",
  "bg-accent-ochre",
  "bg-accent-rose",
  "bg-accent-mist",
];

/** 文字列から安定したハッシュ値を作る（DJB2） */
const hashString = (value) => {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i);
  }
  return Math.abs(hash);
};

/** 産地名から、その産地専用のアクセントカラー（Tailwindのbg-*クラス）を返す */
export const getOriginAccentClass = (originName) => {
  if (!originName) return ORIGIN_ACCENT_PALETTE[0];
  const index = hashString(originName) % ORIGIN_ACCENT_PALETTE.length;
  return ORIGIN_ACCENT_PALETTE[index];
};
