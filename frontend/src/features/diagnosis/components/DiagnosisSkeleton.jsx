import { useTranslation } from "react-i18next";

/**
 * 読み込み中の診断ページ。実際の3セクション構成
 * （コーヒータイプ／気づき／記録の全体像）と同じ形の骨格を出す
 * （features/stats/components/StatsSkeleton.jsxと同じ考え方）。
 */
function DiagnosisSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col divide-y divide-surface-2">
      <div className="pb-6">
        <div className="skeleton-block mb-4 h-6 w-1/3 rounded" />
        <div className="skeleton-block h-[164px] w-full rounded-2xl" />
      </div>
      <div className="py-6">
        <div className="skeleton-block mb-4 h-6 w-1/4 rounded" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton-block h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
      <div className="pt-6">
        <div className="skeleton-block mb-4 h-6 w-1/3 rounded" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton-block h-[62px] rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default DiagnosisSkeleton;
