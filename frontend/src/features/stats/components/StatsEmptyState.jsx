import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { primaryButtonClass } from "../../coffee-records/components/formStyles";
import EmptyState from "../../../components/EmptyState";

/**
 * 記録が1件も無いときのStatsページ。
 * 見た目は共通コンポーネント（components/EmptyState.jsx）を使い、
 * RecordsEmptyState（features/coffee-records/components/RecordListStates.jsx）
 * と揃える。CTAの遷移先・文言はRecordsEmptyStateと共有し、新規キーを増やさない。
 */
function StatsEmptyState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={TrendingUp}
      title={t("stats.emptyTitle")}
      description={t("stats.emptyDesc")}
      action={
        <Link to="/records/new" className={`${primaryButtonClass} mt-1`}>
          {t("records.emptyCta")}
        </Link>
      }
    />
  );
}

export default StatsEmptyState;
