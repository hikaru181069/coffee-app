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
const SCALE_LERP = 0.22;

// 2026-09-20、「動きがカクつく／一度ドラッグすると静止しない」という
// 一連の報告を受けて、d3-force（Obsidianのグラフビューが実際に使用して
// いるライブラリ、ユーザー指摘により調査）と同じ収束の仕組みへ作り直した。
// これまでは「速度が閾値未満になったら止める」「一定フレーム後に強制
// ゼロ」「停止直前だけ追加減衰」という3つの場当たり的な対処を積み重ねて
// いたが、d3-forceは単一のalpha（温度）値を毎ティック指数関数的に減衰
// させ、その値を全ての力に掛けるだけで、これらすべてを1つの仕組みで
// 実現している。alphaが十分小さくなれば力もほぼゼロになり、自然に
// 静止へ収束することが数学的に保証される。
// alphaDecay・alphaMinはd3-forceの既定値をそのまま使う
// （alphaDecay ≈ alphaMin^(1/300)で、既定alphaMin=0.001だと約300
// ティックで収束する設計）
const ALPHA_DECAY = 0.0228;
const ALPHA_MIN = 0.001;
// ドラッグ中のalphaTarget。d3-forceのドラッグ実装は、掴んだ瞬間にalphaを
// 1へ跳ね上げるのではなく、alphaTargetをこの値まで緩やかに引き上げる
// ことで、周囲のノードが急に沸き立つのではなく穏やかに反応するように
// している
const ALPHA_TARGET_DRAG = 0.3;

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

