import { Coffee, Droplets, Flame, Globe, Leaf, Quote, Sparkles, Sprout, Store } from "lucide-react";
import { getCanvasColor } from "./canvasColors";

/**
 * ノード種別ごとの見た目（アイコン・色）とラベルの翻訳キー。
 *
 * docs/design.md の「Graph Visual Semantics」に対応する:
 *   record: card/circle, origin: globe, farm: leaf, variety: seed,
 *   process: droplets, roastLevel: flame, flavor: sparkle, cafe: store,
 *   keyword: quote
 *
 * 色だけで種別を区別しない（docs/design.md の UI Rules）ため、
 * 種別ごとに異なるアイコンも必ず割り当てる。GraphLegend と
 * GraphCanvas（canvas描画）の両方がこのマップを参照するので、
 * 見た目の対応がここ1か所で決まる。
 *
 * labelKeyはテキストではなく翻訳キー。呼び出し側が t(visual.labelKey) の
 * 形で翻訳する（DOM・i18nextに依存しない純粋関数のままにするため）。
 *
 * 色の設計（prompts/design/00-design-principles.md 6.1参照）:
 * 2026-08、実機レビューで「全属性が同程度にミュートで見分けづらい・
 * 地味」という指摘を受け、Catppuccin Mochaの9色（record=`accent-moss`
 * 含む）へ全面刷新した。以前は「色は識別性より階層表現（主役=モス、
 * 属性=ミュートな色）に使う」という方針だったが、実際の値は主役も
 * 含めて全属性が同程度に低彩度で、狙い通りに機能していなかった。
 * 今はアイコンに加えて色でも種別を識別できるようにしている
 * （色だけで状態を表現しないというdocs/design.mdの方針自体は、
 * どの種別も引き続きアイコン・形の違いを併せ持つため変わらない）。
 * 2026-08、配色をmobbin.com準拠へ刷新した際、`primary`が
 * フォーカスリング専用の青へ変わったため、recordノードは独立した
 * `accent-moss`トークン（旧primaryと同じ値）へ切り離した。グラフの
 * 見た目自体は変えていない。
 *
 * canvasColorは、Tailwindのcolor-*クラスもCSSカスタムプロパティも
 * 解釈できないcanvas描画（react-force-graph-2dのnodeCanvasObject）向けの
 * 実際の色コード。getterにして、初回アクセス時に`getComputedStyle`経由で
 * index.cssの@themeが生成する--color-*から動的に解決する
 * （utils/canvasColors.js参照。以前はhexを手打ちして@theme側と手動
 * 同期する必要があったが、その技術的負債を解消した）。
 */
export const NODE_VISUALS = {
  record: {
    icon: Coffee,
    labelKey: "graph.nodeTypes.record",
    colorClass: "text-accent-moss",
    ringClass: "ring-accent-moss/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-moss");
    },
  },
  origin: {
    icon: Globe,
    labelKey: "graph.nodeTypes.origin",
    colorClass: "text-accent-sky",
    ringClass: "ring-accent-sky/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-sky");
    },
  },
  farm: {
    icon: Leaf,
    labelKey: "graph.nodeTypes.farm",
    colorClass: "text-accent-teal",
    ringClass: "ring-accent-teal/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-teal");
    },
  },
  variety: {
    icon: Sprout,
    labelKey: "graph.nodeTypes.variety",
    colorClass: "text-accent-yellow",
    ringClass: "ring-accent-yellow/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-yellow");
    },
  },
  process: {
    icon: Droplets,
    labelKey: "graph.nodeTypes.process",
    colorClass: "text-accent-sapphire",
    ringClass: "ring-accent-sapphire/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-sapphire");
    },
  },
  roastLevel: {
    icon: Flame,
    labelKey: "graph.nodeTypes.roastLevel",
    colorClass: "text-accent-peach",
    ringClass: "ring-accent-peach/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-peach");
    },
  },
  flavor: {
    icon: Sparkles,
    labelKey: "graph.nodeTypes.flavor",
    colorClass: "text-accent-pink",
    ringClass: "ring-accent-pink/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-pink");
    },
  },
  cafe: {
    icon: Store,
    labelKey: "graph.nodeTypes.cafe",
    colorClass: "text-accent-lavender",
    ringClass: "ring-accent-lavender/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-lavender");
    },
  },
  keyword: {
    icon: Quote,
    labelKey: "graph.nodeTypes.keyword",
    colorClass: "text-accent-mauve",
    ringClass: "ring-accent-mauve/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-mauve");
    },
  },
};

/** 属性ノードの種別一覧（凡例・フィルターの並び順に使う。recordは含めない） */
export const ATTRIBUTE_NODE_TYPES = [
  "origin",
  "farm",
  "variety",
  "process",
  "roastLevel",
  "flavor",
  "cafe",
  "keyword",
];

export const getNodeVisual = (type) => NODE_VISUALS[type] ?? NODE_VISUALS.record;
