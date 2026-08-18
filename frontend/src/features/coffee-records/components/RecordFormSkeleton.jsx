import { useTranslation } from "react-i18next";
import { cardClass } from "./formStyles";

/**
 * 読み込み中の記録編集ページ（編集時のみ。新規作成時はスケルトンを出さず
 * 即フォームを表示する）。RecordForm.jsxの実際の構成
 * （Title/日時/種別/評価/メモのカード→Coffee Details折りたたみ→
 * 送信/キャンセルボタン）と同じ形の骨格を出す。
 */
function RecordFormSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <div className="skeleton-block h-4 w-32 rounded" />
      <div className="skeleton-block mt-2 h-7 w-40 rounded" />

      <div className={`${cardClass} mt-5 flex flex-col gap-5`}>
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-block h-3 w-12 rounded" />
          <div className="skeleton-block h-10 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-block h-3 w-20 rounded" />
          <div className="skeleton-block h-10 w-full rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-block h-3 w-16 rounded" />
          <div className="flex gap-2">
            <div className="skeleton-block h-9 w-20 rounded-lg" />
            <div className="skeleton-block h-9 w-20 rounded-lg" />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-block h-3 w-12 rounded" />
          <div className="skeleton-block h-6 w-32 rounded" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-block h-3 w-12 rounded" />
          <div className="skeleton-block h-24 w-full rounded-lg" />
        </div>
      </div>

      <div className="skeleton-block mt-4 h-9 w-40 rounded-lg" />

      <div className="mt-5 flex items-center gap-2">
        <div className="skeleton-block h-9 w-24 rounded-lg" />
        <div className="skeleton-block h-9 w-20 rounded-lg" />
      </div>
    </div>
  );
}

export default RecordFormSkeleton;
