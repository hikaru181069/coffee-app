import {
  BarnIcon,
  CoffeeIcon,
  FireIcon,
  MapPinIcon,
  PlantIcon,
  SparkleIcon,
  StorefrontIcon,
  TagIcon,
} from "@phosphor-icons/react";
import CherryToBeanIcon from "../components/CherryToBeanIcon";
import { getCanvasColor } from "./canvasColors";

/**
 * ノード種別ごとの見た目（アイコン・色）とラベルの翻訳キー。
 *
 * docs/design.md の「Graph Visual Semantics」に対応する:
 *   record: coffee cup, origin: map pin, farm: barn, variety: plant(芽),
 *   process: cherry→bean（精製=果実から豆を取り出す工程）, roastLevel: fire,
 *   flavor: sparkle, cafe: storefront, keyword: tag
 *
 * 2026-09、lucide-reactの汎用アイコンでは種別が覚えにくい・気に入らない
 * というフィードバックを受け、実在の@phosphor-icons/react本体のアイコンへ
 * 全面差し替えた（docs/design.md「Iconography」の「lucide-reactのみを
 * 使う」というルールを、ユーザーの明示的な指示でこの9種類に限り上書き
 * している）。processだけはPhosphor本体に「チェリーから豆を取り出す
 * 工程」に対応する単体アイコンが無いため、Phosphor本体のCherries/
 * CoffeeBeanのパスを合成した専用コンポーネント
 * （components/CherryToBeanIcon.jsx）を使う。
 *
 * 色だけで種別を区別しない（docs/design.md の UI Rules）ため、
 * 種別ごとに異なるアイコンも必ず割り当てる。GraphLegend と
 * GraphCanvas（canvas描画）の両方がこのマップを参照するので、
 * 見た目の対応がここ1か所で決まる。
 *
 * labelKeyはテキストではなく翻訳キー。呼び出し側が t(visual.labelKey) の
 * 形で翻訳する（DOM・i18nextに依存しない純粋関数のままにするため）。
 *
 * 色の設計（docs/design.md「Design Tokens」のColor参照）:
 * 2026-09、「グラフを直接操作する体験」の作り直しに伴い、寒色〜暖色に
 * またがる塗りつぶしノード用の専用パレット（`--color-graph-*`、
 * index.css）へ全面刷新した。以前はDiscover・WorldMapLegend・
 * OverviewStats・Diagnosisのarchetype色と共有の`--color-accent-*`を
 * 使っていたが、グラフの見た目を変えるたびに無関係な4画面の配色まで
 * 変わってしまうため、グラフ専用のトークンへ分離した
 * （index.cssの`--color-graph-*`コメント参照）。
 *
 * canvasColorは、Tailwindのcolor-*クラスもCSSカスタムプロパティも
 * 解釈できないcanvas描画（GraphCanvas.jsxの塗りつぶしノード）向けの
 * 実際の色コード。getterにして、初回アクセス時に`getComputedStyle`経由で
 * index.cssの@themeが生成する--color-*から動的に解決する
 * （utils/canvasColors.js参照。以前はhexを手打ちして@theme側と手動
 * 同期する必要があったが、その技術的負債を解消した）。
 *
 * bgTintClassは、2026-08にRecordDetailPage.jsxの「コーヒーの詳細」を
 * アイコンバッジ付きのタイル表示へ変更した際に追加した、薄い塗り
 * （15%不透明度）の背景色クラス。solidBgClassは2026-09、
 * NodeDetailPanel.jsxの見出しをQ構図と揃えた塗りつぶし円バッジへ
 * 変更した際に追加した、不透明度なしの塗り（badge本体用）。
 * どちらも`colorClass`から`.replace("text-","bg-")`で動的に導出せず、
 * ここへ literal な文字列として持たせているのは、Tailwindのビルドが
 * ソースコード中に実際に書かれたクラス名の文字列だけを検出するため
 * （実行時に文字列結合で作った"bg-accent-sky/15"はビルドの
 * スキャン対象にならずCSSが生成されない）。
 */
export const NODE_VISUALS = {
  record: {
    icon: CoffeeIcon,
    labelKey: "graph.nodeTypes.record",
    colorClass: "text-graph-record",
    bgTintClass: "bg-graph-record/15",
    solidBgClass: "bg-graph-record",
    ringClass: "ring-graph-record/50",
    get canvasColor() {
      return getCanvasColor("--color-graph-record");
    },
  },
  origin: {
    icon: MapPinIcon,
    labelKey: "graph.nodeTypes.origin",
    colorClass: "text-graph-origin",
    bgTintClass: "bg-graph-origin/15",
    solidBgClass: "bg-graph-origin",
    ringClass: "ring-graph-origin/50",
    get canvasColor() {
      return getCanvasColor("--color-graph-origin");
    },
  },
  farm: {
    icon: BarnIcon,
    labelKey: "graph.nodeTypes.farm",
    colorClass: "text-graph-farm",
    bgTintClass: "bg-graph-farm/15",
    solidBgClass: "bg-graph-farm",
    ringClass: "ring-graph-farm/50",
    get canvasColor() {
      return getCanvasColor("--color-graph-farm");
    },
  },
  variety: {
    icon: PlantIcon,
    labelKey: "graph.nodeTypes.variety",
    colorClass: "text-graph-variety",
    bgTintClass: "bg-graph-variety/15",
    solidBgClass: "bg-graph-variety",
    ringClass: "ring-graph-variety/50",
    get canvasColor() {
      return getCanvasColor("--color-graph-variety");
    },
  },
  process: {
    icon: CherryToBeanIcon,
    labelKey: "graph.nodeTypes.process",
    colorClass: "text-graph-process",
    bgTintClass: "bg-graph-process/15",
    solidBgClass: "bg-graph-process",
    ringClass: "ring-graph-process/50",
    get canvasColor() {
      return getCanvasColor("--color-graph-process");
    },
  },
  roastLevel: {
    icon: FireIcon,
    labelKey: "graph.nodeTypes.roastLevel",
    colorClass: "text-graph-roastlevel",
    bgTintClass: "bg-graph-roastlevel/15",
    solidBgClass: "bg-graph-roastlevel",
    ringClass: "ring-graph-roastlevel/50",
    get canvasColor() {
      return getCanvasColor("--color-graph-roastlevel");
    },
  },
  flavor: {
    icon: SparkleIcon,
    labelKey: "graph.nodeTypes.flavor",
    colorClass: "text-graph-flavor",
    bgTintClass: "bg-graph-flavor/15",
    solidBgClass: "bg-graph-flavor",
    ringClass: "ring-graph-flavor/50",
    get canvasColor() {
      return getCanvasColor("--color-graph-flavor");
    },
  },
  cafe: {
    icon: StorefrontIcon,
    labelKey: "graph.nodeTypes.cafe",
    colorClass: "text-graph-cafe",
    bgTintClass: "bg-graph-cafe/15",
    solidBgClass: "bg-graph-cafe",
    ringClass: "ring-graph-cafe/50",
    get canvasColor() {
      return getCanvasColor("--color-graph-cafe");
    },
  },
  keyword: {
    icon: TagIcon,
    labelKey: "graph.nodeTypes.keyword",
    colorClass: "text-graph-keyword",
    bgTintClass: "bg-graph-keyword/15",
    solidBgClass: "bg-graph-keyword",
    ringClass: "ring-graph-keyword/50",
    get canvasColor() {
      return getCanvasColor("--color-graph-keyword");
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
