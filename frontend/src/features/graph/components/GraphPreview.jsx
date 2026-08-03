import { Link } from "react-router-dom";
import { ReactFlowProvider } from "@xyflow/react";
import { ArrowUpRight, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGraph } from "../hooks/useGraph";
import GraphCanvas from "./GraphCanvas";

const PREVIEW_FILTERS = { nodeTypes: [], recordType: "", ratingMin: "" };

/**
 * Home画面に埋め込む知識グラフの縮小プレビュー。
 *
 * 操作可能なグラフではなく「育っている」ことを一目で伝える装飾として
 * 表示するため、GraphCanvasはinteractive=falseで描画し、
 * カード全体をpointer-events-noneでラップしてクリックは常に
 * カード自身（/graphへのLink）が受け取るようにする。
 *
 * 記録が無い、または取得に失敗した場合は何も表示しない
 * （Home側の記録一覧が空状態を案内するため、ここで重ねて出す必要はない）。
 */
function GraphPreview() {
  const { t } = useTranslation();
  const { graph, isLoading, error } = useGraph(PREVIEW_FILTERS);

  if (isLoading || error || !graph || graph.summary.recordCount === 0) return null;

  return (
    <Link
      to="/graph"
      className="mt-6 block rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors duration-150 hover:border-ctp-overlay0 focus:outline-none focus:ring-2 focus:ring-ctp-blue/50"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="flex items-center gap-2 text-sm text-ctp-text">
          <Share2 size={16} aria-hidden="true" className="text-ctp-lavender" />
          {t("home.viewConnections")}
        </span>
        <span className="flex items-center gap-1 text-xs text-ctp-subtext0">
          {t("home.goToGraph")}
          <ArrowUpRight size={14} aria-hidden="true" />
        </span>
      </div>

      <div className="h-40 w-full overflow-hidden rounded-lg bg-ctp-crust/40 pointer-events-none">
        <ReactFlowProvider>
          <GraphCanvas graph={graph} selectedNodeId={null} onSelectNode={() => {}} interactive={false} />
        </ReactFlowProvider>
      </div>
    </Link>
  );
}

export default GraphPreview;
