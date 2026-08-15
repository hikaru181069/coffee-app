import { useTranslation } from "react-i18next";

/**
 * 読み込み中のDiscoverページ。表示位置が飛ばないよう、実際の構成
 * （産地の見出し＋提案カードのグループを2つ）と同じ形の骨格を出す
 * （features/coffee-records/components/RecordListStates.jsxの
 * RecordListSkeletonと同じ考え方）。
 */
function DiscoverSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-8">
      {Array.from({ length: 2 }, (_, index) => (
        <div key={index}>
          <div className="skeleton-block mb-3 h-4 w-32 rounded" />
          <div className="skeleton-block h-24 w-full rounded-xl" />
        </div>
      ))}
    </div>
  );
}

export default DiscoverSkeleton;
