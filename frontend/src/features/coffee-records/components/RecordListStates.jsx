import { Link } from "react-router-dom";
import { AlertCircle, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

import { primaryButtonClass, secondaryButtonClass } from "./formStyles";
import CoffeeLoader from "../../../components/CoffeeLoader";
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
 * 読み込み中。カードと同じ形の枠を出して、表示位置が飛ばないようにする。
 *
 * 2026-09、一時的にCoffeeLoader（コーヒーのドリップアニメーション）へ
 * 統一していたが、一覧という「本来複数のカードが並ぶ場所」に単一の
 * 大きいアイコンを出すと形が違いすぎて浮いて見える、という指摘を受けて
 * 復活させた（App.cssの.skeleton-block参照。CoffeeLoader自体はボタン・
 * フルページの状態・Graphキャンバス・DiscoverCardでは引き続き使う）。
 */
export function RecordListSkeleton({ count = 4 }) {
  const { t } = useTranslation();
  return (
    <ul aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="rounded-none border border-surface-2 bg-raised p-5 sm:p-6"
        >
          <div className="flex items-center gap-2">
            <div className="skeleton-block h-3 w-0.5 rounded-full" />
            <div className="skeleton-block h-3 w-16 rounded-none" />
          </div>
          <div className="skeleton-block mt-2 h-4 w-1/2 rounded-none" />
          <div className="skeleton-block mt-2 h-3 w-1/3 rounded-none" />
          <div className="mt-4 flex gap-1.5">
            <div className="skeleton-block h-5 w-1/5 rounded-none" />
            <div className="skeleton-block h-5 w-1/4 rounded-none" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/**
 * 記録が1件も無いとき。
 * 空状態には次の行動を示す（docs/design.md の UI Rules）。
 *
 * 2026-09、固定のCoffeeアイコン（lucide-react）の代わりに、CoffeeLoader
 * （コーヒーのドリップ+液面アニメーション）をループ表示するようにした。
 * 他の使用箇所（保存後の「発見」画面等）が「1サイクルだけ再生する一瞬の
 * 演出」なのに対し、ここは「記録するまでずっと続く状態」を表すため、
 * ループのまま止めない（ユーザーと相談して決定）。共通のEmptyState.jsx
 * はLucideアイコン（`size`数値+`strokeWidth`）を前提にしており
 * CoffeeLoaderのAPIとは形が異なるため、この空状態だけ専用のマークアップ
 * にしている（見た目のクラスはEmptyState.jsxのデフォルトと同じ）。
 */
export function RecordsEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center gap-3 rounded-none border border-dashed border-line/60 px-6 py-12 text-center">
      <CoffeeLoader size="lg" label={t("records.emptyTitle")} />
      <div>
        <p className="text-sm font-medium text-text">{t("records.emptyTitle")}</p>
        <p className="mt-1 text-sm italic text-text-tertiary">{t("records.emptyDesc")}</p>
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
