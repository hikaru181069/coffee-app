import { Compass } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useOriginDiscovery } from "../hooks/useOriginDiscovery";
import SuggestionCard from "./SuggestionCard";

/**
 * Entity Detailページ（産地）専用の「まだ試していない産地」提案セクション。
 *
 * docs/features.md「Discover」参照。Insight機能（features/insights/）とは完全に独立した
 * 機能で、core/insights/insightBuilder.jsには一切触れていない
 * （Home画面ではInsightの一文と並べて`DiscoverCard.jsx`に表示している
 * が、見せ方を1枚のカードにまとめているだけで、ロジックは別）。
 * CQI（Coffee Quality Institute）の静的参照データが、Country of Origin ×
 * Processing Method の1軸しか持たないため、type === "origin" のときだけ
 * 親（EntityDetailPage.jsx）から nodeId を渡す。
 *
 * 条件を満たす提案が1つも無い・読み込み中・エラー時は何も表示しない
 * （GraphPreview.jsxと同じ「静かな道具」の方針。この要素が無くても
 * Entity Detailページとして成立する）。
 *
 * docs/product-principles.md「Discovery Must Be Actionable」に従い、
 * 提案を出すだけで終わらせず、次の記録（/records/new）への導線にする。
 * 提案された産地はまだ自分のグラフにノードが無いため、Graph/Entity
 * Detailへは遷移できない（提案の性質上「まだ知らない産地」であるため）。
 */
function DiscoverSuggestions({ nodeId }) {
  const { t } = useTranslation();
  const { suggestions, isLoading, error } = useOriginDiscovery(nodeId);

  if (isLoading || error || suggestions.length === 0) return null;

  return (
    <section className="mb-6 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Compass size={16} aria-hidden="true" className="text-success" />
        <h2 className="text-sm font-semibold text-text">{t("discover.heading")}</h2>
      </div>

      <ul className="flex flex-col gap-3">
        {suggestions.map((suggestion) => (
          <SuggestionCard key={suggestion.suggestedOrigin.label} suggestion={suggestion} />
        ))}
      </ul>

      <p className="text-xs text-text-tertiary">{t("discover.sourceNote")}</p>
    </section>
  );
}

export default DiscoverSuggestions;
