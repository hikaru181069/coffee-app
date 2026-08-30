import { Coffee, Store } from "lucide-react";

/**
 * 自宅とカフェ、それぞれの件数・平均評価を並べて見せる。
 *
 * 2026-08、DiagnosisPage.jsxの「記録の全体像」セクションが`cardClass`
 * （枠線+背景+影のカード）になった際、このカードが入れ子になった。
 * StatCard.jsxの`flat`propと同じ理由で、ネストされた内側のカードには
 * 影を付けない。
 */
function HomeVsCafeCard({ homeVsCafe, t, flat = false }) {
  return (
    <section
      className={`rounded-2xl border border-surface-2 bg-raised p-4 ${flat ? "" : "shadow-elevated"}`}
    >
      <h2 className="mb-3 text-sm font-semibold text-text">{t("stats.homeVsCafeHeading")}</h2>
      <div className="grid grid-cols-2 gap-3">
        <RecordTypeStat icon={Coffee} label={t("recordForm.home")} stat={homeVsCafe.home} t={t} />
        <RecordTypeStat icon={Store} label={t("recordForm.cafe")} stat={homeVsCafe.cafe} t={t} />
      </div>
    </section>
  );
}

function RecordTypeStat({ icon, label, stat, t }) {
  const Icon = icon;
  return (
    <div className="rounded-lg bg-surface-1 p-3">
      <div className="flex items-center gap-1.5 text-xs text-text-tertiary">
        <Icon size={12} aria-hidden="true" />
        {label}
      </div>
      <p className="mt-1 font-mono text-base font-semibold text-text">
        {t("search.recordCount", { count: stat.count })}
      </p>
      <p className="mt-0.5 text-xs text-text-secondary">
        {t("stats.overview.avgRating")}: {stat.avgRating ?? "—"}
      </p>
    </div>
  );
}

export default HomeVsCafeCard;
