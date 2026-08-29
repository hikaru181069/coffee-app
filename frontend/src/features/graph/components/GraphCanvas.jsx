import { useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import { forceCollide, forceX, forceY } from "d3-force";

import { getNodeVisual } from "../utils/nodeVisuals";
import { getNodeIconImage } from "../utils/canvasIcons";
import { getCanvasColor } from "../utils/canvasColors";
import { getOriginHex } from "../../coffee-records/utils/originAccent";
import {
  recordRadius,
  attributeHalfWidth,
  attributeHalfHeight,
  nodeCollideRadius,
} from "../utils/graphNodeSizing";
import { findNodeAtGraphPoint } from "../utils/graphHitTest";
import { buildForceGraphData } from "../utils/graphAdapter";

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
 * ノードサイズ計算・クリックの当たり判定・{nodes,links}への変換は、
 * 2026-08の「Graph画面の作り込み」で features/graph/utils/ の
 * graphNodeSizing.js・graphHitTest.js・graphAdapter.js へ切り出した
 * （CLAUDE.md「1ファイルへ複数の責務を集中させないでください」。
 * DB/HTTP/canvasに依存しない純粋関数なので、初めてユニットテストも
 * 追加した）。このファイルは物理演算の適用・カメラ追従・イベント配線・
 * canvas描画（drawNode/paintNodePointerAreaはcanvas contextに強く依存する
 * ためここに残す）のオーケストレーションに専念する。
 *
 * FORCE_PARAMSは元々adapters/forceLayout.js（Phase 5時点、削除済み）と
 * 同じ値（linkDistance: 90, chargeStrength: -220, collideRadius: 58）を
 * 使っていたが、react-force-graph-2d（内部ではd3-force-3dを使用）では
 * 同じ値でも収束後のレイアウトが明らかに詰まって見えたため、
 * chargeStrengthだけ強めに調整していた（原因はまだ特定できていない。
 * d3-force-3dとd3-forceで内部実装が違う可能性がある）。2026-08、
 * collideRadiusを全ノード一律の固定値からノードごとの実サイズ＋ラベル分の
 * 余白に連動する関数（graphNodeSizing.jsのnodeCollideRadius）に変更した
 * ことで、chargeStrengthも穏やかな値に調整し直した。
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
 *      （findNodeAtClientPoint、当たり判定本体はgraphHitTest.js参照）。
 *      2026-08、クリック判定が不安定という指摘を受け、閾値
 *      （CLICK_TOLERANCE_PX）を緩和し、当たり判定自体にも視覚サイズより
 *      少し広いヒットパディングを追加した。
 *
 * 2. width/heightを明示的に渡すとズーム・ドラッグが効かなくなる
 *    width/heightのonChangeはadjustCanvasSizeを呼び、その中で
 *    zoom.translateBy(...)を実行する。これはd3-zoomの'zoom'ハンドラを
 *    発火させ、上記1と同じ理由でisPointerDragging=trueを立てる。
 *    2026-08、これを理由にcanvasサイズを初回計測値のまま恒久的に固定して
 *    いたが、リサイズに一切追従しないのは副作用が大きいと判断し見直した。
 *    クリック判定は既にisPointerDraggingへ依存しない自前実装（上記1）に
 *    なっているため、ResizeObserverの発火をデバウンスした上でsizeを
 *    更新できるようにし、サイズ変更直後にfitCameraで視点のずれを補正する
 *    方式にした（下記のuseEffect参照）。純粋なズーム・パン操作への影響は
 *    実機で確認する。
 *
 * 3. onEngineTick / onEngineStopが一度も発火しない
 *    当初はカメラ追従をこの2つのコールバック（毎tick呼ばれる想定）で
 *    駆動していたが、実際にはbounding box（getGraphBbox）を見るとノードは
 *    確かに力学シミュレーションで広がっているにもかかわらず、
 *    onEngineTick/onEngineStopのどちらも一度も呼ばれないことをカウンタを
 *    仕込んで確認した。react-force-graph-2d（react-kapsule経由）と
 *    force-graph本体のプロパティ連携（linkKapsule／linkProp）を読んでも
 *    明確な原因までは特定できなかった（2026-08、react-force-graph-2d/
 *    force-graphとも公開されている最新バージョンで確認済みだが解消して
 *    いない）。
 *    → ライブラリのtickコールバックに依存せず、グラフデータが変わる
 *      （＝新しく開いた）たびに自前のrequestAnimationFrameループを
 *      一定時間（FOLLOW_DURATION_MS）走らせ、その間毎フレームfitCameraを
 *      呼んでカメラを追従させる方式に置き換えた（下記のuseEffect参照）。
 *
 * なお、「収束中に一瞬ノードが巨大化して見える」という2026-08の報告は、
 * 当初はここでのカメラ追従（fitCameraのbounding boxがまだ小さいうちに
 * ズームが寄りすぎるフラッシュ）が原因と考え、アニメーション時間を
 * 持たせる対処をしていた。しかし実際にはこれとは別の不具合で、
 * 「グラフ画面を開いたまま他のタブ・アプリへ切り替えて放置すると発生し、
 * リロードすると直る」という条件だったと判明した（ユーザーへの
 * ヒアリングで判明）。force-graph.mjs本体を読み直したところ、
 * canvasの内部解像度（devicePixelRatio依存）がwidth/heightのprop変化時
 * にしか再計算されない一方、毎フレームの再描画はその時点の
 * devicePixelRatioを読み直すため、バックグラウンドのタブでOS/ブラウザの
 * 挙動によりdevicePixelRatioがずれるとノードが実際より大きく描かれる、
 * という仕組みだと特定した。発生条件が特殊でリロードという回避策も
 * あるため、ユーザーと相談のうえ今回は修正を見送り、IMPLEMENTATION.mdへ
 * 既知の問題として記録するにとどめている（旧来の「カメラのフラッシュ」
 * という診断は誤りだったため、対応するズームクランプ等の対処は行わない）。
 */
const FORCE_PARAMS = {
  linkDistance: 100,
  chargeStrength: -450,
};

const CLICK_TOLERANCE_PX = 8;

// ラベルはチップの下に出す（Obsidianのグラフを参考に、チップ内へ
// 詰め込んで過度に省略されるのを避ける）。省略が必要になる場面
// 自体を減らすため、チップの幅より大きく余裕を持たせる
const LABEL_MAX_WIDTH = 100;
const LABEL_GAP = 4;

// カメラの自動フィットを止める「クールダウン」時間。ユーザーが操作した
// 瞬間から一定時間はフィットをスキップするが、恒久的には止めない
// （下記のuseEffect参照。以前はここが恒久ラッチだった）
const REFIT_COOLDOWN_MS = 600;

// canvasはTailwindクラスもCSSカスタムプロパティも直接解釈できないため、
// index.cssの@themeが生成する--color-*から動的に解決する
// （utils/nodeVisuals.jsのcanvasColorと同じ仕組み。utils/canvasColors.js参照）
const CTP = {
  get mantle() {
    return getCanvasColor("--color-raised");
  },
  get surface1() {
    return getCanvasColor("--color-surface-2");
  },
  get text() {
    return getCanvasColor("--color-text");
  },
  get subtext0() {
    return getCanvasColor("--color-text-tertiary");
  },
  get yellow() {
    return getCanvasColor("--color-rating");
  },
};

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

// ホバー中のノードだけでなく、選択中のノード（クリック・GraphNodeSearchの
// どちらでも）でも同じ「関連ノード以外を薄くする」見せ方をする。
// ホバーは一時的な注目、選択は持続する注目という違いはあるが、
// 「関連を目立たせる」という目的自体は同じため、ホバー中はホバー対象を
// 優先しつつ（マウスが離れれば選択中ノードの強調へ戻る）、どちらも
// 同じfocusIdとして扱う
const isNodeDimmed = (node, { interactive, focusId, adjacency }) =>
  Boolean(interactive && focusId && node.id !== focusId && !adjacency.get(focusId)?.has(node.id));

function drawNode(node, ctx, globalScale, { selectedNodeId, focusId, adjacency, interactive }) {
  const visual = getNodeVisual(node.type);
  // 産地ノードだけは種別共通のaccent-skyではなく、産地ごとの個別色
  // （originAccent.js。Records一覧・World Mapと同じ対応表）を使う。
  // record・variety等の他の種別は今まで通りvisual.canvasColorのまま
  const nodeColor = node.type === "origin" ? getOriginHex(node.label) : visual.canvasColor;
  const isRecord = node.type === "record";
  const selected = node.id === selectedNodeId;
  const dimmed = isNodeDimmed(node, { interactive, focusId, adjacency });

  ctx.save();
  ctx.globalAlpha = dimmed ? 0.25 : 1;

  const fontSize = Math.max(11 / globalScale, 3);
  const borderWidth = (selected ? 2.5 : 1.5) / globalScale;
  let shapeBottom;

  if (isRecord) {
    const radius = recordRadius(node, selected);

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = CTP.mantle;
    // mobbin.com準拠の柔らかい影（他要素と質感を揃える、付随的な適用）。
    // 描画後は必ずリセットする。canvasのshadowはfill/stroke/drawImage/
    // fillTextすべてに掛かり続けるため、リセットし忘れると以降のアイコン・
    // 文字にも影が付いてしまう
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 10 / globalScale;
    ctx.shadowOffsetY = 3 / globalScale;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = selected ? visual.canvasColor : CTP.surface1;
    ctx.stroke();

    const hasRating = node.metadata?.rating != null;
    const icon = getNodeIconImage(node.type, visual.canvasColor);
    const iconSize = radius * 0.8;
    const iconCenterY = hasRating ? node.y - radius * 0.3 : node.y;
    if (icon) ctx.drawImage(icon, node.x - iconSize / 2, iconCenterY - iconSize / 2, iconSize, iconSize);

    if (hasRating) {
      ctx.font = `${fontSize * 0.85}px "Space Mono", monospace`;
      ctx.fillStyle = CTP.yellow;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(`★${node.metadata.rating}`, node.x, node.y + radius * 0.4);
    }

    shapeBottom = node.y + radius;
  } else {
    const halfWidth = attributeHalfWidth(node, selected);
    const halfHeight = attributeHalfHeight(selected);

    ctx.beginPath();
    ctx.roundRect(node.x - halfWidth, node.y - halfHeight, halfWidth * 2, halfHeight * 2, 6);
    ctx.fillStyle = CTP.mantle;
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = 10 / globalScale;
    ctx.shadowOffsetY = 3 / globalScale;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = borderWidth;
    ctx.strokeStyle = selected ? nodeColor : CTP.surface1;
    ctx.stroke();

    const icon = getNodeIconImage(node.type, nodeColor);
    const iconSize = Math.min(halfWidth, halfHeight) * 1.15;
    if (icon) ctx.drawImage(icon, node.x - iconSize / 2, node.y - iconSize / 2, iconSize, iconSize);

    const recordCount = node.metadata?.recordCount ?? 0;
    if (recordCount > 1) {
      ctx.font = `${fontSize * 0.75}px "Space Mono", monospace`;
      ctx.fillStyle = CTP.subtext0;
      ctx.textAlign = "right";
      ctx.textBaseline = "top";
      ctx.fillText(String(recordCount), node.x + halfWidth - 2, node.y - halfHeight + 1);
    }

    shapeBottom = node.y + halfHeight;
  }

  // ラベルは形（チップ）の内側へ詰め込まず、下へ出す。
  // 収束後は多くのノードが小さく表示され、内側に収めようとすると
  // 「Pin...」のように大半が省略されて何のノードか分からなくなる
  // という指摘を受けた。Obsidianのグラフを参考に、チップ下へ出す
  // ことで省略の必要がある場面自体を減らす
  ctx.font = `${fontSize}px Inter, sans-serif`;
  ctx.fillStyle = CTP.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    truncateToWidth(ctx, node.label ?? "", LABEL_MAX_WIDTH),
    node.x,
    shapeBottom + LABEL_GAP / globalScale,
  );

  ctx.restore();
}

