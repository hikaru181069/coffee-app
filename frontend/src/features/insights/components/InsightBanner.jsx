import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useInsights } from "../hooks/useInsights";

/** insight.typeごとに翻訳キーと変数を決める */
const describeInsight = (insight, t) => {
  switch (insight.type) {
    case "topCombination": {
      const [origin, process] = insight.attributes;
      return t("insights.topCombination", { origin: origin.label, process: process.label });
    }
    case "risingTrend":
      return t("insights.risingTrend", { label: insight.label });
    case "homeVsCafeDiff":
      return t(`insights.homeVsCafeDiff.${insight.higherType}`);
    case "topProcessRating":
      return t("insights.topProcessRating", { label: insight.label, avgRating: insight.avgRating });
    case "topFlavor":
      return t("insights.topFlavor", { label: insight.label });
    case "topOrigin":
      return t("insights.topOrigin", { label: insight.label });
    default:
      return null;
  }
};

/**
 * Home画面に表示する、一番説得力のあるInsight（傾向）の一文。
 *
 * docs/insights.md 参照。バックエンドが優先度順に返した配列の先頭
 * （insights[0]）だけを表示する。「静かな道具」の方針に沿って、
 * 複数のInsightを並べて情報過多にしない。
 *
 * 条件を満たすInsightが1つも無い・読み込み中・エラー時はすべて
 * 何も表示しない（features/graph/components/GraphPreview.jsxと同じ方針。
 * Homeの主役はあくまで記録一覧とCTAであり、この要素が無くても
 * 画面として成立する）。
 *
 * /graphへのLinkにしている。docs/product-principles.md
 * 「Discovery Must Be Actionable」に従い、一文を提示するだけで
 * 終わらせず、そこからグラフでの探索へつなげるため
 * （GraphPreview.jsxと同じ理由・同じ見た目）。
 */
function InsightBanner() {
  const { t } = useTranslation();
  const { insights, isLoading, error } = useInsights();

  if (isLoading || error || insights.length === 0) return null;

  const text = describeInsight(insights[0], t);
  if (!text) return null;

  return (
    <Link
      to="/graph"
      className="flex items-start gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors duration-150 hover:border-ctp-overlay0 focus:outline-none focus:ring-2 focus:ring-ctp-blue/50"
    >
      <Sparkles size={18} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-ctp-mauve" />
      <p className="text-sm text-ctp-text">{text}</p>
    </Link>
  );
}

export default InsightBanner;
