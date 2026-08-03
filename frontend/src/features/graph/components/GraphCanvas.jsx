import { useMemo } from "react";
import { ReactFlow, Background, Controls } from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import RecordNode from "./nodeTypes/RecordNode";
import AttributeNode from "./nodeTypes/AttributeNode";
import { toReactFlowElements } from "../adapters/reactFlowAdapter";

/**
 * 知識グラフの描画本体。React Flow をラップする。
 *
 * ズーム/パンは React Flow が標準で持つ（<Controls/> で明示的な
 * ボタンも出す）。物理シミュレーションはデータが変わったときに
 * 一度だけ座標を決めるためのもの（adapters/forceLayout.js）で、
 * ここでは「決まった座標を描画する」だけに徹する。
 *
 * nodeTypes を { record, attribute } の2つに絞っているのは
 * adapters/reactFlowAdapter.js の変換と対になっている。
 *
 * interactive=false は Home のグラフプレビューなど、ページの一部に
 * 縮小表示するだけで操作させたくない場合に使う
 * （ドラッグ・ズーム・パンとControlsを止める。既定はtrueで従来通り）。
 */
const NODE_TYPES = { record: RecordNode, attribute: AttributeNode };

function GraphCanvas({ graph, selectedNodeId, onSelectNode, interactive = true }) {
  const { nodes, edges } = useMemo(() => toReactFlowElements(graph), [graph]);

  const styledNodes = useMemo(
    () => nodes.map((node) => ({ ...node, selected: node.id === selectedNodeId })),
    [nodes, selectedNodeId],
  );

  const handleNodeClick = (_event, node) => onSelectNode(node);
  // 背景（何もないところ）をクリックしたら選択を解除する
  const handlePaneClick = () => onSelectNode(null);

  return (
    <ReactFlow
      nodes={styledNodes}
      edges={edges}
      nodeTypes={NODE_TYPES}
      onNodeClick={handleNodeClick}
      onPaneClick={handlePaneClick}
      onInit={(instance) => instance.fitView({ padding: 0.2 })}
      // ノードの位置はforceLayoutが決めた座標をそのまま使う。
      // ユーザーがドラッグして動かすことは許可するが、シミュレーションを
      // 再実行はしない（「物理設定を無意味に複雑化しない」ため）
      nodesDraggable={interactive}
      nodesConnectable={false}
      edgesFocusable={false}
      zoomOnScroll={interactive}
      panOnDrag={interactive}
      minZoom={0.2}
      maxZoom={2}
    >
      <Background gap={24} />
      {interactive && <Controls showInteractive={false} />}
    </ReactFlow>
  );
}

export default GraphCanvas;
