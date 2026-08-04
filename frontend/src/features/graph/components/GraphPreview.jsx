import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useGraph } from "../hooks/useGraph";

const PREVIEW_FILTERS = { nodeTypes: [], recordType: "", ratingMin: "" };

/**
 * Home画面に埋め込む知識グラフのサマリーカード。
 *
 * 2026-08、以前はGraphCanvas（react-force-graph-2d）をinteractive=falseで
 * 縮小描画していたが、160px程度の高さでは実データを描いても
 * ノードが小さすぎて読めず、「知識ベース感」を伝える役割を果たせなかった。
 * ユーザーからのレイアウト案を踏まえ、実データの縮小描画ではなく、
 * 抽象的な静的イラスト（GraphIllustration）+ 見出し + タグライン +
 * ノード数・つながり数の実数字、という構成に変更した。
 *
 * react-force-graph-2dへの依存が無くなったため、HomePage.jsx側の
 * lazy import（bundle分離）も不要になった。
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
      className="mt-6 block rounded-xl border border-ctp-surface1 bg-ctp-mantle p-5 transition-colors duration-150 hover:border-ctp-overlay0 focus:outline-none focus:ring-2 focus:ring-ctp-blue/50"
    >
      <GraphIllustration />

      <h3 className="mt-4 text-base font-bold text-ctp-text">{t("home.knowledgeGraph.heading")}</h3>
      <p className="mt-1 text-sm text-ctp-subtext0">{t("home.knowledgeGraph.tagline")}</p>

      <div className="mt-4 flex items-center gap-4 font-mono text-sm text-ctp-subtext1">
        <span>{t("home.knowledgeGraph.nodeCount", { count: graph.summary.nodeCount })}</span>
        <span>{t("home.knowledgeGraph.edgeCount", { count: graph.summary.edgeCount })}</span>
      </div>

      <span className="mt-4 inline-flex items-center gap-1 text-xs text-ctp-subtext0">
        {t("home.knowledgeGraph.explore")}
        <ArrowRight size={14} aria-hidden="true" />
      </span>
    </Link>
  );
}

/**
 * 静的な抽象グラフイラスト。実データを反映しない装飾（上のコメント参照）。
 * ノード種別の色（utils/nodeVisuals.jsのcanvasColorと同系色）を
 * いくつか使い、「いろいろな種類のノードがつながっている」ことだけを
 * 伝える。
 */
function GraphIllustration() {
  return (
    <svg viewBox="0 0 200 64" aria-hidden="true" className="h-12 w-full max-w-[200px]">
      <line x1="32" y1="16" x2="62" y2="16" className="stroke-ctp-overlay0" strokeWidth="1.5" />
      <line x1="62" y1="16" x2="52" y2="42" className="stroke-ctp-overlay0" strokeWidth="1.5" />
      <line x1="52" y1="42" x2="90" y2="42" className="stroke-ctp-overlay0" strokeWidth="1.5" />
      <line x1="90" y1="42" x2="122" y2="42" className="stroke-ctp-overlay0" strokeWidth="1.5" />
      <line x1="62" y1="16" x2="122" y2="42" className="stroke-ctp-overlay0" strokeWidth="1.5" />
      <line x1="146" y1="12" x2="122" y2="42" className="stroke-ctp-overlay0" strokeWidth="1.5" />

      <circle cx="32" cy="16" r="5" className="fill-ctp-lavender" />
      <circle cx="62" cy="16" r="5" className="fill-ctp-sapphire" />
      <circle cx="146" cy="12" r="5" className="fill-ctp-pink" />
      <circle cx="52" cy="42" r="5" className="fill-ctp-green" />
      <circle cx="90" cy="42" r="5" className="fill-ctp-teal" />
      <circle cx="122" cy="42" r="5" className="fill-ctp-peach" />
    </svg>
  );
}

export default GraphPreview;
