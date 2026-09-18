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
 * loading / empty / error を必ず用意する（docs/design.md の UI Rules）。
 * empty/noMatch/errorの見た目は共通コンポーネント（components/EmptyState.jsx）
 * に集約している。fillHeightでキャンバス全体の高さいっぱいに中央寄せする。
 */

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
