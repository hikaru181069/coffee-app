/**
 * ノードの「実際の色」を1箇所で決める関数群。
 *
 * origin・flavorだけは種別共通色ではなく値ごとの個別色
 * （originAccent.js・flavorAccent.js）を使う、という判定ロジックは、
 * 以前は`GraphCanvas.jsx`の`nodeFillColor`と`NodeDetailPanel.jsx`の
 * `badgeBgClass`にそれぞれ個別に実装されていた。
 *
 * 2026-09、「デザイン・テーマの統一」レビューで、この判定を実装していない
 * 画面（EntityDetailPage・RecordDetailPage・TopRankingList・
 * EntityResultCard・GraphNodeSearch・RecordConnectionsDiagram・
 * DiscoveryBadge・SaveDiscoveryReveal）が多数見つかった（例: Graph画面で
 * 見るEthiopiaは個別の青だが、エンティティ詳細ページのEthiopiaは種別共通の
 * 汎用色のまま、という食い違い）。同じ判定ロジックを画面ごとに書き写すと
 * この種の漏れが再発しやすいため、ここへ集約し、GraphCanvas.jsx・
 * NodeDetailPanel.jsxも含め全消費箇所がこの関数群を呼ぶ形に統一した。
 *
 * @param {{type: string, label: string}} node
 */
import { getNodeVisual } from "./nodeVisuals";
import { getOriginHex, getOriginAccentClass, getOriginTintClass, getOriginTextClass } from "../../coffee-records/utils/originAccent";
import { getFlavorHex, getFlavorAccentClass, getFlavorTintClass, getFlavorTextClass } from "../../coffee-records/utils/flavorAccent";

/** 生のHEX文字列（canvas描画・インラインstyle用） */
export const getNodeColorHex = ({ type, label }) => {
  if (type === "origin") return getOriginHex(label);
  if (type === "flavor") return getFlavorHex(label);
  return getNodeVisual(type).canvasColor;
};

/** 塗りつぶし円バッジ用（Tailwindのbg-*クラス、不透明度なし） */
export const getNodeSolidBgClass = ({ type, label }) => {
  if (type === "origin") return getOriginAccentClass(label);
  if (type === "flavor") return getFlavorAccentClass(label);
  return getNodeVisual(type).solidBgClass;
};

/** 薄い塗りのタグ・チップ用（Tailwindのbg-*クラス、15%不透明度） */
export const getNodeTintBgClass = ({ type, label }) => {
  if (type === "origin") return getOriginTintClass(label);
  if (type === "flavor") return getFlavorTintClass(label);
  return getNodeVisual(type).bgTintClass;
};

/** アイコン・文字色用（Tailwindのtext-*クラス） */
export const getNodeTextColorClass = ({ type, label }) => {
  if (type === "origin") return getOriginTextClass(label);
  if (type === "flavor") return getFlavorTextClass(label);
  return getNodeVisual(type).colorClass;
};
