import { useTranslation } from "react-i18next";
import { cardClass } from "../../coffee-records/components/formStyles";
import StatCardSkeleton from "../../../components/StatCardSkeleton";
import RankingListSkeleton from "../../../components/RankingListSkeleton";

/**
 * 読み込み中の診断ページ。実際の3セクション構成
 * （コーヒータイプ／気づき／記録の全体像）と同じ形の骨格を出す
 * （features/stats/components/StatsSkeleton.jsxと同じ考え方）。
 *
 * 2026-08、DiagnosisPage.jsxが`divide-y`から`cardClass`へ移行したのに
 * 合わせて全面的に書き直した。「記録の全体像」内部も、無地の`grid`では
 * なく実際のOverviewStats（アイコンバッジ付きStatCard）・
 * HomeVsCafeCard・TopRankingList（アイコン+見出し）と同じ形にした
 * （StatsSkeleton.jsxで見つかった「外枠だけ追随し内部構造がずれる」
 * という不具合を、最初から作らないようにするため）。
 */
function DiagnosisSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-6">
      <div className={cardClass}>
        <div className="skeleton-block mb-4 h-4 w-1/3 rounded" />
        <div className="skeleton-block h-[164px] w-full rounded-2xl" />
      </div>

      <div className={cardClass}>
        <div className="skeleton-block mb-4 h-4 w-1/4 rounded" />
        <div className="flex flex-col gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton-block h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="skeleton-block mb-4 h-4 w-1/3 rounded" />
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
          <div className="rounded-2xl border border-surface-2 bg-raised p-4">
            <div className="skeleton-block mb-3 h-3 w-24 rounded" />
            <div className="grid grid-cols-2 gap-3">
              <div className="skeleton-block h-16 rounded-lg" />
              <div className="skeleton-block h-16 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <RankingListSkeleton />
            <RankingListSkeleton />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DiagnosisSkeleton;
