import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { cardClass, secondaryButtonClass } from "../../coffee-records/components/formStyles";

/**
 * Discoverの提案1件分のカード。
 *
 * Entity Detailページ（`DiscoverSuggestions.jsx`）とDiscover専用ページ
 * （`pages/DiscoverPage.jsx`）の両方から使う共通の見た目。
 */
function SuggestionCard({ suggestion }) {
  const { t } = useTranslation();

  return (
    <li className={cardClass}>
      <p className="text-sm text-ctp-text">
        {t("discover.similarProcessOrigin", {
          originLabel: suggestion.basedOn.originLabel,
          processLabel: suggestion.basedOn.processLabel,
          count: suggestion.basedOn.count,
          suggestedLabel: suggestion.suggestedOrigin.label,
        })}
      </p>
      <Link to="/records/new" className={`${secondaryButtonClass} mt-3`}>
        {t("discover.recordCta")}
      </Link>
    </li>
  );
}

export default SuggestionCard;
