import { useTranslation } from "react-i18next";
import { getNodeVisual, ATTRIBUTE_NODE_TYPES } from "../utils/nodeVisuals";

/**
 * ノード種別の凡例。
 *
 * docs/design.md の UI Rules「グラフ画面にも凡例を置く」に対応する。
 * アイコン・色・日本語ラベルを1か所にまとめて示すことで、
 * 色弱者やモノクロ印刷でも種別が判別できるようにする
 * （色だけで状態を表現しない、の実践）。
 */
function GraphLegend() {
  const { t } = useTranslation();
  const types = ["record", ...ATTRIBUTE_NODE_TYPES];

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 rounded-lg border border-surface-2 bg-raised px-3 py-2">
      {types.map((type) => {
        const visual = getNodeVisual(type);
        const Icon = visual.icon;

        return (
          <span key={type} className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
            <Icon size={12} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
            {t(visual.labelKey)}
          </span>
        );
      })}
    </div>
  );
}

export default GraphLegend;
