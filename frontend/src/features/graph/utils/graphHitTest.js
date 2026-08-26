import { recordRadius, attributeHalfWidth, attributeHalfHeight } from "./graphNodeSizing";

/**
 * クリックの当たり判定用（純粋関数。DB/HTTP/canvasに依存しない）。
 *
 * GraphCanvas.jsxから切り出した。drawNodeと同じ形（record: 円、
 * attribute: 角丸矩形）で当たり判定する。
 *
 * 視覚サイズぴったりだと、ノードの端に近い位置をクリックしたときに
 * 反応しないことがある（実機フィードバック）ため、視覚サイズより
 * 少し広めの当たり判定にする。選択時の拡大表示（SELECTED_SCALE、
 * 描画・force-graph自身のポインターエリア用）とは独立した、
 * クリック専用の余白
 */
const HIT_PADDING = 4;

/**
 * グラフ座標(x, y)に該当するノードを探す。
 *
 * @param {Array} nodes GraphCanvas内部形式のノード配列（x, y, degree, type等を持つ）
 * @param {number} x screen2GraphCoordsで求めたグラフ座標
 * @param {number} y screen2GraphCoordsで求めたグラフ座標
 * @param {string|null} selectedNodeId
 * @returns {object|null}
 */
export const findNodeAtGraphPoint = (nodes, x, y, selectedNodeId) =>
  nodes.find((node) => {
    if (node.x == null || node.y == null) return false;
    const isSelected = node.id === selectedNodeId;

    if (node.type === "record") {
      const dx = node.x - x;
      const dy = node.y - y;
      return Math.sqrt(dx * dx + dy * dy) <= recordRadius(node, isSelected) + HIT_PADDING;
    }

    const halfWidth = attributeHalfWidth(node, isSelected) + HIT_PADDING;
    const halfHeight = attributeHalfHeight(isSelected) + HIT_PADDING;
    return Math.abs(node.x - x) <= halfWidth && Math.abs(node.y - y) <= halfHeight;
  }) ?? null;
