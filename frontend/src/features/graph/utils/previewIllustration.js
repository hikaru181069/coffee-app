/**
 * Home画面のGraphカードに表示する、知識グラフのごく薄いプレビュー用の
 * データ選定・簡易レイアウトを行う純粋関数。
 *
 * 完全なGraphCanvas（react-force-graph-2d）は使わない。この用途は
 * 「読める必要はないが、本物のデータであること」だけを伝える薄い装飾
 * であり、物理演算の精度もインタラクションも不要なため
 * （features/graph/components/GraphPreview.jsx参照。以前は静的な
 * 抽象イラストだったが、実データの一部を薄く表示する方針へ変更した）。
 *
 * 選定基準は「直近の記録」だけではなく、その記録が持つ属性ノードも
 * 含める。産地・フレーバーなどは記録を重ねるたびに同じノードへ収束する
 * ため、直近の記録を起点にしても、自然と過去から存在する既存ノードへ
 * つながる（「新しいものが既にある大きな網へつながっていく」絵になる。
 * ユーザーとの相談で決定）。
 */

const RECENT_RECORD_LIMIT = 5;
// カード右側に収める正方形寄りの比率（GraphPreview.jsxのGraphIllustration参照。
// 以前はカード上部に横長で置いていた）
const VIEWBOX_WIDTH = 140;
const VIEWBOX_HEIGHT = 100;
// ノードを意図的に枠の外まではみ出させる余白。イラストが「全体のごく
// 一部」に見えるようにするため（下の数字表示と矛盾しないように）
const EDGE_PADDING_X = 14;
const EDGE_PADDING_Y = 12;

/** 文字列から決定的な疑似乱数を作る。ノードIDが同じなら常に同じ位置になる */
const hashString = (value) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const positionFor = (id) => {
  const x = -EDGE_PADDING_X + (hashString(`${id}:x`) % (VIEWBOX_WIDTH + EDGE_PADDING_X * 2));
  const y = -EDGE_PADDING_Y + (hashString(`${id}:y`) % (VIEWBOX_HEIGHT + EDGE_PADDING_Y * 2));
  return { x, y };
};

/**
 * グラフから「直近の記録＋その属性ノード」だけを抜き出し、
 * 簡易レイアウト（決定的な疑似乱数による散布）を付けて返す。
 *
 * @param {{nodes: Array, edges: Array}} graph GET /api/graph のレスポンス
 * @returns {{ nodes: Array, edges: Array, viewBox: string }}
 */
export const buildPreviewLayout = (graph) => {
  const recentRecordIds = new Set(
    graph.nodes
      .filter((node) => node.type === "record")
      .sort((a, b) => new Date(b.metadata.consumedAt) - new Date(a.metadata.consumedAt))
      .slice(0, RECENT_RECORD_LIMIT)
      .map((node) => node.id),
  );

  const relevantEdges = graph.edges.filter((edge) => recentRecordIds.has(edge.source));

  const nodeIds = new Set(recentRecordIds);
  relevantEdges.forEach((edge) => nodeIds.add(edge.target));

  const nodeMap = new Map(graph.nodes.map((node) => [node.id, node]));
  const nodes = [...nodeIds]
    .map((id) => nodeMap.get(id))
    .filter(Boolean)
    .map((node) => ({ id: node.id, type: node.type, ...positionFor(node.id) }));

  const positionById = new Map(nodes.map((node) => [node.id, node]));
  const edges = relevantEdges
    .map((edge) => {
      const source = positionById.get(edge.source);
      const target = positionById.get(edge.target);
      if (!source || !target) return null;
      return { id: edge.id, x1: source.x, y1: source.y, x2: target.x, y2: target.y };
    })
    .filter(Boolean);

  return { nodes, edges, viewBox: `0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}` };
};
