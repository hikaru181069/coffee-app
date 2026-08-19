import { Coffee, Droplets, Flame, Globe, Leaf, Sparkles, Sprout, Store } from "lucide-react";
import { getCanvasColor } from "./canvasColors";

/**
 * ノード種別ごとの見た目（アイコン・色）とラベルの翻訳キー。
 *
 * docs/design.md の「Graph Visual Semantics」に対応する:
 *   record: card/circle, origin: globe, farm: leaf, variety: seed,
 *   process: droplets, roastLevel: flame, flavor: sparkle, cafe: store
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
 * recordとorigin/roastLevelはモスの濃淡3段階（record=`accent-moss`）、
 * 残り5種（farm/variety/process/flavor/cafe）はモスと彩度を揃えた
 * ミュートな別色相5色。アイコンで種別を区別できているため、色は
 * 識別性より階層表現（主役=モス、属性=ミュートな色）に使っている。
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
    colorClass: "text-accent-moss-light",
    ringClass: "ring-accent-moss-light/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-moss-light");
    },
  },
  farm: {
    icon: Leaf,
    labelKey: "graph.nodeTypes.farm",
    colorClass: "text-accent-clay",
    ringClass: "ring-accent-clay/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-clay");
    },
  },
  variety: {
    icon: Sprout,
    labelKey: "graph.nodeTypes.variety",
    colorClass: "text-accent-ochre",
    ringClass: "ring-accent-ochre/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-ochre");
    },
  },
  process: {
    icon: Droplets,
    labelKey: "graph.nodeTypes.process",
    colorClass: "text-accent-slate",
    ringClass: "ring-accent-slate/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-slate");
    },
  },
  roastLevel: {
    icon: Flame,
    labelKey: "graph.nodeTypes.roastLevel",
    colorClass: "text-accent-moss-dark",
    ringClass: "ring-accent-moss-dark/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-moss-dark");
    },
  },
  flavor: {
    icon: Sparkles,
    labelKey: "graph.nodeTypes.flavor",
    colorClass: "text-accent-rose",
    ringClass: "ring-accent-rose/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-rose");
    },
  },
  cafe: {
    icon: Store,
    labelKey: "graph.nodeTypes.cafe",
    colorClass: "text-accent-mist",
    ringClass: "ring-accent-mist/50",
    get canvasColor() {
      return getCanvasColor("--color-accent-mist");
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
];

export const getNodeVisual = (type) => NODE_VISUALS[type] ?? NODE_VISUALS.record;
