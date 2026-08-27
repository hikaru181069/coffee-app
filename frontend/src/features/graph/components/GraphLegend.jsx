import { useTranslation } from "react-i18next";
import { getNodeVisual, ATTRIBUTE_NODE_TYPES } from "../utils/nodeVisuals";

/**
 * ノード種別の凡例。
 *
 * docs/design.md の UI Rules「グラフ画面にも凡例を置く」に対応する。
 * アイコン・色・日本語ラベルを1か所にまとめて示すことで、
 * 色弱者やモノクロ印刷でも種別が判別できるようにする
 * （色だけで状態を表現しない、の実践）。
 *
 * 2026-08、真上にあるGraphFilters（ボタン）と枠線・背景がほぼ同じ
 * 見た目で、どちらが操作できるボタンか分かりにくいという指摘を受けた。
 * ここは一切クリックできない説明書きなので、ボタンのような枠線・背景を
 * 外してテキストに近い見た目にし、小見出しを付けて区別できるようにした。
 */
function GraphLegend() {
  const { t } = useTranslation();
  const types = ["record", ...ATTRIBUTE_NODE_TYPES];

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-tertiary">{t("graph.legendHeading")}</span>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {types.map((type) => {
          const visual = getNodeVisual(type);
          const Icon = visual.icon;

          return (
            <span key={type} className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
              <Icon size={12} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
              {t(visual.labelKey)}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default GraphLegend;
