import { getNodeVisual } from "../features/graph/utils/nodeVisuals";
import styles from "./LandingHero.module.css";

/**
 * Landingページ専用の装飾的な知識グラフイラスト。
 *
 * 未ログインの訪問者には見せられる実データが無いため、Home画面の
 * GraphPreview（features/graph/components/GraphPreview.jsx）は使えない
 * （useGraph()が認証必須のAPIを叩く構造のため）。そのため固定座標の
 * サンプルノードだけを描く、DB/API非依存の純粋な装飾コンポーネントとして
 * 別に用意する。
 *
 * ノード2件（record）が、共有する属性ノード（origin・roastLevel）を介して
 * つながっている構図にした。単なる星型ではなく「記録どうしが属性を
 * 介してつながる」というConnectの体験（docs/product.mdのVision）を
 * そのまま図にしている。record→属性の一方向エッジのみで、
 * 属性どうしの直接エッジは持たない（docs/domain-model.mdのグラフ構造と
 * 一致させる）。
 *
 * 色はGraph画面と同じfeatures/graph/utils/nodeVisuals.jsを参照する
 * （新しい色を増やさない）。
 */
const NODES = [
  { id: "recordA", type: "record", x: 120, y: 150, r: 9 },
  { id: "recordB", type: "record", x: 280, y: 150, r: 9 },
  { id: "origin", type: "origin", x: 200, y: 70, r: 7 },
  { id: "roastLevel", type: "roastLevel", x: 200, y: 230, r: 7 },
  { id: "process", type: "process", x: 45, y: 90, r: 6 },
  { id: "flavor", type: "flavor", x: 355, y: 90, r: 6 },
];

const EDGES = [
  ["recordA", "origin"],
  ["recordB", "origin"],
  ["recordA", "roastLevel"],
  ["recordB", "roastLevel"],
  ["recordA", "process"],
  ["recordB", "flavor"],
];

const nodeById = Object.fromEntries(NODES.map((node) => [node.id, node]));

/** @param {{ variant?: "ambient" | "feature", className?: string }} props */
function LandingGraphIllustration({ variant = "feature", className = "" }) {
  const isAmbient = variant === "ambient";

  return (
    <svg
      viewBox="0 0 400 300"
      aria-hidden="true"
      className={`${styles.graphIllustration} ${isAmbient ? styles.graphAmbient : styles.graphFeature} ${className}`}
    >
      {EDGES.map(([fromId, toId]) => {
        const from = nodeById[fromId];
        const to = nodeById[toId];
        return (
          <line
            key={`${fromId}-${toId}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            className={styles.graphEdge}
          />
        );
      })}
      {NODES.map((node, index) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={node.r}
          className={`${styles.graphNode} ${getNodeVisual(node.type).colorClass}`}
          fill="currentColor"
          style={{ animationDelay: `${index * 260}ms` }}
        />
      ))}
    </svg>
  );
}

export default LandingGraphIllustration;
