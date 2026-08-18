import { useTranslation } from "react-i18next";

/**
 * 読み込み中のStatsページ。表示位置が飛ばないよう、実際の3セクション構成
 * （記録のペース／Collection／味の傾向）と同じ形の骨格を出す
 * （features/coffee-records/components/RecordListStates.jsxのRecordListSkeletonと同じ考え方）。
 */
function StatsSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col divide-y divide-surface-2">
      <div className="pb-6">
        <div className="skeleton-block mb-4 h-6 w-1/3 rounded" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton-block h-[62px] rounded-xl" />
          ))}
        </div>
        <div className="skeleton-block mt-4 h-[124px] w-full rounded-xl" />
      </div>
      <div className="py-6">
        <div className="skeleton-block mb-4 h-6 w-1/4 rounded" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton-block h-[62px] rounded-xl" />
          ))}
        </div>
      </div>
      <div className="pt-6">
        <div className="skeleton-block mb-4 h-6 w-1/3 rounded" />
        <div className="skeleton-block h-[108px] w-full rounded-xl" />
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={index} className="flex flex-col gap-2">
              {Array.from({ length: 5 }, (_, row) => (
                <div key={row} className="skeleton-block h-4 w-full rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StatsSkeleton;
