import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { primaryButtonClass } from "../../coffee-records/components/formStyles";

/**
 * 記録が1件も無いときのStatsページ。
 * RecordsEmptyState（features/coffee-records/components/RecordListStates.jsx）と
 * 同じ見た目パターン（枠線・アイコン・タイトル・説明・CTA）を踏襲する。
 * CTAの遷移先・文言はRecordsEmptyStateと共有し、新規キーを増やさない。
 */
function StatsEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ctp-overlay0/60 px-6 py-12 text-center">
      <TrendingUp size={32} aria-hidden="true" className="text-ctp-subtext0" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-ctp-text">{t("stats.emptyTitle")}</p>
        <p className="mt-1 text-sm text-ctp-subtext0">{t("stats.emptyDesc")}</p>
      </div>
      <Link to="/records/new" className={`${primaryButtonClass} mt-1`}>
        {t("records.emptyCta")}
      </Link>
    </div>
  );
}

export default StatsEmptyState;
