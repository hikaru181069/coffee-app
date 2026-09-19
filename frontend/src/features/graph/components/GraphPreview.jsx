import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGraph } from "../hooks/useGraph";
import { buildPreviewLayout } from "../utils/previewIllustration";
import { getNodeVisual } from "../utils/nodeVisuals";

const PREVIEW_FILTERS = { nodeTypes: [], recordType: "", ratingMin: "" };

/**
 * Home画面に埋め込む知識グラフのサマリーカード。
 *
 * 2026-09、Render方向性の検討（Artifactモック）を経て、見出し行
 * （タイトル+件数）／グラフ本体／フッター行（タグライン+導線）の
 * 3段構成へ作り直した。以前は「読めなくていい、ごく薄い」方針
 * （opacity 40%）だったが、実データのノード・エッジをはっきり見せる
 * 方向へ変更している。レイアウト計算（決定的な疑似乱数）自体は
 * utils/previewIllustration.jsをそのまま再利用しており、
 * react-force-graph-2dへの依存は無いまま。
 *
 * 記録が無い、または取得に失敗した場合は何も表示しない
 * （Home側の記録一覧が空状態を案内するため、ここで重ねて出す必要はない）。
 */
function GraphPreview() {
  const { t } = useTranslation();
  const { graph, isLoading, error } = useGraph(PREVIEW_FILTERS);

  const layout = useMemo(() => (graph ? buildPreviewLayout(graph) : null), [graph]);

  if (isLoading || error || !graph || graph.summary.recordCount === 0) return null;

  return (
    <Link
      to="/graph"
      className="flex h-full flex-col rounded-none border border-surface-2 bg-raised shadow-elevated transition-colors duration-150 hover:border-line focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
    >
      <div className="flex items-center justify-between border-b border-surface-2 px-5 py-4">
        <h3 className="font-mono text-xs font-bold uppercase tracking-wide text-text-tertiary">
          {t("home.knowledgeGraph.heading")}
        </h3>
        <div className="flex items-center gap-4 font-mono text-xs text-text-secondary">
          <span>{t("home.knowledgeGraph.nodeCount", { count: graph.summary.nodeCount })}</span>
          <span>{t("home.knowledgeGraph.edgeCount", { count: graph.summary.edgeCount })}</span>
        </div>
      </div>

      <div className="min-h-0 flex-1 px-5 py-4">
        <GraphIllustration layout={layout} />
      </div>

      <div className="flex items-center justify-between border-t border-surface-2 px-5 py-3 text-sm">
        <span className="text-text-tertiary">{t("home.knowledgeGraph.tagline")}</span>
        <span className="inline-flex items-center gap-1 text-graph-process">
          {t("home.knowledgeGraph.explore")}
          <ArrowRight size={16} aria-hidden="true" />
        </span>
      </div>
    </Link>
  );
}

/**
 * 直近の記録＋その属性ノードを表示するイラスト。ノードが枠の外まで
 * はみ出す位置になることがあるが意図的（utils/previewIllustration.jsの
 * コメント参照。「全体のごく一部」に見せるため）。読み取り用の
 * インタラクション（クリック・ホバー）は持たせない（親のLinkがカード
 * 全体をクリック対象にする）。
 */
function GraphIllustration({ layout }) {
  if (!layout) return null;

  return (
    <svg viewBox={layout.viewBox} aria-hidden="true" className="h-full w-full overflow-hidden">
      {layout.edges.map((edge) => (
        <line
          key={edge.id}
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          stroke={getNodeVisual(edge.targetType).canvasColor}
          strokeOpacity="0.55"
          strokeWidth="1"
        />
      ))}
      {layout.nodes.map((node) => (
        <circle
          key={node.id}
          cx={node.x}
          cy={node.y}
          r={node.type === "record" ? 5 : 3}
          fill={getNodeVisual(node.type).canvasColor}
        />
      ))}
    </svg>
  );
}

export default GraphPreview;
