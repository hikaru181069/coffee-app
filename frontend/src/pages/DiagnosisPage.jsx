import { useTranslation } from "react-i18next";

import BackLink from "../components/BackLink";
import { useDiagnosis } from "../features/diagnosis/hooks/useDiagnosis";
import ArchetypeCard from "../features/diagnosis/components/ArchetypeCard";
import InsightList from "../features/diagnosis/components/InsightList";
import DiagnosisSkeleton from "../features/diagnosis/components/DiagnosisSkeleton";
import OverviewStats from "../features/stats/components/OverviewStats";
import HomeVsCafeCard from "../features/stats/components/HomeVsCafeCard";
import TopRankingList from "../features/stats/components/TopRankingList";
import StatsEmptyState from "../features/stats/components/StatsEmptyState";
import { RecordsErrorState } from "../features/coffee-records/components/RecordListStates";
import { cardClass } from "../features/coffee-records/components/formStyles";
import { wideContainerClass } from "../styles/pageContainer";

const daysSince = (isoDate) => {
  if (!isoDate) return null;
  const diffMs = Date.now() - new Date(isoDate).getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
};

/**
 * コーヒー診断ページ（docs/features.md「Coffee Diagnosis」参照）。
 *
 * 新しい発見ロジックを大量に作るのではなく、既存の3つの機能
 * （archetype判定・Insight・Stats）を1画面へ束ねる
 * （backend/services/coffee/diagnosisService.js参照）。
 *
 * StatsPage.jsxと同じ「cardClassで3つの問いに分ける」構成:
 *   1. コーヒータイプ: 記録から判定した1つのタイプ（archetype）
 *   2. 気づき: insightBuilder.jsが検出した傾向のうち条件を満たす全件
 *      （Home画面のDiscoverCardはinsights[0]だけを見せるが、ここでは
 *      全件見せる）
 *   3. 記録の全体像: Statsの要約（総記録数・平均評価・自宅とカフェの
 *      比較・よく選ぶ産地とフレーバー）
 *
 * 2026-08、3セクションが`divide-y`の区切り線だけだったのを、
 * Stats/Profile/RecordDetail/EntityDetailと同じ`cardClass`（枠線+背景+
 * 影のカード）へ統一した（ユーザー指摘）。セクション内にネストされる
 * `ArchetypeCard`・`HomeVsCafeCard`は`flat`propで影を消し、二重の
 * カードに見えないようにしている（`OverviewStats`はStatsPage.jsxと
 * 同じ理由で元から`flat`）。
 *
 * ナビには追加しない（Navbar.jsx・BottomTabBar.jsxのタブ数を
 * 増やさない方針）。Home画面のDiscoverCard・Statsページからの
 * リンク経由でのみ到達する。
 */
function DiagnosisPage() {
  const { t } = useTranslation();
  const { diagnosis, isLoading, error, reload } = useDiagnosis();

  if (isLoading) {
    return (
      <div className={wideContainerClass}>
        <BackLink />
        <div className="mt-3">
          <DiagnosisSkeleton />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={wideContainerClass}>
        <BackLink />
        <div className="mt-3">
          <RecordsErrorState error={error} onRetry={reload} />
        </div>
      </div>
    );
  }

  if (!diagnosis) return null;

  const { archetype, insights, stats } = diagnosis;

  if (stats.overview.recordCount === 0) {
    return (
      <div className={wideContainerClass}>
        <BackLink />
        <header className="mt-3 mb-6">
          <h1 className="text-xl font-bold text-text">{t("diagnosis.heading")}</h1>
        </header>
        <StatsEmptyState />
      </div>
    );
  }

  return (
    <div className={wideContainerClass}>
      <BackLink />
      <header className="mt-3 mb-6">
        <h1 className="text-xl font-bold text-text">{t("diagnosis.heading")}</h1>
        <p className="mt-1 text-sm text-text-tertiary">{t("diagnosis.subtitle")}</p>
      </header>

      <div className="flex flex-col gap-6">
        <section className={cardClass}>
          <h2 className="mb-4 text-sm font-semibold text-text">{t("diagnosis.archetypeHeading")}</h2>
          <ArchetypeCard archetype={archetype} t={t} flat />
        </section>

        <section className={cardClass}>
          <h2 className="mb-4 text-sm font-semibold text-text">{t("diagnosis.insightsHeading")}</h2>
          <InsightList insights={insights} t={t} />
        </section>

        <section className={cardClass}>
          <h2 className="mb-4 text-sm font-semibold text-text">{t("diagnosis.overviewHeading")}</h2>
          <div className="flex flex-col gap-4">
            <OverviewStats overview={stats.overview} daysSinceStart={daysSince(stats.overview.firstRecordedAt)} t={t} />
            <HomeVsCafeCard homeVsCafe={stats.homeVsCafe} t={t} flat />
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <TopRankingList type="origin" items={stats.topOrigins} t={t} />
              <TopRankingList type="flavor" items={stats.topFlavors} t={t} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default DiagnosisPage;