function GraphCanvas({ graph, selectedNodeId, onSelectNode, onHoverNode, focusRequest, interactive = true }) {
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
  // 2026-09、実データでは減衰(DAMPING)だけでは速度が正確にゼロへ
  // 収束せず、毎フレームの積分でグラフ全体がゆっくり回転・ドリフトして
  // 見える不具合が再確認された（PRE_CONVERGE_STEPS後の一度きりの速度
  // リセットだけでは、その後も回り続けるstep()ループに対して不十分
  // だった）。ドラッグ操作が無い間は物理演算そのものを止め、真に静止
  // させる。ドラッグ開始で再度有効化し、alphaがALPHA_MIN未満になったら
  // step()内で自動的に再度無効化する
  const physicsActiveRef = useRef(true);
  // d3-force（Obsidianのグラフビューが使用）と同じalpha（温度）方式。
  // 毎ティック alpha += (alphaTarget - alpha) * ALPHA_DECAY で更新し、
  // 全ての力にこのalphaを掛けることで、力自体が指数関数的に減衰し
  // 自然に静止へ収束する（ALPHA_DECAY宣言のコメント参照）
  const alphaRef = useRef(0);
  const alphaTargetRef = useRef(0);

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
  // 2026-09、Graph Communities（ホバー中のノードが属するグループを
  // GraphCommunities.jsxへプレビュー表示する機能）のために追加。
  // hoveredIdRefと同様、呼び出しはpointermoveハンドラの中で行うため
  // refで最新値を持つ。
  const onHoverNodeRef = useRef(onHoverNode);
  useEffect(() => {
    onHoverNodeRef.current = onHoverNode;
  }, [onHoverNode]);
  const interactiveRef = useRef(interactive);
  useEffect(() => {
    interactiveRef.current = interactive;
  }, [interactive]);

  const { nodes, links } = useMemo(() => buildForceGraphData(graph), [graph]);

  /** 1物理ステップぶん進める（反発→バネ→衝突解消→中心引力+積分） */
  const step = () => {
    const list = nodesRef.current;
    const draggingId = draggingIdRef.current;

    // d3-forceと同じ順序: まずalphaを更新し、その値を以降の力すべてに
    // 掛ける（ALPHA_DECAY宣言のコメント参照）
    alphaRef.current += (alphaTargetRef.current - alphaRef.current) * ALPHA_DECAY;
    const alpha = alphaRef.current;

    for (let i = 0; i < list.length; i += 1) {
      for (let j = i + 1; j < list.length; j += 1) {
        const a = list[i];
        const b = list[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 1) d2 = 1;
        const d = Math.sqrt(d2);
        const f = (REPULSION / d2) * alpha;
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
      const f = (d - restLength) * SPRING_K * alpha;
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

    // 衝突解消は最大10回まで反復するが、多くのフレームでは1〜2回で
    // 重なりが解消し切る。固定10回だと、重なりが無い（=何も押し戻して
    // いない）フレームでもO(ノード数^2)の距離計算だけは常に10回分
    // 走ってしまい、実データ（60ノード超）ではドラッグ中の体感カクつきの
    // 主要因になっていた（ユーザー報告、2026-09-20）。1回の反復で
    // 誰も押し戻されなければそれ以上重なりは残っていないので、早期に
    // 打ち切る
    for (let iter = 0; iter < 10; iter += 1) {
      let anyPushed = false;
      for (let i = 0; i < list.length; i += 1) {
        for (let j = i + 1; j < list.length; j += 1) {
          const a = list[i];
          const b = list[j];
          const minDist = nodeCollideRadius(a) + nodeCollideRadius(b);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 0.01;
          if (d < minDist) {
            anyPushed = true;
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
      if (!anyPushed) break;
    }

    const focusId = hoveredIdRef.current ?? selectedNodeIdRef.current;
    list.forEach((n) => {
      if (n.id !== draggingId) {
        n.vx += (0 - n.x) * CENTER_K * alpha;
        n.vy += (0 - n.y) * CENTER_K * alpha;
        n.vx *= DAMPING;
        n.vy *= DAMPING;
        n.x += n.vx;
        n.y += n.vy;
      } else {
        // d3-force（Obsidianのグラフビュー）のfx/fyと同じ「固定座標」
        // 方式。バネで追従させるのではなく、ドラッグ中のノードは毎ティック
        // ポインタの位置そのものへ座標を固定し、速度もゼロにする。これに
        // より、ドラッグしているノード自身の動きにバネの遅れ・揺れが
        // 一切無くなり、ポインタへ1:1で追従する
        const target = screenToWorld(pointerRef.current.x, pointerRef.current.y);
        n.x = target.x;
        n.y = target.y;
        n.vx = 0;
        n.vy = 0;
      }
      const isFocus = n.id === hoveredIdRef.current || n.id === draggingId || n.id === focusId;
      n.targetScale = draggingId === n.id ? 1.28 : isFocus ? 1.14 : 1;
      n.scale += (n.targetScale - n.scale) * SCALE_LERP;
    });

    // alphaがALPHA_MIN未満になったら、d3-forceと同じくシミュレーションを
    // 止める（物理演算そのものを呼ばなくする。フォースはalphaに比例して
    // 既にほぼゼロになっているはずだが、念のため速度も明示的にゼロへ
    // リセットしておく）
    if (draggingId == null && alphaRef.current < ALPHA_MIN) {
      list.forEach((n) => {
        n.vx = 0;
        n.vy = 0;
      });
      physicsActiveRef.current = false;
    }
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

    // alphaを1（全開）から始めることで、事前収束ループの間に通常の
    // ドラッグ後と同じ減衰カーブで自然に力が弱まっていく
    // （ALPHA_DECAY≈0.0228なら約300ティックでALPHA_MIN未満になるため、
    // PRE_CONVERGE_STEPS=1500は十分すぎるほど余裕がある）
    alphaRef.current = 1;
    alphaTargetRef.current = 0;
    for (let i = 0; i < PRE_CONVERGE_STEPS; i += 1) step();
    // 収束後も速度・alphaをゼロへ明示的にリセットする（graph-physics-mock.
    // htmlの承認済み実装にはこの1行があったが、移植時に見落としていた）。
    // これが無いと、収束しきらずわずかに残った速度が毎フレーム積分され
    // 続け、実データではグラフ全体がゆっくり回転して見える不具合になる
    nextNodes.forEach((n) => {
      n.vx = 0;
      n.vy = 0;
    });
    alphaRef.current = 0;
    physicsActiveRef.current = false;

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
        // 静止後にドラッグを始めたときは、周囲のノードも押し返せるよう
        // 物理演算を再度有効化する。alphaTargetを1ではなく0.3にとどめる
        // ことで、d3-forceのドラッグ実装と同じく、周囲のノードが急に
        // 沸き立つのではなく穏やかに反応する（ALPHA_TARGET_DRAG宣言の
        // コメント参照）
        physicsActiveRef.current = true;
        alphaTargetRef.current = ALPHA_TARGET_DRAG;
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
        const nextHoveredId = hit?.id ?? null;
        // pointermoveは同じノード上でも高頻度に発火するため、値が実際に
        // 変わったときだけ呼び出し元（GraphPage）へ通知する
        // （毎フレームの再レンダーを避けるため）。
        if (nextHoveredId !== hoveredIdRef.current) {
          hoveredIdRef.current = nextHoveredId;
          onHoverNodeRef.current?.(nextHoveredId);
        }
        setCursor();
      }
    };

    const handlePointerLeave = () => {
      if (hoveredIdRef.current !== null) {
        hoveredIdRef.current = null;
        onHoverNodeRef.current?.(null);
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
      // d3-forceのドラッグ実装と同じく、ドラッグ終了時はalphaTargetを
      // 0へ戻すだけでよい。alpha自体はALPHA_DECAYに従って毎ティック
      // 指数関数的に減衰し続け、ALPHA_MIN未満になった時点でstep()内が
      // 自動的にphysicsActiveRefをfalseへ戻す（「速度が閾値を自然に
      // 下回るのを待つ」場当たり的な判定ではなく、alphaという単一の値が
      // 全ての力を比例して弱めるため、収束が数学的に保証される）
      alphaTargetRef.current = 0;
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
    canvas.addEventListener("pointerleave", handlePointerLeave);
    canvas.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      canvas.removeEventListener("pointerup", endInteraction);
      canvas.removeEventListener("pointercancel", endInteraction);
      canvas.removeEventListener("pointerleave", handlePointerLeave);
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, []);

  // 描画（draw）はマウント中常時回り続けるが、物理演算（step）は
  // physicsActiveRefがtrueの間だけ呼ぶ。2026-09、実データで「グラフ
  // 全体がゆっくり回転して見える」不具合が再発したため、ドラッグ中で
  // なく速度が十分小さいときはstep()自体を呼ばず完全に静止させる方式へ
  // 変更した（physicsActiveRef宣言のコメント参照。以前は「減衰はするが
  // 完全停止はしないバネ物理」を意図的な仕様としていたが、この方針を
  // 撤回した）
  useEffect(() => {
    let rafId = requestAnimationFrame(function loop() {
      if (physicsActiveRef.current) step();
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
