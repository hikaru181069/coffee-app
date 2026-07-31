import { computeLayout } from "./forceLayout";

/**
 * APIが返すグラフ形式（docs/knowledge-graph.md）を、
 * React Flowが要求する形式へ変換する。
 *
 * coreロジック（backend/core/graph）やAPIレスポンスの形を、
 * 描画ライブラリ固有の形式に直接密結合させないための層
 * （prompts/05 の Constraints「React描画ライブラリ固有形式へcoreロジック
 * を密結合しない」）。将来ライブラリを変える場合、直すのはこの
 * ファイルだけで済む。
 *
 * @param {{ nodes: Array, edges: Array }} graph GET /api/graph の応答
 * @returns {{ nodes: Array, edges: Array }} React Flow用の要素
 */
export const toReactFlowElements = (graph) => {
  const positions = computeLayout(graph.nodes, graph.edges);

  const nodes = graph.nodes.map((node) => ({
    id: node.id,
    // record か、それ以外（属性）かの2種類だけコンポーネントを分ける。
    // 属性6種はすべて同じAttributeNodeが担当し、data.type で
    // アイコン・色を出し分ける（utils/nodeVisuals.js）
    type: node.type === "record" ? "record" : "attribute",
    position: positions[node.id] ?? { x: 0, y: 0 },
    data: node,
  }));

  const edges = graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    // 種類ごとに色分けはしない。属性はノード側の色・アイコンで
    // 十分に区別できるため、エッジまで塗り分けると画面が煩雑になる
    type: "smoothstep",
  }));

  return { nodes, edges };
};
