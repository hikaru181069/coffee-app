import { useTranslation } from "react-i18next";

import { useStats } from "../features/stats/hooks/useStats";
import OverviewStats from "../features/stats/components/OverviewStats";
import MonthlyTrendChart from "../features/stats/components/MonthlyTrendChart";
import RatingDistributionChart from "../features/stats/components/RatingDistributionChart";
import HomeVsCafeCard from "../features/stats/components/HomeVsCafeCard";
import TopRankingList from "../features/stats/components/TopRankingList";
import { getErrorMessage } from "../utils/errorMessage";

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
 * これまでの記録をふりかえる統計ページ（docs/stats.md参照）。
 *
 * Insight機能（「エチオピア産かつナチュラル精製を高く評価する傾向」の
 * ような一文）が"意味づけ"担当なのに対し、Statsは生の集計値・ランキングを
 * 見せる担当。両者は補完関係にあり、どちらもrecords（core/insights,
 * core/stats）から同じ集計パターンで導出している。
 */
function StatsPage() {
  const { t, i18n } = useTranslation();
  const { stats, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-2" aria-busy="true">
          <div className="skeleton-block h-6 w-1/3 rounded" />
          <div className="skeleton-block h-24 w-full rounded" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <p className="text-sm text-ctp-red">{getErrorMessage(error, t)}</p>
      </div>
    );
  }

  if (!stats) return null;

  if (stats.overview.recordCount === 0) {
    return (
      <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="mb-2 text-xl font-bold text-ctp-text">{t("stats.heading")}</h1>
        <p className="text-sm text-ctp-subtext0">{t("stats.emptyDesc")}</p>
      </div>
    );
  }

  return (
    <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-ctp-text">{t("stats.heading")}</h1>
        <p className="mt-1 text-sm text-ctp-subtext0">{t("stats.subtitle")}</p>
      </header>

      <OverviewStats overview={stats.overview} daysSinceStart={daysSince(stats.overview.firstRecordedAt)} t={t} />

      <MonthlyTrendChart monthlyTrend={stats.monthlyTrend} language={i18n.language} t={t} />

      <section className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <RatingDistributionChart distribution={stats.ratingDistribution} t={t} />
        <HomeVsCafeCard homeVsCafe={stats.homeVsCafe} t={t} />
      </section>

      <section className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {RANKING_TYPES.map((type) => (
          <TopRankingList key={type} type={type} items={stats[RANKING_KEYS[type]]} t={t} />
        ))}
      </section>
    </div>
  );
}

export default StatsPage;
