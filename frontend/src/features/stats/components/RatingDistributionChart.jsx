import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cardClass } from "../../coffee-records/components/formStyles";

const CHART_HEIGHT_PX = 52;

/**
 * ★1〜5ごとの件数を、シンプルなCSSの棒グラフで見せる。
 *
 * 2026-09、StatsPage.jsxのダッシュボード風の作り直しで、MonthlyTrendChart.jsx
 * と同じ理由で`cardClass`へ揃え、高さを詰めた（該当コメント参照）。
 */
function RatingDistributionChart({ distribution }) {
  const { t } = useTranslation();
  const maxCount = Math.max(1, ...distribution.map((entry) => entry.count));

  return (
    <section className={cardClass}>
      <h3 className="mb-2 text-xs font-semibold text-text-tertiary">{t("stats.ratingDistributionHeading")}</h3>
      <div className="flex items-end justify-between gap-2">
        {distribution.map((entry) => (
          <div key={entry.rating} className="flex flex-1 flex-col items-center gap-1.5">
            <span className="font-mono text-xs text-text-secondary">{entry.count}</span>
            <div
              className="w-full max-w-8 rounded-none bg-warn/70"
              style={{ height: `${Math.max(4, (entry.count / maxCount) * CHART_HEIGHT_PX)}px` }}
            />
            <span className="flex items-center gap-0.5 text-xs text-text-tertiary">
              {entry.rating}
              <Star size={10} aria-hidden="true" fill="currentColor" strokeWidth={0} />
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export default RatingDistributionChart;
