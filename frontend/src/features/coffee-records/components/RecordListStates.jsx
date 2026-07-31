import { Link } from "react-router-dom";
import { AlertCircle, Coffee, SearchX } from "lucide-react";

import { primaryButtonClass, secondaryButtonClass } from "./formStyles";

/**
 * 一覧の「中身が無いとき」の表示をまとめる。
 *
 * loading / empty / error は必ず作る（prompts/03 の States）。
 * 何も出さないと、読み込み中なのか記録が無いのか通信が失敗したのかが
 * 区別できず、ユーザーは待つべきか操作すべきか判断できない。
 */

/** 読み込み中。カードと同じ形の枠を出して、表示位置が飛ばないようにする */
export function RecordListSkeleton({ count = 4 }) {
  return (
    <ul aria-busy="true" aria-label="読み込み中" className="flex flex-col gap-3">
      {Array.from({ length: count }, (_, index) => (
        <li
          key={index}
          className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4"
        >
          <div className="skeleton-block h-4 w-1/2 rounded" />
          <div className="skeleton-block mt-2 h-3 w-1/3 rounded" />
          <div className="skeleton-block mt-3 h-5 w-2/5 rounded-full" />
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
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ctp-overlay0/60 px-6 py-12 text-center">
      <Coffee size={32} aria-hidden="true" className="text-ctp-subtext0" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-ctp-text">まだ記録がありません</p>
        <p className="mt-1 text-sm text-ctp-subtext0">
          最初の1杯を記録すると、産地やフレーバーのつながりが見えはじめます。
        </p>
      </div>
      <Link to="/records/new" className={`${primaryButtonClass} mt-1`}>
        最初の記録をつくる
      </Link>
    </div>
  );
}

/** 絞り込みの結果が0件のとき。記録が無い場合とは案内を変える */
export function RecordsNoMatchState({ onClearFilters }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-ctp-overlay0/60 px-6 py-12 text-center">
      <SearchX size={32} aria-hidden="true" className="text-ctp-subtext0" strokeWidth={1.5} />
      <div>
        <p className="text-sm font-medium text-ctp-text">条件に合う記録がありません</p>
        <p className="mt-1 text-sm text-ctp-subtext0">絞り込みを変えてみてください。</p>
      </div>
      <button type="button" onClick={onClearFilters} className={secondaryButtonClass}>
        絞り込みを解除
      </button>
    </div>
  );
}

/** 通信・サーバーのエラー。再試行の手段を必ず添える */
export function RecordsErrorState({ error, onRetry }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-3 rounded-xl border border-ctp-red/40 bg-ctp-red/5 px-6 py-12 text-center"
    >
      <AlertCircle size={32} aria-hidden="true" className="text-ctp-red" strokeWidth={1.5} />
      <p className="text-sm text-ctp-text">{error?.message ?? "読み込みに失敗しました"}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className={secondaryButtonClass}>
          再試行
        </button>
      )}
    </div>
  );
}
