import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { secondaryButtonClass } from "../../coffee-records/components/formStyles";

/**
 * Discoverの提案1件分のカード。
 *
 * Entity Detailページに埋め込む`DiscoverSuggestions.jsx`が使う見た目。
 * 2026-08、専用の`/discover`一覧ページ（`pages/DiscoverPage.jsx`）は
 * 実データで検証した結果、比較対象がほとんどの場合1〜2件に留まり
 * 専用ページの価値が薄いと判断して削除した（IMPLEMENTATION.md参照）。
 *
 * 2026-08、`DiscoverSuggestions.jsx`の外枠を`cardClass`で囲んだ際、
 * このカードがその中へ入れ子になった。StatCard.jsxの`flat`propと
 * 同じ理由で、ネストされた内側のカードには影を付けない。
 *
 * 2026-08、「この産地を記録してみる」に産地名をクエリ文字列
 * （`?originName=`）で添えるようにした。suggestedOriginはCQI参照
 * データ由来でOriginマスターのIDを持たないため、名前で渡し
 * RecordFormPage.jsx側でmasterDataと突き合わせてoriginIdへ解決する。
 */
function SuggestionCard({ suggestion, flat = false }) {
  const { t } = useTranslation();

  return (
    <li
      className={`rounded-2xl border border-surface-2 bg-raised p-4 sm:p-5 ${flat ? "" : "shadow-elevated"}`}
    >
      <p className="text-sm text-text">
        {t("discover.similarProcessOrigin", {
          originLabel: suggestion.basedOn.originLabel,
          processLabel: suggestion.basedOn.processLabel,
          count: suggestion.basedOn.count,
          suggestedLabel: suggestion.suggestedOrigin.label,
        })}
      </p>
      <Link
        to={`/records/new?originName=${encodeURIComponent(suggestion.suggestedOrigin.label)}`}
        className={`${secondaryButtonClass} mt-3`}
      >
        {t("discover.recordCta")}
      </Link>
    </li>
  );
}

export default SuggestionCard;
