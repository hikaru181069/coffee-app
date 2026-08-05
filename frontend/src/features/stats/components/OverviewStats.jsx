/**
 * 記録全体を通した見出し数字（総記録数・平均評価・産地/品種/フレーバーの
 * 種類数・記録を始めてからの日数）。
 */
function OverviewStats({ overview, daysSinceStart, t }) {
  return (
    <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label={t("stats.overview.recordCount")} value={overview.recordCount} />
      <StatCard label={t("stats.overview.avgRating")} value={overview.avgRating ?? "—"} />
      <StatCard label={t("stats.overview.originCount")} value={overview.originCount} />
      <StatCard label={t("stats.overview.varietyCount")} value={overview.varietyCount} />
      <StatCard label={t("stats.overview.flavorCount")} value={overview.flavorCount} />
      <StatCard
        label={t("stats.overview.daysSinceStart")}
        value={daysSinceStart != null ? t("stats.overview.daysCount", { count: daysSinceStart }) : "—"}
      />
    </section>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <p className="text-xs text-ctp-subtext0">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-ctp-text">{value}</p>
    </div>
  );
}

export default OverviewStats;
