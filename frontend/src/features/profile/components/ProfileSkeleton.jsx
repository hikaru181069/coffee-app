import { useTranslation } from "react-i18next";

/**
 * 読み込み中のProfileページ。実際の4セクション構成
 * （表示言語／名前／パスワード変更／退会）と同じ形の骨格を出す
 * （features/stats/components/StatsSkeleton.jsxと同じ考え方）。
 */
function ProfileSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col divide-y divide-ctp-surface1">
      <div className="pb-6 flex flex-col gap-3">
        <div className="skeleton-block h-4 w-24 rounded" />
        <div className="skeleton-block h-8 w-40 rounded-lg" />
      </div>
      <div className="py-6 flex flex-col gap-4">
        <div className="skeleton-block h-10 w-full rounded-lg" />
        <div className="skeleton-block h-4 w-1/3 rounded" />
        <div className="skeleton-block h-9 w-28 rounded-lg" />
      </div>
      <div className="py-6 flex flex-col gap-4">
        <div className="skeleton-block h-4 w-40 rounded" />
        <div className="skeleton-block h-10 w-full rounded-lg" />
        <div className="skeleton-block h-10 w-full rounded-lg" />
        <div className="skeleton-block h-9 w-32 rounded-lg" />
      </div>
      <div className="pt-6 flex flex-col gap-3">
        <div className="skeleton-block h-4 w-32 rounded" />
        <div className="skeleton-block h-9 w-36 rounded-lg" />
      </div>
    </div>
  );
}

export default ProfileSkeleton;
