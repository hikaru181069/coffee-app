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

/**
 * ノード・エッジを軽く連想させる骨格（物理演算の再現はしない。
 * 円=recordノード、角丸矩形=属性ノードに見立てた形をいくつか散りばめ、
 * 薄い斜め線でエッジを表現する）。
 */
export function GraphLoadingState() {
  const { t } = useTranslation();
  return (
    <div
      aria-busy="true"
      aria-label={t("common.loading")}
      className="relative h-full min-h-64 overflow-hidden rounded-xl border border-surface-2 bg-raised"
    >
      <div className="absolute left-[18%] top-[55%] h-px w-40 origin-left rotate-[18deg] bg-line/40" />
      <div className="absolute left-[32%] top-[30%] h-px w-36 origin-left rotate-[-22deg] bg-line/40" />
      <div className="absolute left-[48%] top-[62%] h-px w-44 origin-left rotate-[8deg] bg-line/40" />
      <div className="absolute left-[55%] top-[25%] h-px w-32 origin-left rotate-[35deg] bg-line/40" />

      <div className="skeleton-block absolute left-[15%] top-[48%] h-16 w-16 rounded-full" />
      <div className="skeleton-block absolute left-[38%] top-[22%] h-10 w-10 rounded-full" />
      <div className="skeleton-block absolute left-[58%] top-[58%] h-12 w-12 rounded-full" />
      <div className="skeleton-block absolute left-[30%] top-[68%] h-8 w-16 rounded-lg" />
      <div className="skeleton-block absolute left-[68%] top-[30%] h-8 w-20 rounded-lg" />
      <div className="skeleton-block absolute left-[50%] top-[78%] h-8 w-14 rounded-lg" />
    </div>
  );
}

/** 記録そのものが1件も無いとき */
export function GraphEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line/60 px-6 py-12 text-center">
      <Share2 size={32} aria-hidden="true" className="text-text-tertiary" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-text">{t("graph.emptyTitle")}</p>
        <p className="mt-1 text-sm text-text-tertiary">
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
    <div className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line/60 px-6 py-12 text-center">
      <p className="text-sm font-medium text-text">{t("records.noMatchTitle")}</p>
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
      className="flex h-full min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-danger/40 bg-danger/5 px-6 py-12 text-center"
    >
      <AlertCircle size={32} aria-hidden="true" className="text-danger" strokeWidth={1.5} />
      <p className="text-sm text-text">{error ? getErrorMessage(error, t) : t("common.loadFailed")}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={secondaryButtonClass}>
          {t("common.retry")}
        </button>
      )}
    </div>
  );
}
