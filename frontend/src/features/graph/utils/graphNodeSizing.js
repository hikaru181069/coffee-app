/**
 * ノードの見た目のサイズ計算（純粋関数。DB/HTTP/canvasに依存しない）。
 *
 * GraphCanvas.jsxから切り出した。degree（つながっている記録の数）が
 * 多いノードほど大きく描く。
 *
 * 以前は「degreeが1増えるごとに+1.2px、最大8件分（+9.6px）で頭打ち」という
 * 線形＋キャップ方式だったが、変化が小さすぎてユーザーが気づけなかった
 * （実機フィードバック）。平方根（sqrt）カーブに変更し、degreeが少ない
 * 範囲（1→6件など）でははっきり差が付き、多くなるほど伸びが穏やかに
 * なるようにした。線形のまま倍率だけ上げると、記録が多い産地（例:
 * よく飲むEthiopia）のノードが際限なく巨大化し、混雑を悪化させて
 * しまうため。
 */

export const RECORD_BASE_RADIUS = 16;
export const ATTRIBUTE_BASE_HALF_WIDTH = 15;
export const ATTRIBUTE_HALF_HEIGHT = 15;

// 選択中（?focus=やクリック）のノードは、枠線の色・太さだけでなく
// 形そのものも拡大する。密集したグラフの中でも「今フォーカスしている
// ノードはどれか」が一目で分かるようにするため
export const SELECTED_SCALE = 1.35;

// 2026-08-26、実機で確認したところ最初の値（6）では差がまだ弱いという
// フィードバックを受け、コントラストがはっきり付くまで引き上げた
const DEGREE_SIZE_SCALE = 18;
// 極端にdegreeが多いノード（記録数が非常に多い産地等）が青天井に
// 巨大化しないための安全弁。sqrtカーブ自体が伸びを穏やかにするため、
// 実用上はほぼ効かない想定
const MAX_DEGREE_FOR_SIZE = 60;

const sizeForDegree = (degree) =>
  Math.sqrt(Math.min(degree, MAX_DEGREE_FOR_SIZE)) * DEGREE_SIZE_SCALE;

export const recordRadius = (node, isSelected = false) => {
  const base = RECORD_BASE_RADIUS + sizeForDegree(node.degree);
  return isSelected ? base * SELECTED_SCALE : base;
};

export const attributeHalfWidth = (node, isSelected = false) => {
  const base = ATTRIBUTE_BASE_HALF_WIDTH + sizeForDegree(node.degree);
  return isSelected ? base * SELECTED_SCALE : base;
};

export const attributeHalfHeight = (isSelected = false) =>
  isSelected ? ATTRIBUTE_HALF_HEIGHT * SELECTED_SCALE : ATTRIBUTE_HALF_HEIGHT;

// forceCollideに渡す、ノードごとの衝突半径に足すラベル分の余白。
// ラベル（チップの下に最大100px幅で表示）の実際の幅を毎回測るのではなく、
// 経験的な固定値で十分な余白を確保する
const LABEL_CLEARANCE = 20;

/**
 * d3-forceのforceCollideへ渡す、ノードごとの衝突半径。
 * 選択状態は問わない（選択のたびに衝突半径が変わるとシミュレーションが
 * 無用に揺れ動くため、非選択時のサイズで固定する）。
 */
export const nodeCollideRadius = (node) => {
  const shapeRadius =
    node.type === "record"
      ? recordRadius(node)
      : Math.hypot(attributeHalfWidth(node), attributeHalfHeight());
  return shapeRadius + LABEL_CLEARANCE;
};
