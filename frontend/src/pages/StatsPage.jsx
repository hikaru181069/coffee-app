import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useStats } from "../features/stats/hooks/useStats";
import OverviewStats from "../features/stats/components/OverviewStats";
import CollectionStats from "../features/stats/components/CollectionStats";
import MonthlyTrendChart from "../features/stats/components/MonthlyTrendChart";
import RatingDistributionChart from "../features/stats/components/RatingDistributionChart";
import TopRankingList from "../features/stats/components/TopRankingList";
import StatsSkeleton from "../features/stats/components/StatsSkeleton";
import StatsEmptyState from "../features/stats/components/StatsEmptyState";
import { RecordsErrorState } from "../features/coffee-records/components/RecordListStates";
import { secondaryButtonClass } from "../features/coffee-records/components/formStyles";
import { wideContainerClass } from "../styles/pageContainer";

const RANKING_TYPES = ["origin", "variety", "process", "flavor", "cafe"];
const RANKING_KEYS = {
  origin: "topOrigins",
  variety: "topVarieties",
  process: "topProcesses",
  flavor: "topFlavors",
  cafe: "topCafes",
};

const daysSince = (isoDate) => {
  if (!isoDate) return null;
  const diffMs = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

/**
 * これまでの記録をふりかえる統計ページ（docs/features.md「Stats」参照）。
 *
 * Insight機能（「エチオピア産かつナチュラル精製を高く評価する傾向」の
 * ような一文）が"意味づけ"担当なのに対し、Statsは生の集計値・ランキングを
 * 見せる担当。両者は補完関係にあり、どちらもrecords（core/insights,
 * core/stats）から同じ集計パターンで導出している。
 *
 * 「記録したコーヒーから、自分の飲み方や味覚傾向を振り返る」というテーマを
 * 反映し、情報をフラットに並べるのではなく3つの問いに分けている
 * （RecordDetailPageのdivide-yによるセクション区切りと同じ思想）:
 *   1. 記録のペース: どれだけ・どんな頻度で記録しているか
 *   2. Collection: 何種類の産地・品種・精製方法・農園・カフェ・
 *      フレーバーを試したか
 *   3. 味の傾向: 評価はどう分布し、何を繰り返し選んでいるか
 */
function StatsPage() {
  const { t, i18n } = useTranslation();
  const { stats, isLoading, error, reload } = useStats();

  if (isLoading) {
    return (
      <div className={wideContainerClass}>
        <StatsSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className={wideContainerClass}>
        <RecordsErrorState error={error} onRetry={reload} />
      </div>
    );
  }

  if (!stats) return null;

  if (stats.overview.recordCount === 0) {
    return (
      <div className={wideContainerClass}>
        <header className="mb-6">
          <h1 className="text-xl font-bold text-text">{t("stats.heading")}</h1>
        </header>
        <StatsEmptyState />
      </div>
    );
  }

  return (
    <div className={wideContainerClass}>
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-text">{t("stats.heading")}</h1>
          <p className="mt-1 text-sm text-text-tertiary">{t("stats.subtitle")}</p>
        </div>
        <Link to="/diagnosis" className={secondaryButtonClass}>
          {t("stats.viewDiagnosisLink")}
        </Link>
      </header>

      <div className="flex flex-col divide-y divide-surface-2">
        <section className="pb-6">
          <h2 className="mb-4 text-sm font-semibold text-text">{t("stats.paceHeading")}</h2>
          <div className="flex flex-col gap-4">
            <OverviewStats overview={stats.overview} daysSinceStart={daysSince(stats.overview.firstRecordedAt)} t={t} />
            <MonthlyTrendChart monthlyTrend={stats.monthlyTrend} language={i18n.language} t={t} />
          </div>
        </section>

        <section className="py-6">
          <h2 className="mb-4 text-sm font-semibold text-text">{t("stats.collectionHeading")}</h2>
          <CollectionStats collection={stats.collection} t={t} />
        </section>

        <section className="pt-6">
          <h2 className="mb-4 text-sm font-semibold text-text">{t("stats.tasteHeading")}</h2>
          <div className="flex flex-col gap-6">
            <RatingDistributionChart distribution={stats.ratingDistribution} t={t} />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {RANKING_TYPES.map((type) => (
                <TopRankingList key={type} type={type} items={stats[RANKING_KEYS[type]]} t={t} />
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default StatsPage;
