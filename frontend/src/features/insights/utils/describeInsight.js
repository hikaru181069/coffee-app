/**
 * insight.typeごとに翻訳キーと変数を決める。
 *
 * 2026-08、InsightBanner.jsxから切り出した。Home画面の統合Discoverカード
 * （features/discover/components/DiscoverCard.jsx）からも同じ文言生成が
 * 必要になったため、pureな関数として独立させた（データ取得は
 * features/insights/hooks/useInsights.jsのまま、Insight機能の一部）。
 */
export const describeInsight = (insight, t) => {
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
