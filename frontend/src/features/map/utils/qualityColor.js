/**
 * 品質スコアを4段階のアンバー系グラデーションへ変換する。
 *
 * CQIデータ全体（backend/data/cqiDatabase.json）の産地平均スコアの実測
 * レンジは81.3〜86.4（2026-08時点）と幅が狭いため、動的な最小・最大では
 * なく固定の閾値で4段階に区切る（産地が増えてもレンジがブレて色の
 * 意味が変わらないようにするため）。
 *
 * 産地ごとのアクセントカラー（originAccent.js、多色パレット）とは
 * 意図的に別の色相（単色のアンバーの濃淡）にしている。World Mapの
 * 色分けモードが「訪問状況」か「品質スコア」かを、色そのもので
 * 一目で区別できるようにするため。
 */
const TIERS = [
  { min: 85, fillClass: "fill-[#c17a1f]", bgClass: "bg-[#c17a1f]" },
  { min: 84, fillClass: "fill-[#d99a3f]", bgClass: "bg-[#d99a3f]" },
  { min: 83, fillClass: "fill-[#e8b768]", bgClass: "bg-[#e8b768]" },
  { min: -Infinity, fillClass: "fill-[#f0d9a8]", bgClass: "bg-[#f0d9a8]" },
];

/** 品質スコア（数値）から、地図の塗り色（Tailwindのfill-*クラス）を返す */
export const getQualityTierFillClass = (score) =>
  (TIERS.find((tier) => score >= tier.min) ?? TIERS[TIERS.length - 1]).fillClass;

/** 凡例用に、スコアの低い順で全ティアのbg-*クラスを返す */
export const QUALITY_TIER_LEGEND_SWATCHES = [...TIERS].reverse().map((tier) => tier.bgClass);
