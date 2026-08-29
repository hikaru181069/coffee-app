import { Link } from "react-router-dom";
import { AlertCircle, Coffee, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

import { primaryButtonClass, secondaryButtonClass } from "./formStyles";
import { getErrorMessage } from "../../../utils/errorMessage";

/**
 * 一覧の「中身が無いとき」の表示をまとめる。
 *
 * loading / empty / error は必ず作る（prompts/03 の States）。
 * 何も出さないと、読み込み中なのか記録が無いのか通信が失敗したのかが
 * 区別できず、ユーザーは待つべきか操作すべきか判断できない。
 */

/**
 * 読み込み中。カードと同じ形の枠を出して、表示位置が飛ばないようにする。
 *
 * 2026-08、`RecordCard.jsx`に追加された産地アクセントバー+産地名の行
 * （`HomeRecordCardSkeleton.jsx`は追随済みだったが、こちらは更新が漏れて
 * いた。ローディングスケルトンのレビューで発覚）を追加した。
 */
export function RecordListSkeleton({ count = 4 }) {
  const { t } = useTranslation();
  return (
    <ul aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="rounded-2xl border border-surface-2 bg-raised p-5 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <div className="skeleton-block h-3 w-0.5 rounded-full" />
            <div className="skeleton-block h-3 w-16 rounded" />
          </div>
          <div className="skeleton-block mt-2 h-4 w-1/2 rounded" />
          <div className="skeleton-block mt-2 h-3 w-1/3 rounded" />
          <div className="mt-4 flex gap-1.5">
            <div className="skeleton-block h-5 w-1/5 rounded-full" />
            <div className="skeleton-block h-5 w-1/4 rounded-full" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * 記録が1件も無いとき。
 * 空状態には次の行動を示す（docs/design.md の UI Rules）。
 */
export function RecordsEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line/60 px-6 py-12 text-center">
      <Coffee size={32} aria-hidden="true" className="text-text-tertiary" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-text">{t("records.emptyTitle")}</p>
        <p className="mt-1 text-sm italic text-text-tertiary">
          {t("records.emptyDesc")}
        </p>
      </div>
      <Link to="/records/new" className={`${primaryButtonClass} mt-1`}>
        {t("records.emptyCta")}
      </Link>
    </div>
  );
}

/** 絞り込みの結果が0件のとき。記録が無い場合とは案内を変える */
export function RecordsNoMatchState({ onClearFilters }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-line/60 px-6 py-12 text-center">
      <SearchX size={32} aria-hidden="true" className="text-text-tertiary" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-text">{t("records.noMatchTitle")}</p>
        <p className="mt-1 text-sm italic text-text-tertiary">{t("records.noMatchDesc")}</p>
      </div>
      <button type="button" onClick={onClearFilters} className={secondaryButtonClass}>
        {t("common.clearFilters")}
      </button>
    </div>
  );
}

/** 通信・サーバーのエラー。再試行の手段を必ず添える */
export function RecordsErrorState({ error, onRetry }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-danger/40 bg-danger/5 px-6 py-12 text-center"
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
