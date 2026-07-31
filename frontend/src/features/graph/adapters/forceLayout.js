import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";

/**
 * ノード/エッジの座標を力学シミュレーションで計算する純粋関数。
 *
 * React Flow 自体は自動レイアウトを持たないため、座標計算だけを
 * d3-force に任せる。よく一緒に記録される属性（同じ産地・フレーバー）は
 * エッジで強く引き合うため、近くに集まって描画される。
 * これが「自分の好みの傾向を視覚的に発見する」体験の土台になる
 * （docs/vision.md の Discover）。
 *
 * 「物理シミュレーション設定を無意味に複雑化しない」制約（prompts/05）に
 * 従い、パラメータは一般的な既定値に近い値のみを使う。
 * また、ドラッグ操作のたびに再計算する双方向のシミュレーションにはせず、
 * データが変わったときに一度だけ収束させて座標を確定する
 * （tickを固定回数まわして止める。requestAnimationFrameは使わない）。
 *
 * @param {Array<{id: string}>} nodes
 * @param {Array<{source: string, target: string}>} edges
 * @param {object} [options]
 * @param {number} [options.width]
 * @param {number} [options.height]
 * @returns {Record<string, {x: number, y: number}>} ノードIDごとの座標
 */
export const computeLayout = (nodes, edges, { width = 900, height = 600 } = {}) => {
  if (nodes.length === 0) return {};

  // d3-forceはシミュレーション中にノード/エッジのオブジェクトへ
  // x, y, vx, vy を書き込む。呼び出し元のデータを汚さないよう、
  // 計算専用の軽いコピーを作る
  const simulationNodes = nodes.map((node) => ({ id: node.id }));
  const simulationLinks = edges.map((edge) => ({ source: edge.source, target: edge.target }));

  const simulation = forceSimulation(simulationNodes)
    .force(
      "link",
      forceLink(simulationLinks)
        .id((node) => node.id)
        .distance(90),
    )
    // ノード同士を反発させる。値が強すぎるとレイアウトが広がりすぎ、
    // 弱すぎると重なる。一般的に使われる範囲の値にとどめている
    .force("charge", forceManyBody().strength(-220))
    .force("center", forceCenter(width / 2, height / 2))
    // ノード同士が重ならないようにする衝突判定。
    // 属性ノード（AttributeNode）はテキストを含む横長の四角（最大120px幅）
    // なので、円形のrecordノード（直径64px）を基準にした半径だと
    // ラベル同士が重なって読めなくなる。実際の見た目に合わせて広めに取る
    .force("collide", forceCollide(58))
    .stop();

  // 画面に描画しながら動かす（interactive）のではなく、
  // 一定回数tickを進めて収束させてから結果だけを使う
  const TICK_COUNT = 300;
  for (let i = 0; i < TICK_COUNT; i += 1) {
    simulation.tick();
  }

  return Object.fromEntries(
    simulationNodes.map((node) => [node.id, { x: node.x, y: node.y }]),
  );
};
