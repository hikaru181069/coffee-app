import { useTranslation } from "react-i18next";

/**
 * 世界地図の凡例。「色だけで状態を表現しない」（docs/design.md UI Rules）
 * ため、色に加えてラベルの文言でも訪問済み/未訪問を区別する
 * （GraphLegend.jsxと同じ考え方）。
 */
function WorldMapLegend() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-accent-sky" />
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
