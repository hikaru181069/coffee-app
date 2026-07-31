import { Handle, Position } from "@xyflow/react";

/**
 * すべてのカスタムノードに付ける接続点。
 *
 * React Flow はカスタムノードを使う場合、エッジをどこに繋ぐかを
 * 明示するために <Handle/> を置く必要がある。
 * このグラフは「フローチャート」ではなく無向に近い関係図なので、
 * 上下左右の向きに意味は無い。見た目にも出したくないので
 * 透明・最小サイズにし、接続の実体としてだけ機能させる。
 */
function NodeHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

export default NodeHandles;
