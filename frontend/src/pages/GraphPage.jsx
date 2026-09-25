import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { useGraph } from "../features/graph/hooks/useGraph";
import { useNodeDetail } from "../features/graph/hooks/useNodeDetail";
import { useGraphCommunities } from "../features/graph/hooks/useGraphCommunities";
import GraphCanvas from "../features/graph/components/GraphCanvas";
import GraphFilters from "../features/graph/components/GraphFilters";
import GraphLegend from "../features/graph/components/GraphLegend";
import GraphCommunities from "../features/graph/components/GraphCommunities";
import GraphNodeSearch from "../features/graph/components/GraphNodeSearch";
import NodeDetailPanel from "../features/graph/components/NodeDetailPanel";
import CoffeeLoader from "../components/CoffeeLoader";
import {
  GraphEmptyState,
  GraphErrorState,
  GraphNoMatchState,
} from "../features/graph/components/GraphStates";

/**
 * 知識グラフ画面。
 *
 * このページが持つのは「画面の構成」「絞り込みの状態」「選択中ノード」だけ。
 * API通信はhook、描画はGraphCanvas、詳細表示はNodeDetailPanelに任せる
 * （CLAUDE.md: pageコンポーネントに巨大なJSXを置かない）。
 */

const DEFAULT_FILTERS = { nodeTypes: [], recordType: "", ratingMin: "", dateFrom: "", dateTo: "" };

