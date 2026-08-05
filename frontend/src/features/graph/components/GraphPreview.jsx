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
 * 2026-08、以前はGraphCanvas（react-force-graph-2d）をinteractive=falseで
 * 縮小描画していたが、160px程度の高さでは実データを描いてもノードが
 * 小さすぎて読めなかった。その後、実データを使わない抽象イラストへ
 * 変えたが、ユーザーとの相談で「読める必要はないが、本物のデータで
 * あってほしい」という方針に落ち着き、ごく薄く実データの一部
 * （GraphIllustration、utils/previewIllustration.js）を表示する形にした。
 *
 * react-force-graph-2dへの依存は無いまま（決定的な疑似乱数による簡易
 * レイアウトのみで物理演算は使わない）なので、HomePage.jsx側のlazy
 * importは不要のまま。
 *
 * 記録が無い、または取得に失敗した場合は何も表示しない
 * （Home側の記録一覧が空状態を案内するため、ここで重ねて出す必要はない）。
 *
 * 2026-08、イラストを上部から右側へ移動した（ユーザーからのレイアウト
 * 改善案）。テキスト側を`flex-1`にして、狭い画面ではイラストを隠し
 * テキストだけの1カラムにする（装飾要素より本文を優先する）。
 */
function GraphPreview() {
  const { t } = useTranslation();
  const { graph, isLoading, error } = useGraph(PREVIEW_FILTERS);

  const layout = useMemo(() => (graph ? buildPreviewLayout(graph) : null), [graph]);

  if (isLoading || error || !graph || graph.summary.recordCount === 0) return null;

  return (
    <Link
      to="/graph"
      className="flex items-center gap-6 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-5 transition-colors duration-150 hover:border-ctp-overlay0 focus:outline-none focus:ring-2 focus:ring-ctp-blue/50"
    >
      <div className="min-w-0 flex-1">
        <h3 className="text-base font-bold text-ctp-text">{t("home.knowledgeGraph.heading")}</h3>
        <p className="mt-1 text-sm text-ctp-subtext0">{t("home.knowledgeGraph.tagline")}</p>

        <div className="mt-4 flex items-center gap-4 font-mono text-sm text-ctp-subtext1">
          <span>{t("home.knowledgeGraph.nodeCount", { count: graph.summary.nodeCount })}</span>
          <span>{t("home.knowledgeGraph.edgeCount", { count: graph.summary.edgeCount })}</span>
        </div>

        <span className="mt-4 inline-flex items-center gap-1 text-xs text-ctp-subtext0">
          {t("home.knowledgeGraph.explore")}
          <ArrowRight size={14} aria-hidden="true" />
        </span>
      </div>

      <GraphIllustration layout={layout} />
    </Link>
  );
}

/**
 * 直近の記録＋その属性ノードを、ごく薄く（低いopacity）表示するイラスト。
 * ノードが枠の外まではみ出す位置になることがあるが意図的（
 * utils/previewIllustration.jsのコメント参照。「全体のごく一部」に
 * 見せるため）。読めることを目的にしていないため、クリック・ホバーの
 * 当たり判定は持たせない（親のLinkがカード全体をクリック対象にする）。
 */
function GraphIllustration({ layout }) {
  if (!layout) return null;

  return (
    <svg
      viewBox={layout.viewBox}
      aria-hidden="true"
      className="hidden h-24 w-32 flex-shrink-0 overflow-hidden opacity-40 sm:block"
    >
      {layout.edges.map((edge) => (
        <line
          key={edge.id}
          x1={edge.x1}
          y1={edge.y1}
          x2={edge.x2}
          y2={edge.y2}
          className="stroke-ctp-overlay0"
          strokeWidth="1"
        />
      ))}
      {layout.nodes.map((node) => (
        <circle key={node.id} cx={node.x} cy={node.y} r="4" fill={getNodeVisual(node.type).canvasColor} />
      ))}
    </svg>
  );
}

export default GraphPreview;
