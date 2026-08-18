import { formatMonthLabel } from "../../coffee-records/utils/recordFormat";

const CHART_HEIGHT_PX = 80;

/** 月ごとの記録数を、シンプルなCSSの棒グラフで見せる（グラフ描画ライブラリは使わない） */
function MonthlyTrendChart({ monthlyTrend, language, t }) {
  if (monthlyTrend.length === 0) return null;

  const maxCount = Math.max(...monthlyTrend.map((entry) => entry.count));

  return (
    <section className="rounded-xl border border-surface-2 bg-raised p-4">
      <h3 className="mb-3 text-xs font-semibold text-text-tertiary">{t("stats.monthlyTrendHeading")}</h3>
      <div className="flex items-end gap-3 overflow-x-auto">
        {monthlyTrend.map((entry) => (
          <div key={entry.month} className="flex flex-shrink-0 flex-col items-center gap-1.5">
            <span className="font-mono text-xs text-text-secondary">{entry.count}</span>
            <div
              className="w-6 rounded-t bg-primary/70"
              style={{ height: `${Math.max(4, (entry.count / maxCount) * CHART_HEIGHT_PX)}px` }}
            />
            <span className="font-mono text-[10px] text-text-tertiary">
              {formatMonthLabel(entry.month, language)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MonthlyTrendChart;
