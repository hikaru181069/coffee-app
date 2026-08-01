import { Link } from "react-router-dom";
import { AlertCircle, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  primaryButtonClass,
  secondaryButtonClass,
} from "../../coffee-records/components/formStyles";
import { getErrorMessage } from "../../../utils/errorMessage";

/**
 * グラフの「中身が無いとき」の表示。
 *
 * features/coffee-records/components/RecordListStates.jsx と同じ方針。
 * loading / empty / error を必ず用意する（prompts/05 の Checks）。
 */

export function GraphLoadingState() {
  const { t } = useTranslation();
  return (
    <div
      aria-busy="true"
      aria-label={t("common.loading")}
      className="flex h-full min-h-64 items-center justify-center rounded-xl border border-ctp-surface1 bg-ctp-mantle"
    >
      <div className="skeleton-block h-40 w-40 rounded-full" />
    </div>
  );
}

/** 記録そのものが1件も無いとき */
export function GraphEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ctp-overlay0/60 px-6 py-12 text-center">
      <Share2 size={32} aria-hidden="true" className="text-ctp-subtext0" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-ctp-text">{t("graph.emptyTitle")}</p>
        <p className="mt-1 text-sm text-ctp-subtext0">
          {t("graph.emptyDesc")}
        </p>
      </div>
      <Link to="/records/new" className={`${primaryButtonClass} mt-1`}>
        {t("records.emptyCta")}
      </Link>
    </div>
  );
}

/** 絞り込みの結果、記録が0件になったとき */
export function GraphNoMatchState({ onClearFilters }) {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-ctp-overlay0/60 px-6 py-12 text-center">
      <p className="text-sm font-medium text-ctp-text">{t("records.noMatchTitle")}</p>
      <button type="button" onClick={onClearFilters} className={secondaryButtonClass}>
        {t("common.clearFilters")}
      </button>
    </div>
  );
}

export function GraphErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-ctp-red/40 bg-ctp-red/5 px-6 py-12 text-center"
    >
      <AlertCircle size={32} aria-hidden="true" className="text-ctp-red" strokeWidth={1.5} />
      <p className="text-sm text-ctp-text">{error ? getErrorMessage(error, t) : t("common.loadFailed")}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={secondaryButtonClass}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
