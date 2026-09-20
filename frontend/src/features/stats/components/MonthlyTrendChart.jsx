import { useTranslation } from "react-i18next";
import { formatMonthLabel } from "../../coffee-records/utils/recordFormat";
import { cardClass } from "../../coffee-records/components/formStyles";

const CHART_HEIGHT_PX = 64;

/**
 * 月ごとの記録数を、シンプルなCSSの棒グラフで見せる（グラフ描画ライブラリは使わない）。
 *
 * 2026-09、StatsPage.jsxのダッシュボード風の作り直しで、グラフ2つ
 * （このコンポーネントとRatingDistributionChart.jsx）を横並びの
 * コンパクトな高さで常時表示するレイアウトへ変更した。それに合わせ、
 * 独自の枠線スタイルから他のダッシュボードカードと同じ`cardClass`
 * （影付き）へ揃え、グラフの高さも詰めた。
 */
function MonthlyTrendChart({ monthlyTrend, language }) {
  const { t } = useTranslation();
  if (monthlyTrend.length === 0) return null;

  const maxCount = Math.max(...monthlyTrend.map((entry) => entry.count));

  return (
    <section className={cardClass}>
      <h3 className="mb-2 text-xs font-semibold text-text-tertiary">{t("stats.monthlyTrendHeading")}</h3>
      <div className="flex items-end gap-3 overflow-x-auto">
        {monthlyTrend.map((entry) => (
          <div key={entry.month} className="flex flex-shrink-0 flex-col items-center gap-1.5">
            <span className="font-mono text-xs text-text-secondary">{entry.count}</span>
            <div
              className="w-6 rounded-none bg-text-secondary/70"
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
