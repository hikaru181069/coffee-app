import { Coffee, Droplets, Flame, Globe, Leaf, Sparkles, Sprout } from "lucide-react";

/**
 * ノード種別ごとの見た目（アイコン・色）とラベルの翻訳キー。
 *
 * docs/design.md の「Graph Visual Semantics」に対応する:
 *   record: card/circle, origin: globe, farm: leaf, variety: seed,
 *   process: droplets, roastLevel: flame, flavor: sparkle
 *
 * 色だけで種別を区別しない（docs/design.md の UI Rules）ため、
 * 種別ごとに異なるアイコンも必ず割り当てる。GraphLegend と
 * AttributeNode/RecordNode の両方がこのマップを参照するので、
 * 見た目の対応がここ1か所で決まる。
 *
 * labelKeyはテキストではなく翻訳キー。呼び出し側が t(visual.labelKey) の
 * 形で翻訳する（DOM・i18nextに依存しない純粋関数のままにするため）。
 */
export const NODE_VISUALS = {
  record: { icon: Coffee, labelKey: "graph.nodeTypes.record", colorClass: "text-ctp-lavender", ringClass: "ring-ctp-lavender/50" },
  origin: { icon: Globe, labelKey: "graph.nodeTypes.origin", colorClass: "text-ctp-sapphire", ringClass: "ring-ctp-sapphire/50" },
  farm: { icon: Leaf, labelKey: "graph.nodeTypes.farm", colorClass: "text-ctp-green", ringClass: "ring-ctp-green/50" },
  variety: { icon: Sprout, labelKey: "graph.nodeTypes.variety", colorClass: "text-ctp-teal", ringClass: "ring-ctp-teal/50" },
  process: { icon: Droplets, labelKey: "graph.nodeTypes.process", colorClass: "text-ctp-sky", ringClass: "ring-ctp-sky/50" },
  roastLevel: { icon: Flame, labelKey: "graph.nodeTypes.roastLevel", colorClass: "text-ctp-peach", ringClass: "ring-ctp-peach/50" },
  flavor: { icon: Sparkles, labelKey: "graph.nodeTypes.flavor", colorClass: "text-ctp-pink", ringClass: "ring-ctp-pink/50" },
};

/** 属性ノードの種別一覧（凡例・フィルターの並び順に使う。recordは含めない） */
export const ATTRIBUTE_NODE_TYPES = [
  "origin",
  "farm",
  "variety",
  "process",
  "roastLevel",
  "flavor",
];

export const getNodeVisual = (type) => NODE_VISUALS[type] ?? NODE_VISUALS.record;
