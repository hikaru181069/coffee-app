import { useTranslation } from "react-i18next";
import { cardClass } from "../../coffee-records/components/formStyles";

const TREND_BAR_HEIGHTS = ["h-6", "h-10", "h-8", "h-14", "h-9", "h-12"];
const RATING_BAR_HEIGHTS = ["h-4", "h-8", "h-14", "h-10", "h-6"];
const RANKING_TYPE_COUNT = 5;

/** StatCard（アイコンバッジ+ラベル/値）と同じ形のプレースホルダー。cardClass内にネストするためflat（影なし）にする */
function StatCardSkeleton() {
  return (
    <div className="min-w-44 rounded-2xl border border-surface-2 bg-raised p-4">
      <div className="flex items-center gap-3">
        <div className="skeleton-block h-9 w-9 flex-shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-block h-3 w-14 rounded" />
          <div className="skeleton-block h-5 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

/** TopRankingList（アイコン+見出し+ランキング行）と同じ形のプレースホルダー */
function RankingListSkeleton() {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="skeleton-block h-3.5 w-3.5 rounded-full" />
        <div className="skeleton-block h-3 w-16 rounded" />
      </div>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: 3 }, (_, row) => (
          <div key={row} className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="skeleton-block h-3.5 w-32 rounded" />
            <div className="skeleton-block h-3.5 w-5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 読み込み中のStatsページ。StatsPage.jsxの実際の構成
 * （cardClassで囲んだ「Your pace」「Collection」「Taste tendencies」の
 * 3セクション）と同じ形の骨格を出す。
 *
 * 2026-08、ローディングスケルトンのレビュー後に、Stats専用のスケルトンも
 * 実際の子コンポーネントの見た目とずれていることが分かった（レビュー時点
 * では見落としていた）。以前は各セクションを単なる`grid grid-cols-2
 * sm:grid-cols-3`の無地の箱で表現していたが、実際のOverviewStats.jsx/
 * CollectionStats.jsxは`flex flex-wrap`のアイコンバッジ付きStatCard
 * （`flat`、影なし）で、Taste tendenciesのランキングは2グループではなく
 * 産地・品種・精製方法・フレーバー・カフェの5グループ（各グループに
 * アイコン+見出しが付く）だった。読み込み完了時に形が大きく変わり
 * レイアウトが動っていたため、実際の子コンポーネントと同じ形の
 * プレースホルダーに作り直した。
 */
function StatsSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-6">
      <div className={cardClass}>
        <div className="skeleton-block h-4 w-1/3 rounded" />
        <div className="mt-5 flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            {Array.from({ length: 3 }, (_, index) => (
              <StatCardSkeleton key={index} />
            ))}
          </div>
          <div className="rounded-xl border border-surface-2 bg-raised p-4">
            <div className="skeleton-block h-3 w-28 rounded" />
            <div className="mt-4 flex items-end gap-3">
              {TREND_BAR_HEIGHTS.map((height, index) => (
                <div key={index} className="flex flex-col items-center gap-1.5">
                  <div className="skeleton-block h-3 w-4 rounded" />
                  <div className={`skeleton-block w-6 rounded-t ${height}`} />
                  <div className="skeleton-block h-2.5 w-6 rounded" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className={cardClass}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="skeleton-block h-4 w-1/4 rounded" />
          <div className="skeleton-block h-3 w-24 rounded" />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          {Array.from({ length: 6 }, (_, index) => (
            <StatCardSkeleton key={index} />
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="skeleton-block h-4 w-1/3 rounded" />
        <div className="mt-5 flex flex-col gap-6">
          <div className="rounded-xl border border-surface-2 bg-raised p-4">
            <div className="skeleton-block h-3 w-32 rounded" />
            <div className="mt-4 flex items-end justify-between gap-2">
              {RATING_BAR_HEIGHTS.map((height, index) => (
                <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="skeleton-block h-3 w-4 rounded" />
                  <div className={`skeleton-block w-full max-w-8 rounded-t ${height}`} />
                  <div className="skeleton-block h-2.5 w-5 rounded" />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {Array.from({ length: RANKING_TYPE_COUNT }, (_, index) => (
              <RankingListSkeleton key={index} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StatsSkeleton;
