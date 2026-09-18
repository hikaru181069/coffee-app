import { Link } from "react-router-dom";
import { AlertCircle, Coffee, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

import { primaryButtonClass, secondaryButtonClass } from "./formStyles";
import { getErrorMessage } from "../../../utils/errorMessage";
import EmptyState from "../../../components/EmptyState";

/**
 * 一覧の「中身が無いとき」の表示をまとめる。
 *
 * loading / empty / error は必ず作る（docs/design.md の UI Rules）。
 * 何も出さないと、読み込み中なのか記録が無いのか通信が失敗したのかが
 * 区別できず、ユーザーは待つべきか操作すべきか判断できない。
 *
 * empty/noMatch/errorの見た目は共通コンポーネント（components/EmptyState.jsx）
 * に集約している。
 */

/**
 * 記録が1件も無いとき。
 * 空状態には次の行動を示す（docs/design.md の UI Rules）。
 */
export function RecordsEmptyState() {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={Coffee}
      title={t("records.emptyTitle")}
      description={t("records.emptyDesc")}
      action={
        <Link to="/records/new" className={`${primaryButtonClass} mt-1`}>
          {t("records.emptyCta")}
        </Link>
      }
    />
  );
}

/** 絞り込みの結果が0件のとき。記録が無い場合とは案内を変える */
export function RecordsNoMatchState({ onClearFilters }) {
  const { t } = useTranslation();
  return (
    <EmptyState
      icon={SearchX}
      title={t("records.noMatchTitle")}
      description={t("records.noMatchDesc")}
      action={
        <button type="button" onClick={onClearFilters} className={secondaryButtonClass}>
          {t("common.clearFilters")}
        </button>
      }
    />
  );
}

/** 通信・サーバーのエラー。再試行の手段を必ず添える */
export function RecordsErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <EmptyState
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
