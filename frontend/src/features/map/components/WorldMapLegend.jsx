import { useTranslation } from "react-i18next";
import { QUALITY_TIER_LEGEND_SWATCHES } from "../utils/qualityColor";

/**
 * 世界地図の凡例。「色だけで状態を表現しない」（docs/design.md UI Rules）
 * ため、色に加えてラベルの文言でも状態を区別する（GraphLegend.jsxと
 * 同じ考え方）。
 *
 * 2026-08、訪問済みの塗り色を単一色から産地ごとのアクセントカラー
 * （originAccent.js）へ変更したため、「訪れた産地」の見本は単色の
 * スウォッチではなく、実際に色が産地ごとに異なることが伝わるよう
 * 3色の小さな点を並べたものにした。
 *
 * 2026-08、「品質スコアで色分け」モードを追加したため、colorModeに
 * 応じて凡例の内容を切り替える（訪問状況モードとは色の意味が
 * まったく違うため、同じ凡例を出すと誤解を招く）。
 */
function WorldMapLegend({ colorMode = "visited" }) {
  const { t } = useTranslation();

  if (colorMode === "quality") {
    return (
      <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="flex items-center gap-0.5">
            {QUALITY_TIER_LEGEND_SWATCHES.map((swatchClass) => (
              <span key={swatchClass} className={`h-2.5 w-2.5 rounded-full ${swatchClass}`} />
            ))}
          </span>
          {t("map.legendQualityGradient")}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-surface-2" />
          {t("map.legendQualityUnavailable")}
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="flex items-center -space-x-1">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-sky" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent-pink" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent-yellow" />
        </span>
        {t("map.legendVisited")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-surface-2" />
        {t("map.legendUnvisited")}
      </span>
    </div>
  );
}

export default WorldMapLegend;