function GraphPage() {
  const { t } = useTranslation();
  // 初回マウント時点のURLから focus パラメータを1回だけ取り出す。
  // useState の初期化関数は最初のレンダリングでしか呼ばれないため、
  // 以後のURL変化を継続して監視するものではない
  // （継続監視したいのではなく、「開いたときに何を選ぶか」の
  // 入力として1回だけ使いたいため、これで十分）。
  const [searchParams] = useSearchParams();
  const [focusNodeId] = useState(() => searchParams.get("focus"));
  const [appliedFocusGraph, setAppliedFocusGraph] = useState(null);

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [selectedNode, setSelectedNode] = useState(null);
  // ホバー中のノードID。GraphCanvasのpointermoveから伝わる
  // （GraphCommunities.jsxのプレビュー表示に使う。docs/features.md
  // 「Graph Communities」参照）。
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  // GraphNodeSearchで選んだ時だけカメラを明示的に動かすための合図。
  // 新しいオブジェクト参照を渡すたびGraphCanvas側のuseEffectが発火する
  // （同じノードを続けて選んでも毎回反応させたいため、nodeIdの値ではなく
  // 参照の変化で判定する）
  const [focusRequest, setFocusRequest] = useState(null);

  const { graph, isLoading, error, reload } = useGraph(filters);
  const { detail, isLoading: isDetailLoading, error: detailError } = useNodeDetail(
    selectedNode,
    filters,
  );
  // NodeDetailPanel（クリック）とGraphCommunities（ホバー）の両方が
  // 同じ「自分の記録全体についてのグループ」を参照するため、ここで1回
  // だけ取得して両方へpropsで渡す（フィルター状態には依存しない、
  // useGraphCommunities.js参照）。
  const { communities } = useGraphCommunities();

  const hasActiveFilters = useMemo(
    () =>
      (filters.nodeTypes?.length ?? 0) > 0 ||
      filters.recordType !== "" ||
      filters.ratingMin !== "" ||
      filters.dateFrom !== "" ||
      filters.dateTo !== "",
    [filters],
  );

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  const handleSearchSelect = useCallback((node) => {
    setSelectedNode(node);
    setFocusRequest({ nodeId: node.id });
  }, []);

  /**
   * RecordDetailPageの「Graphで見る」から ?focus=record:xxx で開かれた場合、
   * グラフが読み込まれたタイミングでそのノードを自動選択する。
   *
   * useEffectは使わない。「propの変化に応じて状態を1回だけ調整する」場合、
   * Reactはレンダリング中に前回値と比較して直接setStateする方法を推奨している
   * （effect内での同期的なsetStateはカスケードする再レンダリングを招くため）。
   * features/coffee-records/hooks/useRecordForm.js の syncedRecord と同じ形。
   *
   * URLの ?focus= はここでは消さない。他の全ページ（EntityDetailPageの
   * useParams等）と同じく「URLは開いた瞬間に読む入力として使うだけで、
   * ページ側から書き戻さない」という方針に揃えている。focusNodeIdは
   * 上でuseStateの初期化関数として1度だけ読み取り済みで、
   * appliedFocusGraphのガードにより選択処理も1回しか走らないため、
   * URLに?focus=が残り続けても誤って再選択されることはない。
   *
   * かつては選択後にsetSearchParams/window.history.replaceStateで
   * URLから?focus=を消す後片付けをしていたが、URLを書き換える行為自体が
   * App.jsxのページ遷移アニメーション（location.keyをReactのkeyに使い、
   * どんなナビゲーションでもページ全体を再マウントする仕組み）と衝突し、
   * 選択した直後に状態が消えるバグを踏んだ（README.md「苦労した点」参照）。
   * 後片付け自体をやめることで、この特別な回避策も不要になった。
   */
  if (focusNodeId && graph && graph !== appliedFocusGraph) {
    setAppliedFocusGraph(graph);

    const node = graph.nodes.find((candidate) => candidate.id === focusNodeId);
    if (node) {
      setSelectedNode({ id: node.id, data: node });
    }
  }

  const renderBody = () => {
    if (isLoading) return <CoffeeLoader size="lg" fillHeight />;
    if (error) return <GraphErrorState error={error} onRetry={reload} />;

    if (!graph || graph.summary.recordCount === 0) {
      return hasActiveFilters ? (
        <GraphNoMatchState onClearFilters={clearFilters} />
      ) : (
        <GraphEmptyState />
      );
    }

    return (
      <div className="relative h-full w-full">
        <GraphCanvas
          graph={graph}
          selectedNodeId={selectedNode?.id}
          onSelectNode={setSelectedNode}
          onHoverNode={setHoveredNodeId}
          focusRequest={focusRequest}
        />
        {/*
          2026-09、GraphLegendの下に並べる形（通常のドキュメントフロー）
          で実装していたが、出現・消失のたびにその高さぶんキャンバスが
          上下に押しやられ、ホバー中のノードがカーソルの真下からずれて
          「ホバーが外れる→非表示→キャンバスが元の位置に戻る→カーソルが
          再びノード上に→再表示→…」という無限の点滅ループを引き起こして
          いた（ユーザー報告により発覚）。NodeDetailPanelと同じく、
          キャンバスの上に絶対配置のオーバーレイにすることで、
          表示/非表示がキャンバス自体のレイアウトに一切影響しないように
          修正した。
        */}
        <div className="pointer-events-none absolute left-3 top-3 z-10 max-w-[calc(100%-1.5rem)]">
          <GraphCommunities communities={communities} hoveredNodeId={hoveredNodeId} />
        </div>
        <NodeDetailPanel
          node={selectedNode}
          detail={detail}
          isLoading={isDetailLoading}
          error={detailError}
          communities={communities}
          onClose={() => setSelectedNode(null)}
        />
      </div>
    );
  };

  return (
    <div className="coffee-page flex h-[calc(100vh-3.5rem)] flex-col gap-3 px-4 py-4 sm:h-screen sm:px-6">
      <header>
        <h1 className="text-xl font-bold text-text">Graph</h1>
        <p className="mt-1 text-sm text-text-tertiary">
          {t("graph.subtitle")}
        </p>
      </header>

      {graph && graph.summary.recordCount > 0 && (
        <GraphNodeSearch graph={graph} onSelectNode={handleSearchSelect} />
      )}

      <GraphFilters filters={filters} onChange={setFilters} />
      <GraphLegend />

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-none border border-surface-2">
        {renderBody()}
      </div>
    </div>
  );
}

export default GraphPage;
