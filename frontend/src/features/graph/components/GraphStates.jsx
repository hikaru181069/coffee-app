import { Link } from "react-router-dom";
import { AlertCircle, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import {
  primaryButtonClass,
  secondaryButtonClass,
} from "../../coffee-records/components/formStyles";
import { getErrorMessage } from "../../../utils/errorMessage";
import EmptyState from "../../../components/EmptyState";

/**
 * グラフの「中身が無いとき」の表示。
 *
 * features/coffee-records/components/RecordListStates.jsx と同じ方針。
 * loading / empty / error を必ず用意する（prompts/05 の Checks）。
 * empty/noMatch/errorの見た目は共通コンポーネント（components/EmptyState.jsx）
 * に集約している。fillHeightでキャンバス全体の高さいっぱいに中央寄せする。
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
      className="relative h-full min-h-64 overflow-hidden rounded-2xl border border-surface-2 bg-raised shadow-elevated"
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
    <EmptyState
      fillHeight
      icon={Share2}
      title={t("graph.emptyTitle")}
      description={t("graph.emptyDesc")}
      action={
        <Link to="/records/new" className={`${primaryButtonClass} mt-1`}>
          {t("records.emptyCta")}
        </Link>
      }
    />
  );
}

/** 絞り込みの結果、記録が0件になったとき */
export function GraphNoMatchState({ onClearFilters }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      fillHeight
      title={t("records.noMatchTitle")}
      action={
        <button type="button" onClick={onClearFilters} className={secondaryButtonClass}>
          {t("common.clearFilters")}
        </button>
      }
    />
  );
}

export function GraphErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      fillHeight
      role="alert"
      variant="error"
      icon={AlertCircle}
      title={error ? getErrorMessage(error, t) : t("common.loadFailed")}
      action={
        onRetry && (
          <button type="button" onClick={onRetry} className={secondaryButtonClass}>
            {t("common.retry")}
          </button>
        )
      }
    />
  );
}
