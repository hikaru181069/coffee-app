import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { forceCollide } from "d3-force";

import { getNodeVisual } from "../utils/nodeVisuals";
import { getNodeIconImage } from "../utils/canvasIcons";

/**
 * 知識グラフの描画本体。
 *
 * 2026-08、React Flow + 自前d3-force統合（ドラッグ中にカメラが競合して
 * ちらつく、座標更新がReact Flow自身のドラッグ描画と競合するなど）を
 * 2度修正しても解消しなかったため、canvas描画・物理演算を内蔵した
 * 専用ライブラリ react-force-graph-2d へ置き換えた。
 * ドラッグ中のノードのピン留め・再加熱はライブラリ内部の実装に任せる
 * （前回はここを自前実装してReact Flowの描画と競合するバグを作っていた）。
 * canvasは仮想DOMの外で自分のrequestAnimationFrameループを持つため、
 * 物理演算が収束した後もホバー・ズーム・パンは重い再レンダーを介さず
 * 滑らかに動く。
 *
 * FORCE_PARAMSは元々adapters/forceLayout.js（Phase 5時点、削除済み）と
 * 同じ値（linkDistance: 90, chargeStrength: -220, collideRadius: 58）を
 * 使っていたが、react-force-graph-2d（内部ではd3-force-3dを使用）では
 * 同じ値でも収束後のレイアウトが明らかに詰まって見えたため、
 * chargeStrengthだけ強めに調整している。原因はまだ特定できていない
 * （d3-force-3dとd3-forceで内部実装が違う可能性がある）。
 *
 * 既知の不具合と対処（force-graph.mjs本体を読んで原因を特定した）:
 *
 * 1. onNodeClick / onBackgroundClickが発火しない
 *    force-graphは`pointermove`のたびに「onBackgroundClickが設定されて
 *    いれば、pointerType==='mouse'の移動量を一切問わずisPointerDragging=true
 *    にする」ヒューリスティックを持つ（ズーム操作と誤検知させないための
 *    実装）。実際のマウスクリックはpointerdown→pointerupの間にほぼ必ず
 *    1px以上動くため、このヒューリスティックが常に発火し、pointerup側で
 *    「ドラッグ後なのでクリックとして扱わない」と判定されてしまう。
 *    さらにパン操作（enablePanInteraction）自体もd3-zoomの'zoom'イベントで
 *    同じisPointerDragging=trueを立てるため、onBackgroundClickを外すだけ
 *    では解決しない。
 *    → ライブラリ側のクリック判定に頼らず、pointerdown/pointerupの座標を
 *      自前で比較し、閾値以内ならscreen2GraphCoordsで求めたグラフ座標に
 *      対してdrawNodeと同じ当たり判定（円・角丸矩形）を自前で行う
 *      （下記 findNodeAtClientPoint）。
 *
 * 2. width/heightを明示的に渡すとズーム・ドラッグが効かなくなる
 *    width/heightのonChangeはadjustCanvasSizeを呼び、その中で
 *    zoom.translateBy(...)を実行する。これはd3-zoomの'zoom'ハンドラを
 *    発火させ、上記1と同じ理由でisPointerDragging=trueを立てる。
 *    ResizeObserverでsizeを継続更新していると、この再発火が操作中にも
 *    起こり得てズーム・ドラッグを壊す。
 *    → sizeは「初回の非ゼロ計測値で固定し、以後ResizeObserverが発火しても
 *      更新しない」方式にする。ウィンドウの動的リサイズには追従しなくなるが、
 *      安定した操作性を優先する（下記のuseEffect参照）。
 */
const FORCE_PARAMS = {
  linkDistance: 90,
  chargeStrength: -800,
  collideRadius: 58,
};

const RECORD_BASE_RADIUS = 16;
const RECORD_DEGREE_CAP = 8;
const RECORD_DEGREE_SCALE = 1.2;

const ATTRIBUTE_BASE_HALF_WIDTH = 30;
const ATTRIBUTE_HALF_HEIGHT = 14;
const ATTRIBUTE_DEGREE_CAP = 8;
const ATTRIBUTE_DEGREE_SCALE = 2;

const CLICK_TOLERANCE_PX = 6;

// frontend/src/App.css の --ctp-* と同じ値（canvasはTailwindクラスを
// 使えないため、utils/nodeVisuals.js の canvasColor と同様に直接持つ）
const CTP = {
  mantle: "#0f1011",
  surface1: "#232326",
  text: "#f7f8f8",
  subtext0: "#8a8f98",
  yellow: "#f9e2af",
};

