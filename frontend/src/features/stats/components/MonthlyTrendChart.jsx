import { formatMonthLabel } from "../../coffee-records/utils/recordFormat";

const CHART_HEIGHT_PX = 80;

/** 月ごとの記録数を、シンプルなCSSの棒グラフで見せる（グラフ描画ライブラリは使わない） */
function MonthlyTrendChart({ monthlyTrend, language, t }) {
  if (monthlyTrend.length === 0) return null;

  const maxCount = Math.max(...monthlyTrend.map((entry) => entry.count));

  return (
    <section className="mb-6">
      <h2 className="mb-3 text-sm font-semibold text-ctp-text">{t("stats.monthlyTrendHeading")}</h2>
      <div className="flex items-end gap-3 overflow-x-auto rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
        {monthlyTrend.map((entry) => (
          <div key={entry.month} className="flex flex-shrink-0 flex-col items-center gap-1.5">
            <span className="font-mono text-xs text-ctp-subtext1">{entry.count}</span>
            <div
              className="w-6 rounded-t bg-ctp-blue/70"
              style={{ height: `${Math.max(4, (entry.count / maxCount) * CHART_HEIGHT_PX)}px` }}
            />
            <span className="font-mono text-[10px] text-ctp-subtext0">
              {formatMonthLabel(entry.month, language)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default MonthlyTrendChart;
