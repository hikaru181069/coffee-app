/**
 * バックエンドの知識グラフ応答（{nodes, edges}）を、react-force-graph-2dが
 * 期待する形（{nodes, links}）へ変換する純粋関数。GraphCanvas.jsxから切り出した。
 *
 * degree（そのノードにつながっているエッジの数。属性ノードなら
 * 実質「つながっている記録の数」と同じ）をノードごとに数え、
 * graphNodeSizing.jsのサイズ計算の入力にする。
 *
 * @param {{ nodes: Array, edges: Array }} graph backend GET /api/graph のレスポンス
 * @returns {{ nodes: Array, links: Array }}
 */
export const buildForceGraphData = (graph) => {
  const degrees = new Map();
  graph.edges.forEach((edge) => {
    degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1);
    degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1);
  });

  return {
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      label: node.label,
      metadata: node.metadata,
      degree: degrees.get(node.id) ?? 0,
    })),
    links: graph.edges.map((edge) => ({ source: edge.source, target: edge.target })),
  };
};