const recordRadius = (node) => RECORD_BASE_RADIUS + Math.min(node.degree, RECORD_DEGREE_CAP) * RECORD_DEGREE_SCALE;
const attributeHalfWidth = (node) =>
  ATTRIBUTE_BASE_HALF_WIDTH + Math.min(node.degree, ATTRIBUTE_DEGREE_CAP) * ATTRIBUTE_DEGREE_SCALE;

/** linkのsource/targetは、シミュレーション開始後は文字列IDからノード本体への参照へ差し替わる */
const linkEndpointId = (endpoint) => (typeof endpoint === "object" ? endpoint.id : endpoint);

const truncateToWidth = (ctx, text, maxWidth) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
};

const isNodeDimmed = (node, { interactive, hoveredNodeId, adjacency }) =>
  Boolean(interactive && hoveredNodeId && node.id !== hoveredNodeId && !adjacency.get(hoveredNodeId)?.has(node.id));

function drawNode(node, ctx, globalScale, { selectedNodeId, hoveredNodeId, adjacency, interactive }) {
  const visual = getNodeVisual(node.type);
  const isRecord = node.type === "record";
  const selected = node.id === selectedNodeId;
  const dimmed = isNodeDimmed(node, { interactive, hoveredNodeId, adjacency });

  ctx.save();
  ctx.globalAlpha = dimmed ? 0.25 : 1;

  const fontSize = Math.max(11 / globalScale, 3);
  const borderWidth = (selected ? 2.5 : 1.5) / globalScale;

  if (isRecord) {
    const radius = recordRadius(node);

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = CTP.mantle;
    ctx.fill();
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = selected ? visual.canvasColor : CTP.surface1;
    ctx.stroke();

    const icon = getNodeIconImage(node.type, visual.canvasColor);
    const iconSize = radius * 0.65;
    if (icon) ctx.drawImage(icon, node.x - iconSize / 2, node.y - radius * 0.55, iconSize, iconSize);

    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = CTP.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(truncateToWidth(ctx, node.label ?? "", radius * 1.8), node.x, node.y + radius * 0.15);

    if (node.metadata?.rating != null) {
      ctx.font = `${fontSize * 0.85}px "Space Mono", monospace`;
      ctx.fillStyle = CTP.yellow;
      ctx.fillText(`★ ${node.metadata.rating}`, node.x, node.y + radius * 0.62);
    }
  } else {
    const halfWidth = attributeHalfWidth(node);

    ctx.beginPath();
    ctx.roundRect(node.x - halfWidth, node.y - ATTRIBUTE_HALF_HEIGHT, halfWidth * 2, ATTRIBUTE_HALF_HEIGHT * 2, 6);
    ctx.fillStyle = CTP.mantle;
    ctx.fill();
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = selected ? visual.canvasColor : CTP.surface1;
    ctx.stroke();

    const icon = getNodeIconImage(node.type, visual.canvasColor);
    const iconSize = 14;
    if (icon) ctx.drawImage(icon, node.x - halfWidth + 6, node.y - iconSize / 2, iconSize, iconSize);

    const recordCount = node.metadata?.recordCount ?? 0;
    const countText = recordCount > 1 ? String(recordCount) : "";
    ctx.font = `${fontSize * 0.8}px "Space Mono", monospace`;
    const countWidth = countText ? ctx.measureText(countText).width + 6 : 0;

    ctx.font = `${fontSize}px Inter, sans-serif`;
    ctx.fillStyle = CTP.text;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(
      truncateToWidth(ctx, node.label ?? "", halfWidth * 2 - 24 - countWidth),
      node.x - halfWidth + 24,
      node.y,
    );

    if (countText) {
      ctx.font = `${fontSize * 0.8}px "Space Mono", monospace`;
      ctx.fillStyle = CTP.subtext0;
      ctx.textAlign = "right";
      ctx.fillText(countText, node.x + halfWidth - 6, node.y);
    }
  }

  ctx.restore();
}

/** onNodeClick等の当たり判定用。drawNodeと同じ形をベタ塗りするだけ */
function paintNodePointerArea(node, color, ctx) {
  ctx.fillStyle = color;
  if (node.type === "record") {
    const radius = recordRadius(node);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    const halfWidth = attributeHalfWidth(node);
    ctx.beginPath();
    ctx.roundRect(node.x - halfWidth, node.y - ATTRIBUTE_HALF_HEIGHT, halfWidth * 2, ATTRIBUTE_HALF_HEIGHT * 2, 6);
    ctx.fill();
  }
}

