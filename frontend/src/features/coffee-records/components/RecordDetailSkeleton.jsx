import { useTranslation } from "react-i18next";

/**
 * 読み込み中の記録詳細ページ。RecordDetailPage.jsxの実際の構成
 * （Breadcrumb→Header→divide-yで区切ったProperty Grid/Tasting Note/
 * Connections）と同じ形の骨格を出す
 * （features/stats/components/StatsSkeleton.jsxと同じ考え方）。
 */
function RecordDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <div className="skeleton-block h-4 w-24 rounded" />

      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <div className="skeleton-block h-7 w-56 rounded" />
          <div className="skeleton-block h-4 w-40 rounded" />
        </div>
        <div className="skeleton-block h-8 w-28 rounded-full" />
      </div>

      <div className="mt-6 flex flex-col divide-y divide-surface-2">
        <section className="pb-6">
          <div className="skeleton-block h-4 w-28 rounded" />
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <div className="skeleton-block h-3 w-16 rounded" />
                <div className="skeleton-block h-4 w-24 rounded" />
              </div>
            ))}
          </div>
        </section>

        <section className="py-6">
          <div className="skeleton-block h-4 w-24 rounded" />
          <div className="mt-3 flex flex-col gap-2">
            <div className="skeleton-block h-4 w-full rounded" />
            <div className="skeleton-block h-4 w-full rounded" />
            <div className="skeleton-block h-4 w-2/3 rounded" />
          </div>
        </section>

        <section className="py-6">
          <div className="skeleton-block h-4 w-32 rounded" />
          <div className="skeleton-block mt-4 h-40 w-full rounded-xl" />
        </section>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="skeleton-block h-9 w-24 rounded-lg" />
        <div className="skeleton-block h-9 w-10 rounded-lg" />
      </div>
    </div>
  );
}

export default RecordDetailSkeleton;
