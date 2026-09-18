import { useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";

import { getNodeIconImage } from "../utils/canvasIcons";
import { getCanvasColor } from "../utils/canvasColors";
import { getNodeColorHex } from "../utils/nodeColor";
import { nodeRadius, nodeCollideRadius } from "../utils/graphNodeSizing";
import { findNodeAtGraphPoint } from "../utils/graphHitTest";
import { buildForceGraphData } from "../utils/graphAdapter";

/**
 * 知識グラフの描画本体。
 *
 * 2026-09、「グラフを直接操作している体験が感じられない」という指摘を受け、
 * react-force-graph-2d（d3-force）への依存をやめ、canvas 2D + 自前の物理演算
 * （反発・バネ・減衰・ポインタへのバネ追従ドラッグ）へ全面書き換えた。
 * Artifactでの対話的なプロトタイプ（反発・バネ・ドラッグの効き方を実際に
 * 触りながら調整）でユーザーの承認を得た定数・アルゴリズムをそのまま移植
 * している。
 *
 * react-force-graph-2d時代は、ライブラリ内部のクリック判定・カメラ制御の
 * 癖に合わせて自前のクリック検出やカメラ追従ループを足す必要があった
 * （旧バージョンのコメント参照、git履歴に残る）。物理演算・描画・
 * ポインタ処理のすべてを自前で持つようになったことで、ライブラリの内部
 * 実装に合わせた回避策は不要になった。
 *
 * ノードサイズ計算・クリックの当たり判定・{nodes,links}への変換は、
 * 2026-08の「Graph画面の作り込み」で features/graph/utils/ の
 * graphNodeSizing.js・graphHitTest.js・graphAdapter.js へ切り出した構成を
 * そのまま踏襲する（CLAUDE.md「1ファイルへ複数の責務を集中させないで
 * ください」）。このファイルは物理演算のループ・canvas描画・ポインタ
 * イベントの配線・カメラ制御のオーケストレーションに専念する。
 */

// ---------- physics constants ----------
// graph-physics-mock.htmlでユーザーが実際にドラッグ・ズームして確認し、
// 「動きはこれで合格です」と承認を得た値（DAMPING・CENTER_K・
// DRAG_SPRING・DRAG_DAMPING・SCALE_LERP・SPRING_K）はそのまま使う。
//
// 2026-09-18、ノードを大きく塗りつぶす構図（Q案）へ変更した際、ノードの
// 半径だけ大きくしてこの間隔まわりの定数を据え置いたため、実データ
// （61ノード、記録ノードで最大degree 10＝半径76px前後）で隣接ノード同士が
// 重なって見える不具合が出た（ユーザー報告）。モックは13ノード・
// 固定サイズ（record半径30px・チップ40〜60px幅）の小規模データでしか
// 検証しておらず、実データのノード数・degreeに応じた可変サイズという
// 条件では同じ定数が通用しないと判明した。
//
// 1度目の対処（REPULSION 2600→5200、固定のSPRING_LEN 95→170）でも
// なお「間隔が狭い」という指摘を受けたため、固定長のバネ（SPRING_LEN）
// 自体を、つながる2ノードの実際の半径から動的に決める方式
// （`restLength = nodeRadius(a) + nodeRadius(b) + SPRING_GAP`、
// step()内）へ変更した。degreeが高く半径が大きいノード同士が繋がっても
// 自然長が常に実サイズに追従するため、衝突解消との綱引きが起きない。
const REPULSION = 10000;
const SPRING_K = 0.02;
// バネの自然長 = 2ノードの半径の合計 + この余白（step()参照）。
// 2026-09-18、2度目の対処（70px）でもなお「もっと余裕が欲しい」との
// 指摘を受け、承認済みのQ構図モック（graph-theme-concepts.html）と
// 同程度の余裕感を目指して大幅に引き上げた
const SPRING_GAP = 220;
const DAMPING = 0.86;
const CENTER_K = 0.00015;
const DRAG_SPRING = 0.32; // ポインタへ追従するバネの強さ（高いほど硬い）
const DRAG_DAMPING = 0.72; // ドラッグ中の減衰（低いほどよく揺れる）
const SCALE_LERP = 0.22;

// 初期配置から安定するまでを画面に映さず、裏側で先に計算する。
// 「読み込むたびにノードが弾け飛んで収まる」という、必然性のない
// アニメーションを見せないための対応（モック検討時にユーザー指摘）。
// データが変わる（フィルター変更等）たびに同じだけ先読みし、常に
// 「既に収まった状態」から見せる
const PRE_CONVERGE_STEPS = 1500;

const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3;
// pointerdown→pointerupの移動量がこれ以内なら「クリック」（ドラッグでは
// ない）とみなす。物理エンジンをモックから移植したのと同じ値
const MOVE_THRESHOLD_PX = 6;

// フォーカス対象+隣接ノードをカメラに収める際の余白（screen px）。
// 2026-09-18、「グラフ全体を常に画面に収める」という前提自体をやめた
// （下記fitCamera・COMFORTABLE_SCALE参照）ため、フォーカスが無い場合の
// 余白は使わなくなった
const FIT_PADDING_FOCUSED = 80;
const CAMERA_ANIM_MS = 400;
// 何もフォーカスしていない既定状態のズーム倍率。以前は全ノードが収まる
// scaleへ自動フィットしていたが、ノード数が多いとその分ノードが小さく・
// 間隔も詰まって見え、「グラフを直接操作している感覚」を損なっていた
// （ユーザーとの相談で決定）。ノードをほぼ実寸で見せ、画面外の部分は
// パン操作で探索してもらう
const COMFORTABLE_SCALE = 0.7;

// ラベルはチップの下に出す（Obsidianのグラフを参考に、チップ内へ
// 詰め込んで過度に省略されるのを避ける）
const LABEL_MAX_WIDTH = 100;
const LABEL_GAP = 6;

// canvasはTailwindクラスもCSSカスタムプロパティも直接解釈できないため、
// index.cssの@themeが生成する--color-*から動的に解決する
const CTP = {
  get base() {
    return getCanvasColor("--color-base");
  },
  get mantle() {
    return getCanvasColor("--color-raised");
  },
  get text() {
    return getCanvasColor("--color-text");
  },
};

const truncateToWidth = (ctx, text, maxWidth) => {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let result = text;
  while (result.length > 1 && ctx.measureText(`${result}…`).width > maxWidth) {
    result = result.slice(0, -1);
  }
  return `${result}…`;
};

/**
 * ノードの塗り色。origin・flavorだけは種別共通色ではなく値ごとの個別色を
 * 使うという判定は、他画面（EntityDetail等）とも共有するutils/nodeColor.js
 * （2026-09新設）へ集約した
 */
const nodeFillColor = (node) => getNodeColorHex(node);

// ホバー中のノードだけでなく、選択中のノード（クリック・GraphNodeSearchの
// どちらでも）でも同じ「関連ノード以外を薄くする」見せ方をする
const isNodeDimmed = (node, { interactive, focusId, adjacency }) =>
  Boolean(interactive && focusId && node.id !== focusId && !adjacency.get(focusId)?.has(node.id));

// 2026-09、記録ノード（一杯の記録）のタイトルは常時表示に変更した。
// 属性ノード（産地・フレーバー等）は引き続き、フォーカス中（ホバー/選択）
// のノード本人と直接つながる隣接ノードだけに絞る（実データ・61ノードで
// ラベル同士が重なって読めなくなる問題への対応を維持しつつ、「今どの
// コーヒーの記録か」だけは常に分かるようにする）
const isNodeLabelVisible = (node, { interactive, focusId, adjacency }) => {
  if (node.type === "record") return true;
  if (!interactive || !focusId) return false;
  return node.id === focusId || Boolean(adjacency.get(focusId)?.has(node.id));
};

/** エッジの色。record⇔属性の2端点のうち、属性側ノードの色を使う */
const edgeColor = (link) => {
  const attributeNode = link.source.type !== "record" ? link.source : link.target;
  return nodeFillColor(attributeNode);
};

function drawNode(ctx, node, viewScale, { selectedNodeId, focusId, adjacency, interactive }) {
  const color = nodeFillColor(node);
  const selected = node.id === selectedNodeId;
  const dimmed = isNodeDimmed(node, { interactive, focusId, adjacency });
  // 選択中でもnodeRadiusのSELECTED_SCALE倍率は使わない（node.scaleの
  // バネ追従アニメーションと二重に掛かり合い、衝突判定（nodeCollideRadius、
  // 常に非選択時サイズ基準）と描画サイズがずれて重なって見える不具合の
  // 原因になっていた。選択の見た目上の強調はnode.scaleの拡大＋白いリングで
  // 十分に表現できる）
  const radius = nodeRadius(node);

  ctx.save();
  ctx.translate(node.x, node.y);
  ctx.scale(node.scale, node.scale);
  ctx.globalAlpha = dimmed ? 0.25 : 1;

  const totalScale = viewScale * node.scale;
  const fontSize = Math.max(11 / totalScale, 3);

  // 塗りつぶした円（Q構図: 輪郭線ではなく種別色そのもので塗る）
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = (node.id === selectedNodeId ? 18 : 10) / totalScale;
  ctx.shadowOffsetY = 3 / totalScale;
  ctx.fill();
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 選択中ノードだけ、白いリング（外側の輪郭線）で対応関係を示す
  if (selected) {
    ctx.lineWidth = 3 / totalScale;
    ctx.strokeStyle = CTP.text;
    ctx.beginPath();
    ctx.arc(0, 0, radius + 3 / totalScale, 0, Math.PI * 2);
    ctx.stroke();
  }

  // アイコンは常に暗色（塗りつぶした円の上に乗せるため、種別色ではなく
  // 背景の暗色を使う。以前は種別色のアイコンを暗い背景に乗せていたが、
  // Q構図では地と図が入れ替わる）
  const hasRating = node.type === "record" && node.metadata?.rating != null;
  const icon = getNodeIconImage(node.type, CTP.base);
  const iconSize = radius * (hasRating ? 0.7 : 0.85);
  const iconCenterY = hasRating ? -radius * 0.28 : 0;
  if (icon) ctx.drawImage(icon, -iconSize / 2, iconCenterY - iconSize / 2, iconSize, iconSize);

  if (hasRating) {
    ctx.font = `${fontSize * 0.8}px "Space Mono", monospace`;
    ctx.fillStyle = CTP.base;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(`★${node.metadata.rating}`, 0, radius * 0.42);
  }

  const recordCount = node.type !== "record" ? (node.metadata?.recordCount ?? 0) : 0;
  if (recordCount > 1) {
    ctx.font = `${fontSize * 0.7}px "Space Mono", monospace`;
    ctx.fillStyle = CTP.base;
    ctx.globalAlpha = (dimmed ? 0.25 : 1) * 0.75;
    ctx.textAlign = "right";
    ctx.textBaseline = "top";
    ctx.fillText(String(recordCount), radius - 3 / totalScale, -radius + 2 / totalScale);
    ctx.globalAlpha = dimmed ? 0.25 : 1;
  }

  // ラベルはチップ風の背景付きで、形の下に出す（isNodeLabelVisible参照）
  if (isNodeLabelVisible(node, { interactive, focusId, adjacency })) {
    ctx.font = `${fontSize}px Inter, sans-serif`;
    const label = truncateToWidth(ctx, node.label ?? "", LABEL_MAX_WIDTH);
    const textWidth = ctx.measureText(label).width;
    const padX = 6 / totalScale;
    const padY = 3 / totalScale;
    const labelY = radius + LABEL_GAP / totalScale;

    ctx.fillStyle = CTP.mantle;
    ctx.beginPath();
    ctx.roundRect(
      -textWidth / 2 - padX,
      labelY,
      textWidth + padX * 2,
      fontSize + padY * 2,
      (fontSize + padY * 2) / 2,
    );
    ctx.fill();

    ctx.fillStyle = CTP.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(label, 0, labelY + padY);
  }

  ctx.restore();
}

function GraphCanvas({ graph, selectedNodeId, onSelectNode, focusRequest, interactive = true }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const canvasSizeRef = useRef({ width: 0, height: 0 });

  // 物理演算の可変状態。Reactの再レンダーとは独立して毎フレーム
  // 直接書き換える（Reactのstateにすると毎フレーム再レンダーが走ってしまう）
  const nodesRef = useRef([]);
  const linksRef = useRef([]); // {source: nodeObj, target: nodeObj}
  const adjacencyRef = useRef(new Map());
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const cameraAnimRef = useRef(null); // {from, to, start, duration} | null
  const hasFittedOnceRef = useRef(false);

  const pointerRef = useRef({ x: 0, y: 0 });
  const draggingIdRef = useRef(null);
  const panStateRef = useRef(null);
  const downInfoRef = useRef(null);
  const hoveredIdRef = useRef(null);

  // selectedNodeId/onSelectNodeはpropなので、rAFループのクロージャから
  // 常に最新値を読めるようrefへ写す
  const selectedNodeIdRef = useRef(selectedNodeId);
  useEffect(() => {
    selectedNodeIdRef.current = selectedNodeId;
  }, [selectedNodeId]);
  const onSelectNodeRef = useRef(onSelectNode);
  useEffect(() => {
    onSelectNodeRef.current = onSelectNode;
  }, [onSelectNode]);
  const interactiveRef = useRef(interactive);
  useEffect(() => {
    interactiveRef.current = interactive;
  }, [interactive]);

  const { nodes, links } = useMemo(() => buildForceGraphData(graph), [graph]);

  /** 1物理ステップぶん進める（反発→バネ→衝突解消→中心引力+積分） */
  const step = () => {
    const list = nodesRef.current;
    const draggingId = draggingIdRef.current;

    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) d2 = 1;
        const d = Math.sqrt(d2);
        const f = REPULSION / d2;
        const fx = (dx / d) * f;
        const fy = (dy / d) * f;
        if (a.id !== draggingId) {
          a.vx += fx;
          a.vy += fy;
        }
        if (b.id !== draggingId) {
          b.vx -= fx;
          b.vy -= fy;
        }
      }
    }

    linksRef.current.forEach(({ source: a, target: b }) => {
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy) || 1;
      // バネの自然長は固定値ではなく、つながる2ノードの実サイズ+一定の
      // 余白（SPRING_GAP）から動的に決める。degreeに応じてノード半径が
      // 大きく変わる（最大で基準サイズの3倍近くになる）ため、固定長だと
      // 次数の高いノード同士が繋がった場合に自然長より実サイズの方が
      // 大きくなり、常に衝突解消と綱引きして詰まって見える不具合になる
      const restLength = nodeRadius(a) + nodeRadius(b) + SPRING_GAP;
      const f = (d - restLength) * SPRING_K;
      const fx = (dx / d) * f;
      const fy = (dy / d) * f;
      if (a.id !== draggingId) {
        a.vx += fx;
        a.vy += fy;
      }
      if (b.id !== draggingId) {
        b.vx -= fx;
        b.vy -= fy;
      }
    });

    for (let iter = 0; iter < 10; iter += 1) {
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const a = list[i];
          const b = list[j];
          const minDist = nodeCollideRadius(a) + nodeCollideRadius(b);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.01;
          if (d < minDist) {
            const push = (minDist - d) / 2;
            const nx = dx / d;
            const ny = dy / d;
            if (a.id !== draggingId) {
              a.x -= nx * push;
              a.y -= ny * push;
            }
            if (b.id !== draggingId) {
              b.x += nx * push;
              b.y += ny * push;
            }
          }
        }
      }
    }

    const focusId = hoveredIdRef.current ?? selectedNodeIdRef.current;
    list.forEach((n) => {
      if (n.id !== draggingId) {
        n.vx += (0 - n.x) * CENTER_K;
        n.vy += (0 - n.y) * CENTER_K;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx;
        n.y += n.vy;
      } else {
        const target = screenToWorld(pointerRef.current.x, pointerRef.current.y);
        n.vx += (target.x - n.x) * DRAG_SPRING;
        n.vy += (target.y - n.y) * DRAG_SPRING;
        n.vx *= DRAG_DAMPING;
        n.vy *= DRAG_DAMPING;
        n.x += n.vx;
        n.y += n.vy;
      }
      const isFocus = n.id === hoveredIdRef.current || n.id === draggingId || n.id === focusId;
      n.targetScale = draggingId === n.id ? 1.28 : isFocus ? 1.14 : 1;
      n.scale += (n.targetScale - n.scale) * SCALE_LERP;
    });
  };

  const screenToWorld = (sx, sy) => {
    const view = viewRef.current;
    return { x: (sx - view.x) / view.scale, y: (sy - view.y) / view.scale };
  };

  /**
   * カメラを合わせる。animate=trueなら現在位置から滑らかに遷移させ、
   * falseなら即座に合わせる（初回ロード・リサイズ用）。
   *
   * 2026-09-18、「グラフ全体を常に画面に収める」という前提自体を
   * やめた（ユーザーとの相談で決定）。ノード数が多いほどその分ノードが
   * 小さく・間隔も詰まって見え、このグラフ画面の作り直しの出発点だった
   * 「直接操作している感覚」を損なっていたため。
   *
   * - focusIdがある場合（?focus=・GraphNodeSearchでの選択・ノード
   *   クリック時の再フォーカス）: 対象+直接の隣接ノードだけが収まる
   *   位置・倍率へ寄せる。これは「このノードを見たい」という明確な
   *   意図への応答なので、引き続き対象を画面いっぱいに収める
   * - focusIdが無い場合（初回ロード・フィルター変更直後など）:
   *   全ノードを収めようとはせず、ノードがほぼ実寸で見える
   *   COMFORTABLE_SCALEで、全ノードの重心を画面中央に置く。画面外に
   *   はみ出た部分はパン操作で探索してもらう
   */
  const fitCamera = (padding, focusId, animate) => {
    const list = nodesRef.current;
    const { width, height } = canvasSizeRef.current;
    if (list.length === 0 || width === 0 || height === 0) return;

    let target;
    if (focusId) {
      const neighborIds = adjacencyRef.current.get(focusId);
      const filtered = list.filter((n) => n.id === focusId || neighborIds?.has(n.id));
      const targets = filtered.length > 0 ? filtered : list;

      const xs = targets.map((n) => n.x);
      const ys = targets.map((n) => n.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      const bboxW = Math.max(maxX - minX, 1);
      const bboxH = Math.max(maxY - minY, 1);

      const scale = Math.max(
        MIN_ZOOM,
        Math.min(MAX_ZOOM, Math.min((width - padding * 2) / bboxW, (height - padding * 2) / bboxH)),
      );
      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      target = { x: width / 2 - cx * scale, y: height / 2 - cy * scale, scale };
    } else {
      const cx = list.reduce((sum, n) => sum + n.x, 0) / list.length;
      const cy = list.reduce((sum, n) => sum + n.y, 0) / list.length;
      target = { x: width / 2 - cx * COMFORTABLE_SCALE, y: height / 2 - cy * COMFORTABLE_SCALE, scale: COMFORTABLE_SCALE };
    }

    if (animate) {
      cameraAnimRef.current = { from: { ...viewRef.current }, to: target, start: performance.now(), duration: CAMERA_ANIM_MS };
    } else {
      cameraAnimRef.current = null;
      viewRef.current = target;
    }
  };

  /** カメラのアニメーション遷移を1フレームぶん進める */
  const applyCameraAnim = () => {
    const anim = cameraAnimRef.current;
    if (!anim) return;
    const elapsed = performance.now() - anim.start;
    const progress = Math.min(1, elapsed / anim.duration);
    // mobbin.com準拠のsignatureイージングと近い、素早く動き出して滑らかに
    // 減速するカーブ（cubic ease-out）
    const eased = 1 - (1 - progress) ** 3;
    viewRef.current = {
      x: anim.from.x + (anim.to.x - anim.from.x) * eased,
      y: anim.from.y + (anim.to.y - anim.from.y) * eased,
      scale: anim.from.scale + (anim.to.scale - anim.from.scale) * eased,
    };
    if (progress >= 1) cameraAnimRef.current = null;
  };

  const draw = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    const { width, height } = canvasSizeRef.current;
    if (width === 0 || height === 0) return;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = CTP.base;
    ctx.fillRect(0, 0, width, height);

    const view = viewRef.current;
    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    const focusId = hoveredIdRef.current ?? selectedNodeIdRef.current;
    const visualContext = {
      selectedNodeId: selectedNodeIdRef.current,
      focusId,
      adjacency: adjacencyRef.current,
      interactive: interactiveRef.current,
    };

    linksRef.current.forEach((link) => {
      const touchesFocused =
        focusId && (link.source.id === focusId || link.target.id === focusId);
      const dimmed = interactiveRef.current && focusId && !touchesFocused;
      ctx.strokeStyle = edgeColor(link);
      ctx.globalAlpha = dimmed ? 0.15 : 0.55;
      ctx.lineWidth = 2 / view.scale;
      ctx.beginPath();
      ctx.moveTo(link.source.x, link.source.y);
      ctx.lineTo(link.target.x, link.target.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    nodesRef.current.forEach((node) => drawNode(ctx, node, view.scale, visualContext));

    ctx.restore();
  };

  const setCursor = () => {
    const el = containerRef.current;
    if (!el) return;
    if (draggingIdRef.current || panStateRef.current) {
      el.style.cursor = "grabbing";
    } else {
      el.style.cursor = hoveredIdRef.current ? "grab" : "default";
    }
  };

  /**
   * バックエンドから新しいグラフデータが来るたび（初回ロード・フィルター
   * 変更等）、物理演算の内部状態を作り直す。既にあるノードは位置・速度を
   * 引き継ぎ（フィルター変更で一部のノードが増減しても、残るノードの
   * 位置が飛ばない）、新規ノードだけ中心付近へ乱数で種を撒く。
   */
  useEffect(() => {
    const prevById = new Map(nodesRef.current.map((n) => [n.id, n]));
    const nextNodes = nodes.map((n, i) => {
      const prev = prevById.get(n.id);
      if (prev) return { ...prev, type: n.type, label: n.label, metadata: n.metadata, degree: n.degree };
      const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
      const radius = 40 + Math.random() * 60;
      return {
        ...n,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        scale: 1,
        targetScale: 1,
      };
    });
    const nodeById = new Map(nextNodes.map((n) => [n.id, n]));
    const nextLinks = links
      .map((l) => ({ source: nodeById.get(l.source), target: nodeById.get(l.target) }))
      .filter((l) => l.source && l.target);

    const adjacency = new Map();
    nextLinks.forEach((l) => {
      if (!adjacency.has(l.source.id)) adjacency.set(l.source.id, new Set());
      if (!adjacency.has(l.target.id)) adjacency.set(l.target.id, new Set());
      adjacency.get(l.source.id).add(l.target.id);
      adjacency.get(l.target.id).add(l.source.id);
    });

    nodesRef.current = nextNodes;
    linksRef.current = nextLinks;
    adjacencyRef.current = adjacency;

    for (let i = 0; i < PRE_CONVERGE_STEPS; i += 1) step();
    // 収束後も速度をゼロへ明示的にリセットする（graph-physics-mock.htmlの
    // 承認済み実装にはこの1行があったが、移植時に見落としていた）。
    // これが無いと、収束しきらずわずかに残った速度が毎フレーム積分され
    // 続け、実データではグラフ全体がゆっくり回転して見える不具合になる
    nextNodes.forEach((n) => {
      n.vx = 0;
      n.vy = 0;
    });

    fitCamera(FIT_PADDING_FOCUSED, selectedNodeIdRef.current, hasFittedOnceRef.current);
    hasFittedOnceRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stepとfitCameraはrefのみを参照する安定した関数
  }, [nodes, links]);

  /**
   * RecordDetailPageの「Graphで見る」から ?focus=record:xxx で開かれた場合や
   * GraphNodeSearchでの選択など、明示的にノードを指定されたときにカメラを
   * 合わせる
   */
  useEffect(() => {
    if (!focusRequest) return;
    fitCamera(FIT_PADDING_FOCUSED, focusRequest.nodeId, true);
  }, [focusRequest]);

  // canvasの実サイズをコンテナに追従させる（dpr込み）。サイズが変わったら
  // カメラも合わせ直す
  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return undefined;

    let timeoutId;
    const applySize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      const ctx = canvas.getContext("2d");
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      canvasSizeRef.current = { width: rect.width, height: rect.height };
      fitCamera(FIT_PADDING_FOCUSED, selectedNodeIdRef.current, false);
    };
    applySize();

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

  // ポインタ操作（ドラッグ・パン・ホバー・クリック）とホイールズーム。
  // canvas要素へ直接addEventListenerする（wheelをpassive:falseで
  // 受けるにはReactのonWheelではなく素のリスナーが必要なため、
  // 他のポインタイベントも合わせてここへ集約している）
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const handlePointerDown = (event) => {
      if (!interactiveRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const world = screenToWorld(sx, sy);
      const hit = findNodeAtGraphPoint(nodesRef.current, world.x, world.y, selectedNodeIdRef.current);
      downInfoRef.current = { x: sx, y: sy, nodeId: hit?.id ?? null };
      if (hit) {
        draggingIdRef.current = hit.id;
        pointerRef.current = { x: sx, y: sy };
      } else {
        panStateRef.current = { startX: sx, startY: sy, viewX: viewRef.current.x, viewY: viewRef.current.y };
      }
      canvas.setPointerCapture(event.pointerId);
      setCursor();
    };

    const handlePointerMove = (event) => {
      if (!interactiveRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      pointerRef.current = { x: sx, y: sy };
      if (draggingIdRef.current) {
        // 物理ステップ側がpointerRefを毎フレーム読むため、ここでは何もしない
      } else if (panStateRef.current) {
        const pan = panStateRef.current;
        viewRef.current = { ...viewRef.current, x: pan.viewX + (sx - pan.startX), y: pan.viewY + (sy - pan.startY) };
      } else {
        const world = screenToWorld(sx, sy);
        const hit = findNodeAtGraphPoint(nodesRef.current, world.x, world.y, selectedNodeIdRef.current);
        hoveredIdRef.current = hit?.id ?? null;
        setCursor();
      }
    };

    const endInteraction = (event) => {
      if (!interactiveRef.current) return;
      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const downInfo = downInfoRef.current;
      if (downInfo) {
        const moved = Math.hypot(sx - downInfo.x, sy - downInfo.y);
        if (moved < MOVE_THRESHOLD_PX && downInfo.nodeId) {
          const node = nodesRef.current.find((n) => n.id === downInfo.nodeId);
          onSelectNodeRef.current(node ? { id: node.id, data: node } : null);
        }
      }
      draggingIdRef.current = null;
      panStateRef.current = null;
      downInfoRef.current = null;
      setCursor();
    };

    const handleWheel = (event) => {
      if (!interactiveRef.current) return;
      event.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = event.clientX - rect.left;
      const sy = event.clientY - rect.top;
      const worldBefore = screenToWorld(sx, sy);
      const factor = Math.exp(-event.deltaY * 0.001);
      const nextScale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, viewRef.current.scale * factor));
      cameraAnimRef.current = null;
      viewRef.current = {
        scale: nextScale,
        x: sx - worldBefore.x * nextScale,
        y: sy - worldBefore.y * nextScale,
      };
    };

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", endInteraction);
    canvas.addEventListener("pointercancel", endInteraction);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", endInteraction);
      canvas.removeEventListener("pointercancel", endInteraction);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // 物理演算+描画のメインループ。マウント中は常時回り続ける
  // （承認済みのgraph-physics-mock.htmlと同じ、減衰はするが完全停止は
  // しないバネ物理のため。react-force-graph-2d時代のalpha減衰による
  // 自動停止とは異なる挙動だが、モック検討時に確認済みの動きそのもの）
  useEffect(() => {
    let rafId = requestAnimationFrame(function loop() {
      step();
      applyCameraAnim();
      draw();
      rafId = requestAnimationFrame(loop);
    });
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- step/applyCameraAnim/drawはいずれもrefのみを参照する安定した実装
  }, []);

  return (
    <div ref={containerRef} className="h-full w-full">
      <canvas
        ref={canvasRef}
        role="img"
        aria-label={t("graph.canvasAriaLabel", { nodeCount: nodes.length, edgeCount: links.length })}
        className="h-full w-full touch-none"
      />
    </div>
  );
}

export default GraphCanvas;