function GraphCanvas({ graph, selectedNodeId, onSelectNode, interactive = true }) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const isDraggingRef = useRef(false);
  const hasSettledRef = useRef(false);
  // 収束前（開いた瞬間の追従アニメーション中）にユーザーがズーム・パン・
  // ドラッグのいずれかに触れたら、以後は二度とカメラを自動フィットしない。
  // onEngineTickは収束前は毎フレームzoomToFit(0, 40)を呼んでおり、
  // これは即座に（アニメーション無しで）カメラを戻すため、収束前に
  // ユーザーがズーム・パンを試みても1フレーム以内に元へ戻され、
  // 「何も反応しない」ように見えてしまう不具合を踏んだ。
  // ノードドラッグはisDraggingRefで個別に保護されていたが、背景パンは
  // 保護が無かった（d3-zoom側のドラッグ処理でありisDraggingRefの対象外）
  const userInteractedRef = useRef(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    // 初回の非ゼロ計測値で固定する。ResizeObserverが以後も発火し続けて
    // width/heightをforce-graphへ渡し直すと、ズーム・ドラッグが効かなく
    // なる不具合を踏んだ（ファイル冒頭のコメント参照）
    const updateSize = () => {
      setSize((prev) => {
        if (prev.width > 0 && prev.height > 0) return prev;
        const next = { width: el.clientWidth, height: el.clientHeight };
        return next.width > 0 && next.height > 0 ? next : prev;
      });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    // wheel/pointerdownはここでは観測するだけ（preventDefault等はしない）。
    // force-graph自身のズーム・パン・ドラッグ処理はそのまま動かしつつ、
    // 「ユーザーが触れた」事実だけを記録する。
    //
    // captureフェーズで登録するのが必須: d3-zoom自身のwheel/mousedown
    // ハンドラ（canvas要素に直接登録されている）は内部で
    // event.stopImmediatePropagation()を呼ぶため、bubbleフェーズで
    // 親要素（このコンテナ）に登録したリスナーには一切イベントが
    // 届かない。captureフェーズはDOMツリーを上から下へ辿る際に先に
    // 発火するため、canvas側の後続のstopPropagationの影響を受けない
    // （実際に踏んだ不具合: wheelでのズームが「初回だけ効かず、
    // 待てば効く」ように見えた原因）
    const markInteracted = () => {
      userInteractedRef.current = true;
    };
    el.addEventListener("wheel", markInteracted, { passive: true, capture: true });
    el.addEventListener("pointerdown", markInteracted, { capture: true });
    return () => {
      el.removeEventListener("wheel", markInteracted, { capture: true });
      el.removeEventListener("pointerdown", markInteracted, { capture: true });
    };
  }, []);

  const { nodes, links } = useMemo(() => {
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
  }, [graph]);

  // ホバー中のノードの直接のつながりだけを目立たせるための隣接表
  const adjacency = useMemo(() => {
    const map = new Map();
    links.forEach((link) => {
      if (!map.has(link.source)) map.set(link.source, new Set());
      if (!map.has(link.target)) map.set(link.target, new Set());
      map.get(link.source).add(link.target);
      map.get(link.target).add(link.source);
    });
    return map;
  }, [links]);

  // グラフのデータそのものが変わったら（フィルター変更など）、
  // 次の収束を「開いた瞬間」として扱い、カメラを追従させ直す
  useEffect(() => {
    hasSettledRef.current = false;
    userInteractedRef.current = false;
  }, [nodes, links]);

  useEffect(() => {
    // 初回レンダーはsizeがまだ0のためForceGraph2D自体が描画されておらず
    // fgRef.currentがnull。sizeも依存配列に入れて、canvasが実際に
    // マウントされたあとにも改めて力を設定し直す
    // （このガードだけだとnodes/linksが変わらない限り二度と実行されず、
    // 独自のFORCE_PARAMSが一生適用されないまま、というバグを実際に踏んだ）
    if (!fgRef.current) return;
    fgRef.current.d3Force("link")?.distance(FORCE_PARAMS.linkDistance);
    fgRef.current.d3Force("charge")?.strength(FORCE_PARAMS.chargeStrength);
    fgRef.current.d3Force("collide", forceCollide(FORCE_PARAMS.collideRadius));
  }, [nodes, links, size.width, size.height]);

  const visualContext = { selectedNodeId, hoveredNodeId, adjacency, interactive };
  // { nodes, links } をJSX内で直接書くと、hoverなど無関係な再描画のたびに
  // 新しいオブジェクト参照になり、ライブラリがグラフデータそのものが
  // 変わったと誤解してシミュレーションを最初からやり直してしまう
  // （実際に踏んだ不具合。ホバーするたびにレイアウトが再抽選されていた）
  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  // onNodeClick/onBackgroundClickが機能しないためのクリック代替実装。
  // pointerdown→pointerupの移動量が閾値以内なら「クリック」とみなし、
  // screen2GraphCoordsで求めたグラフ座標にdrawNodeと同じ形（円・角丸矩形）の
  // 当たり判定を自前で行う。ホバー状態（hoveredNodeId）には頼らない
  // ——isPointerDragging誤検知（ファイル冒頭コメント参照）と同じ理由で、
  // クリックの瞬間にホバーがnullへリセットされることがあるため
  const pointerDownRef = useRef(null);

  const findNodeAtClientPoint = (clientX, clientY) => {
    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas || !fgRef.current) return null;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = fgRef.current.screen2GraphCoords(clientX - rect.left, clientY - rect.top);
    return (
      nodes.find((node) => {
        if (node.x == null || node.y == null) return false;
        if (node.type === "record") {
          const dx = node.x - x;
          const dy = node.y - y;
          return Math.sqrt(dx * dx + dy * dy) <= recordRadius(node);
        }
        const halfWidth = attributeHalfWidth(node);
        return Math.abs(node.x - x) <= halfWidth && Math.abs(node.y - y) <= ATTRIBUTE_HALF_HEIGHT;
      }) ?? null
    );
  };

  const handlePointerDown = (event) => {
    if (!interactive) return;
    pointerDownRef.current = { x: event.clientX, y: event.clientY };
  };

  const handlePointerUp = (event) => {
    if (!interactive || !pointerDownRef.current) return;
    const dx = event.clientX - pointerDownRef.current.x;
    const dy = event.clientY - pointerDownRef.current.y;
    pointerDownRef.current = null;
    if (Math.sqrt(dx * dx + dy * dy) > CLICK_TOLERANCE_PX) return;
    const node = findNodeAtClientPoint(event.clientX, event.clientY);
    onSelectNode(node ? { id: node.id, data: node } : null);
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full"
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
    >
      {size.width > 0 && size.height > 0 && (
        <ForceGraph2D
          ref={fgRef}
          graphData={graphData}
          width={size.width}
          height={size.height}
          backgroundColor="#08090a"
          nodeCanvasObject={(node, ctx, globalScale) => drawNode(node, ctx, globalScale, visualContext)}
          nodePointerAreaPaint={paintNodePointerArea}
          linkColor={(link) => {
            const touchesHovered =
              hoveredNodeId &&
              (linkEndpointId(link.source) === hoveredNodeId || linkEndpointId(link.target) === hoveredNodeId);
            const dimmed = interactive && hoveredNodeId && !touchesHovered;
            return dimmed ? "rgba(62, 62, 68, 0.25)" : "rgba(62, 62, 68, 0.9)";
          }}
          linkWidth={1}
          onNodeHover={(node) => {
            if (!interactive) return;
            setHoveredNodeId(node?.id ?? null);
          }}
          onNodeDrag={() => {
            isDraggingRef.current = true;
          }}
          onNodeDragEnd={() => {
            isDraggingRef.current = false;
          }}
          onEngineTick={() => {
            // 開いた瞬間の収束アニメーション中だけカメラを追従させる。
            // ドラッグで再加熱した後や、ユーザーが一度でもズーム・パンに
            // 触れた後は追従しない（ファイル冒頭のuserInteractedRefコメント参照）
            if (!hasSettledRef.current && !isDraggingRef.current && !userInteractedRef.current) {
              fgRef.current?.zoomToFit(0, 40);
            }
          }}
          onEngineStop={() => {
            hasSettledRef.current = true;
            if (!isDraggingRef.current && !userInteractedRef.current) fgRef.current?.zoomToFit(400, 40);
          }}
          enableNodeDrag={interactive}
          enableZoomInteraction={interactive}
          enablePanInteraction={interactive}
          minZoom={0.2}
          maxZoom={3}
          // cooldownTimeは壁時計時間なので指定しない（既定15000ms）。
          // canvas描画（アイコン・テキスト測定など）はSVGより1フレームの
          // コストが重く、短く区切ると実際のtick数が足りないまま収束前に
          // 打ち切られ、詰まったレイアウトで固まってしまう不具合を実際に踏んだ。
          // alpha減衰によるtick回数ベースの自動停止（cooldownTicksの既定は
          // Infinity）に任せる
        />
      )}
    </div>
  );
}

export default GraphCanvas;
