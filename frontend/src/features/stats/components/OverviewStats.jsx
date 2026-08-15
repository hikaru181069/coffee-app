import StatCard from "./StatCard";

/**
 * 記録のペースを示す見出し数字（総記録数・平均評価・記録を始めてからの日数）。
 *
 * 「試した種類数」（産地・品種・精製方法・農園・カフェ・フレーバー）は
 * 別の問い（何を試したか）なのでCollectionStatsへ分けている。
 */
function OverviewStats({ overview, daysSinceStart, t }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label={t("stats.overview.recordCount")} value={overview.recordCount} />
      <StatCard label={t("stats.overview.avgRating")} value={overview.avgRating ?? "—"} />
      <StatCard
        label={t("stats.overview.daysSinceStart")}
        value={daysSinceStart != null ? t("stats.overview.daysCount", { count: daysSinceStart }) : "—"}
      />
    </div>
  );
}

export default OverviewStats;
