import { useCallback, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { useGraph } from "../features/graph/hooks/useGraph";
import { useNodeDetail } from "../features/graph/hooks/useNodeDetail";
import GraphCanvas from "../features/graph/components/GraphCanvas";
import GraphFilters from "../features/graph/components/GraphFilters";
import GraphLegend from "../features/graph/components/GraphLegend";
import NodeDetailPanel from "../features/graph/components/NodeDetailPanel";
import {
  GraphEmptyState,
  GraphErrorState,
  GraphLoadingState,
  GraphNoMatchState,
} from "../features/graph/components/GraphStates";

/**
 * 知識グラフ画面。
 *
 * このページが持つのは「画面の構成」「絞り込みの状態」「選択中ノード」だけ。
 * API通信はhook、描画はGraphCanvas、詳細表示はNodeDetailPanelに任せる
 * （CLAUDE.md: pageコンポーネントに巨大なJSXを置かない）。
 */

const DEFAULT_FILTERS = { nodeTypes: [], recordType: "", ratingMin: "" };

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

  const { graph, isLoading, error, reload } = useGraph(filters);
  const { detail, isLoading: isDetailLoading, error: detailError } = useNodeDetail(
    selectedNode,
    filters,
  );

  const hasActiveFilters = useMemo(
    () =>
      (filters.nodeTypes?.length ?? 0) > 0 ||
      filters.recordType !== "" ||
      filters.ratingMin !== "",
    [filters],
  );

  const clearFilters = useCallback(() => setFilters(DEFAULT_FILTERS), []);

  /**
   * RecordDetailPageの「Graphで見る」から ?focus=record:xxx で開かれた場合、
   * グラフが読み込まれたタイミングでそのノードを自動選択する。
   *
   * useEffectは使わない。「propの変化に応じて状態を1回だけ調整する」場合、
   * Reactはレンダリング中に前回値と比較して直接setStateする方法を推奨している
   * （effect内での同期的なsetStateはカスケードする再レンダリングを招くため）。
   * features/coffee-records/hooks/useRecordForm.js の syncedRecord と同じ形。
   *
   * URLから focus を消す処理は setSearchParams ではなく
   * window.history.replaceState を直接使っている。
   * このアプリには既存のページ遷移アニメーション（App.jsx の
   * AnimatedRoutes、location.key を React の key に使う仕組み）があり、
   * どんなナビゲーションでもページ全体を再マウントする設計になっている。
   * setSearchParams経由でURLを書き換えると、それ自体が新しい
   * location.key を発行してしまい、選択した直後にページが丸ごと
   * 再マウントされて選択状態が消えてしまう（実機で確認して気づいた）。
   * history.replaceState は React Router の location を更新しないため、
   * この再マウントを起こさずにURLだけを綺麗にできる。
   */
  if (focusNodeId && graph && graph !== appliedFocusGraph) {
    setAppliedFocusGraph(graph);

    const node = graph.nodes.find((candidate) => candidate.id === focusNodeId);
    if (node) {
      setSelectedNode({ id: node.id, data: node });

      const url = new URL(window.location.href);
      url.searchParams.delete("focus");
      window.history.replaceState(null, "", url);
    }
  }

  const renderBody = () => {
    if (isLoading) return <GraphLoadingState />;
    if (error) return <GraphErrorState error={error} onRetry={reload} />;

    if (!graph || graph.summary.recordCount === 0) {
      return hasActiveFilters ? (
        <GraphNoMatchState onClearFilters={clearFilters} />
      ) : (
        <GraphEmptyState />
      );
    }

    return (
      <ReactFlowProvider>
        <div className="relative h-full w-full">
          <GraphCanvas
            graph={graph}
            selectedNodeId={selectedNode?.id}
            onSelectNode={setSelectedNode}
          />
          <NodeDetailPanel
            node={selectedNode}
            detail={detail}
            isLoading={isDetailLoading}
            error={detailError}
            onClose={() => setSelectedNode(null)}
          />
        </div>
      </ReactFlowProvider>
    );
  };

  return (
    <div className="coffee-page flex h-[calc(100vh-3.5rem)] flex-col gap-3 px-4 py-4 sm:h-screen sm:px-6">
      <header>
        <h1 className="text-xl font-bold text-ctp-text">Graph</h1>
        <p className="mt-1 text-sm text-ctp-subtext0">
          {t("graph.subtitle")}
        </p>
      </header>

      <GraphFilters filters={filters} onChange={setFilters} />
      <GraphLegend />

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-ctp-surface1">
        {renderBody()}
      </div>
    </div>
  );
}

export default GraphPage;
