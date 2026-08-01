import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getNodeVisual, ATTRIBUTE_NODE_TYPES } from "../utils/nodeVisuals";
import { RECORD_TYPES } from "../../coffee-records/utils/recordFormat";

/**
 * グラフの絞り込み。
 *
 * docs/api.md の GET /graph が持つクエリのうち、nodeTypes・recordType・
 * ratingMin の3つをUIに出す。dateFrom/dateToはAPIには残しつつ、
 * このPhaseのUIでは扱わない（docs/mvp.md の「基本フィルター」の範囲に
 * とどめる判断。必要になれば features/coffee-records/components/
 * RecordFilters.jsx と同じ形で追加できる）。
 */
function GraphFilters({ filters, onChange }) {
  const { t } = useTranslation();

  const toggleNodeType = (type) => {
    const current = filters.nodeTypes ?? [];
    const next = current.includes(type)
      ? current.filter((value) => value !== type)
      : [...current, type];

    onChange({ ...filters, nodeTypes: next });
  };

  const isNodeTypeActive = (type) =>
    (filters.nodeTypes ?? []).length === 0 || filters.nodeTypes.includes(type);

  return (
    <section aria-label={t("graph.filterAriaLabel")} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onChange({ ...filters, recordType: "" })}
          aria-pressed={filters.recordType === ""}
          className={`rounded-full border px-3 py-1.5 text-sm transition-colors duration-150 ${
            filters.recordType === ""
              ? "border-ctp-blue bg-ctp-blue/15 font-semibold text-ctp-text"
              : "border-ctp-overlay0/60 text-ctp-subtext1 hover:border-ctp-overlay0"
          }`}
        >
          {t("common.all")}
        </button>
        {RECORD_TYPES.map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => onChange({ ...filters, recordType: type.value })}
            aria-pressed={filters.recordType === type.value}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors duration-150 ${
              filters.recordType === type.value
                ? "border-ctp-blue bg-ctp-blue/15 font-semibold text-ctp-text"
                : "border-ctp-overlay0/60 text-ctp-subtext1 hover:border-ctp-overlay0"
            }`}
          >
            {t(type.labelKey)}
          </button>
        ))}

        <label className="ml-auto flex items-center gap-1.5 text-xs text-ctp-subtext0">
          {t("common.rating")}
          <select
            value={filters.ratingMin}
            onChange={(event) => onChange({ ...filters, ratingMin: event.target.value })}
            className="rounded-lg border border-ctp-overlay0/60 bg-ctp-surface0 px-2 py-1 text-xs text-ctp-text"
          >
            <option value="">{t("graph.ratingUnfiltered")}</option>
            {[5, 4, 3, 2].map((score) => (
              <option key={score} value={score}>
                {t("common.scoreOrMore", { score })}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* ノード種別フィルター。属性ノードの表示/非表示を切り替える。
          recordノードは常に表示するため対象に含めない（backend側の
          仕様と同じ: core/graph/graphBuilder.js の options.nodeTypes）。 */}
      <div className="flex flex-wrap gap-1.5">
        {ATTRIBUTE_NODE_TYPES.map((type) => {
          const visual = getNodeVisual(type);
          const Icon = visual.icon;
          const active = isNodeTypeActive(type);

          return (
            <button
              key={type}
              type="button"
              onClick={() => toggleNodeType(type)}
              aria-pressed={active}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors duration-150 ${
                active
                  ? "border-ctp-overlay0 bg-ctp-surface1 text-ctp-text"
                  : "border-ctp-overlay0/40 text-ctp-subtext0 hover:border-ctp-overlay0/60"
              }`}
            >
              {active && <Check size={11} aria-hidden="true" strokeWidth={2.5} />}
              <Icon size={12} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
              {t(visual.labelKey)}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default GraphFilters;