/**
 * onNodeClick等の当たり判定用。drawNodeと同じ形をベタ塗りするだけ。
 * 選択中ノードは表示上も拡大しているので、当たり判定もそれに合わせる
 * （見た目だけ大きくして、クリック領域が元のサイズのままだと
 * 「拡大された部分をクリックしても反応しない」ズレが生まれるため）。
 * 実際のクリック判定はfindNodeAtGraphPoint（graphHitTest.js）が自前で
 * 行っており、こちらはforce-graph自身が使う内部の当たり判定キャンバス用
 */
function paintNodePointerArea(node, color, ctx, isSelected) {
  ctx.fillStyle = color;
  if (node.type === "record") {
    const radius = recordRadius(node, isSelected);
    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fill();
  } else {
    const halfWidth = attributeHalfWidth(node, isSelected);
    const halfHeight = attributeHalfHeight(isSelected);
    ctx.beginPath();
    ctx.roundRect(node.x - halfWidth, node.y - halfHeight, halfWidth * 2, halfHeight * 2, 6);
    ctx.fill();
  }
}

function GraphCanvas({ graph, selectedNodeId, onSelectNode, focusRequest, interactive = true }) {
  const containerRef = useRef(null);
  const fgRef = useRef(null);
  const isDraggingRef = useRef(false);
  // 自前のrequestAnimationFrameループ（下記fitCamera呼び出し箇所参照）が
  // 毎フレーム最新のselectedNodeIdを参照できるようにするためのref。
  // ループを開始するuseEffectの依存配列には入れていない（selectedNodeId
  // だけが変わった＝ノードクリックのたびに追従ループを再始動させたくない）
  const selectedNodeIdRef = useRef(selectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [hoveredNodeId, setHoveredNodeId] = useState(null);

  const { nodes, links } = useMemo(() => buildForceGraphData(graph), [graph]);

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

  // fitCameraはリサイズ用のuseEffect（依存配列が[]で、マウント時に一度だけ
  // 作られるクロージャ）からも呼ばれるため、隣接表はrefから読む。
  // useMemoの結果を直接クロージャで捕まえると、グラフデータが変わって
  // adjacencyが更新されたあともリサイズ側は古い隣接表を見続けてしまう
  const adjacencyRef = useRef(adjacency);
  useEffect(() => {
    adjacencyRef.current = adjacency;
  }, [adjacency]);

  /**
   * 収束時にカメラをどこへ合わせるか。
   *
   * ?focus=（RecordDetailPageの「Graphで見る」等）でノードが指定されて
   * いる場合、グラフ全体ではなく「そのノード＋直接つながるノードだけ」
   * にフィットさせる。全体にフィットすると、記録数が多いグラフでは
   * フォーカス対象が豆粒のように小さくなり、周辺が見えないという
   * 指摘を受けた（選択中ノードの拡大表示だけでは、カメラ自体が
   * 引きすぎていると効果が薄い）。
   *
   * force-graph本体のzoomToFit(duration, padding, nodeFilter)は、
   * 第3引数のnodeFilterをそのままgetGraphBbox（bounding box計算）へ
   * 渡す設計になっている（node_modules/force-graph/dist/force-graph.mjs
   * で確認）。これを使い、対象を絞り込んだ上でズーム倍率を計算させる。
   */
  const fitCamera = (duration, padding, focusId) => {
    if (!focusId) {
      fgRef.current?.zoomToFit(duration, padding);
      return;
    }
    const neighborIds = adjacencyRef.current.get(focusId);
    fgRef.current?.zoomToFit(
      duration,
      padding,
      (node) => node.id === focusId || (neighborIds?.has(node.id) ?? false),
    );
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    let timeoutId;
    // 表示エリアの実測値を取り、変わっていればsizeを更新してカメラの
    // ずれを補正する。以前は初回計測値で恒久的に固定していたが（詳細は
    // ファイル冒頭コメントの既知の不具合2参照）、クリック判定が
    // isPointerDraggingに依存しない自前実装になったことで、リサイズに
    // 追従しても安全になったと判断した
    const applySize = () => {
      const next = { width: el.clientWidth, height: el.clientHeight };
      if (next.width > 0 && next.height > 0) {
        setSize((prev) => (prev.width === next.width && prev.height === next.height ? prev : next));
        fitCamera(200, selectedNodeIdRef.current ? 80 : 40, selectedNodeIdRef.current);
      }
    };
    applySize();

    // ウィンドウのドラッグリサイズ中に何度も発火してその都度サイズを
    // 適用すると、内部でズーム位置の再計算が連続して走ってしまうため
    // デバウンスする
    const observer = new ResizeObserver(() => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(applySize, 200);
    });
    observer.observe(el);
    return () => {
      clearTimeout(timeoutId);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    // 初回レンダーはsizeがまだ0のためForceGraph2D自体が描画されておらず
    // fgRef.currentがnull。sizeも依存配列に入れて、canvasが実際に
    // マウントされたあとにも改めて力を設定し直す
    // （このガードだけだとnodes/linksが変わらない限り二度と実行されず、
    // 独自のFORCE_PARAMSが一生適用されないまま、というバグを実際に踏んだ）
    if (!fgRef.current) return;
    fgRef.current.d3Force("link")?.distance(FORCE_PARAMS.linkDistance);
    fgRef.current.d3Force("charge")?.strength(FORCE_PARAMS.chargeStrength);
    fgRef.current.d3Force("collide", forceCollide(nodeCollideRadius));
    // 他のノードと1本もつながっていない記録（例: 産地・精製方法・
    // フレーバーを何も選んでいない記録）は、リンクによる引力を一切
    // 受けないため、chargeStrengthの反発力だけで中心から際限なく
    // 離れていってしまう。カメラの自動フィットは全ノードを画面に
    // 収めようとするため、この1つの孤立ノードのせいでグラフ全体が
    // 大きくズームアウトして見づらくなる不具合を実際に踏んだ。
    // 中心(0,0)へ引き戻す力を加えることで、孤立ノードが離れすぎない
    // ようにする。最初はstrength 0.3で試したが、開いてから収束するまでの
    // 広がり方が、反発力とせめぎ合ってぎこちなく見える（実機フィードバック）
    // ため、0.05まで弱めた
    fgRef.current.d3Force("x", forceX(0).strength(0.05));
    fgRef.current.d3Force("y", forceY(0).strength(0.05));
  }, [nodes, links, size.width, size.height]);

  // GraphNodeSearchでの選択など、クリック以外の経緯でノードが指定された
  // ときは、収束後で下の追従ループが既に止まっていても明示的にカメラを
  // 合わせる。canvas上のクリック選択（handlePointerUp）はこれまで通り
  // カメラを動かさない（既存の見た目を変えないため、focusRequestが
  // 発行されたときだけ反応する）
  useEffect(() => {
    if (!focusRequest) return;
    fitCamera(400, 80, focusRequest.nodeId);
  }, [focusRequest]);

  // 開いた瞬間からユーザーが操作するまでの経過時間を見て、カメラの
  // 自動フィットを一時的にスキップする「クールダウン」。以前は一度でも
  // 操作すると以後永久にフィットしない恒久ラッチだったが、追従アニメ中に
  // 一度ホイールを触っただけで、以後ずっと窮屈なレイアウトのまま固定
  // されてしまうという指摘を受けた。最後の操作から一定時間経てば
  // 自動フィットを再開するようにする
  const lastInteractionAtRef = useRef(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return undefined;

    // wheel/pointerdownはここでは観測するだけ（preventDefault等はしない）。
    // force-graph自身のズーム・パン・ドラッグ処理はそのまま動かしつつ、
    // 「ユーザーが最後に触れたのはいつか」だけを記録する。
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
      lastInteractionAtRef.current = performance.now();
    };
    el.addEventListener("wheel", markInteracted, { passive: true, capture: true });
    el.addEventListener("pointerdown", markInteracted, { capture: true });
    return () => {
      el.removeEventListener("wheel", markInteracted, { capture: true });
      el.removeEventListener("pointerdown", markInteracted, { capture: true });
    };
  }, []);

  // グラフのデータそのものが変わったら（フィルター変更や新しく開いた直後など）、
  // 一定時間だけ自前でrequestAnimationFrameを回してfitCameraを毎フレーム
  // 呼び続け、カメラを追従させる（ファイル冒頭の既知の不具合3参照。
  // onEngineTick/onEngineStopが発火しないため代替した）。
  // FOLLOW_DURATION_MSはd3AlphaDecayの既定値（0.0228）から、alphaが
  // 実用上ほぼ0になるまでのおおよそのフレーム数を目安に、余裕を持たせて決めた。
  useEffect(() => {
    lastInteractionAtRef.current = 0;

    const FOLLOW_DURATION_MS = 2000;
    const startTime = performance.now();
    let rafId = null;

    const step = (now) => {
      const cooledDown = now - lastInteractionAtRef.current > REFIT_COOLDOWN_MS;
      if (cooledDown && !isDraggingRef.current) {
        fitCamera(80, 40, selectedNodeIdRef.current);
      }
      if (now - startTime < FOLLOW_DURATION_MS) {
        rafId = requestAnimationFrame(step);
      } else if (cooledDown && !isDraggingRef.current) {
        // フォーカスありのときは、少し狭めに絞った分だけ余白を広めにして
        // （padding 80）、対象ノードだけがぎりぎり収まって窮屈にならないようにする
        fitCamera(400, selectedNodeIdRef.current ? 80 : 40, selectedNodeIdRef.current);
      }
    };
    rafId = requestAnimationFrame(step);
    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
    };
  }, [nodes, links]);

  // ホバー中はホバー対象を優先し（マウスが離れれば選択中ノードの強調へ
  // 戻る）、ホバーが無ければ選択中ノードを「関連ノード以外を薄くする」
  // 対象にする。検索で選んだノードも枠線の強調だけでなく、クリック・
  // ホバーと同じ見せ方（関連ノードのフォーカス）にする、という指摘への対応
  const focusNodeId = hoveredNodeId ?? selectedNodeId;
  const visualContext = { selectedNodeId, focusId: focusNodeId, adjacency, interactive };
  // { nodes, links } をJSX内で直接書くと、hoverなど無関係な再描画のたびに
  // 新しいオブジェクト参照になり、ライブラリがグラフデータそのものが
  // 変わったと誤解してシミュレーションを最初からやり直してしまう
  // （実際に踏んだ不具合。ホバーするたびにレイアウトが再抽選されていた）
  const graphData = useMemo(() => ({ nodes, links }), [nodes, links]);

  // onNodeClick/onBackgroundClickが機能しないためのクリック代替実装。
  // pointerdown→pointerupの移動量が閾値以内なら「クリック」とみなし、
  // screen2GraphCoordsで求めたグラフ座標に対する当たり判定をgraphHitTest.js
  // （findNodeAtGraphPoint）へ委譲する。ホバー状態（hoveredNodeId）には
  // 頼らない——isPointerDragging誤検知（ファイル冒頭コメント参照）と
  // 同じ理由で、クリックの瞬間にホバーがnullへリセットされることがあるため
  const pointerDownRef = useRef(null);

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

    const canvas = containerRef.current?.querySelector("canvas");
    if (!canvas || !fgRef.current) return;
    const rect = canvas.getBoundingClientRect();
    const { x, y } = fgRef.current.screen2GraphCoords(event.clientX - rect.left, event.clientY - rect.top);
    const node = findNodeAtGraphPoint(nodes, x, y, selectedNodeId);
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
          nodePointerAreaPaint={(node, color, ctx) => paintNodePointerArea(node, color, ctx, node.id === selectedNodeId)}
          linkColor={(link) => {
            const touchesFocused =
              focusNodeId &&
              (linkEndpointId(link.source) === focusNodeId || linkEndpointId(link.target) === focusNodeId);
            const dimmed = interactive && focusNodeId && !touchesFocused;
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
