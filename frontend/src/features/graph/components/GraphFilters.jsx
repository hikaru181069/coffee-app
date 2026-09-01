import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getNodeVisual, ATTRIBUTE_NODE_TYPES } from "../utils/nodeVisuals";
import { RECORD_TYPES } from "../../coffee-records/utils/recordFormat";

// RecordFilters.jsxのcompactInputClassと同じ見た目。1箇所でしか使わない
// 短いスタイル文字列のため、共通コンポーネント化はせずそのまま複製している
const compactInputClass =
  "w-auto rounded-lg border border-line/60 bg-surface-1 px-2.5 py-1.5 text-sm text-text " +
  "transition-colors duration-150 hover:border-line focus:outline-none focus:ring-2 focus:ring-primary/50";

/**
 * グラフの絞り込み。
 *
 * docs/api.md の GET /graph が持つクエリ（nodeTypes・recordType・
 * dateFrom/dateTo・ratingMin）をすべてUIに出す。2026-08、期間
 * （dateFrom/dateTo）はAPI・純粋関数側には実装済みだったがUIに未反映
 * だったため、features/coffee-records/components/RecordFilters.jsx と
 * 同じ形（date input 2つ）で追加した。
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
              ? "border-line-strong bg-surface-2 font-semibold text-text"
              : "border-line/60 text-text-secondary hover:border-line"
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
                ? "border-line-strong bg-surface-2 font-semibold text-text"
                : "border-line/60 text-text-secondary hover:border-line"
            }`}
          >
            {t(type.labelKey)}
          </button>
        ))}

        <label className="ml-auto flex items-center gap-1.5 text-xs text-text-tertiary">
          {t("common.rating")}
          <select
            value={filters.ratingMin}
            onChange={(event) => onChange({ ...filters, ratingMin: event.target.value })}
            className="rounded-lg border border-line/60 bg-surface-1 px-2 py-1 text-xs text-text"
          >
            <option value="">{t("graph.ratingUnfiltered")}</option>
            {[5, 4, 3, 2].map((score) => (
              <option key={score} value={score}>
                {t("common.scoreOrMore", { score })}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-1.5">
          <label htmlFor="graph-filter-dateFrom" className="sr-only">
            {t("records.dateFrom")}
          </label>
          <input
            id="graph-filter-dateFrom"
            type="date"
            value={filters.dateFrom}
            onChange={(event) => onChange({ ...filters, dateFrom: event.target.value })}
            className={compactInputClass}
          />
          <span aria-hidden="true" className="text-xs text-text-tertiary">
            〜
          </span>
          <label htmlFor="graph-filter-dateTo" className="sr-only">
            {t("records.dateTo")}
          </label>
          <input
            id="graph-filter-dateTo"
            type="date"
            value={filters.dateTo}
            onChange={(event) => onChange({ ...filters, dateTo: event.target.value })}
            className={compactInputClass}
          />
        </div>
      </div>

      {/* ノード種別フィルター。属性ノードの表示/非表示を切り替える。
          recordノードは常に表示するため対象に含めない（backend側の
          仕様と同じ: core/graph/graphBuilder.js の options.nodeTypes）。
          2026-08、この行のすぐ下にあるGraphLegend（操作できない凡例）と
          見た目が似すぎて、どちらがクリックできるボタンか分かりにくい
          という指摘を受け、小見出しを付けて「これは操作できる絞り込み」
          だと明示した */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-text-tertiary">{t("graph.nodeTypeFilterHeading")}</span>
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
                    ? "border-line bg-surface-2 text-text"
                    : "border-line/40 text-text-tertiary hover:border-line/60"
                }`}
              >
                {active && <Check size={11} aria-hidden="true" strokeWidth={2.5} />}
                <Icon size={12} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
                {t(visual.labelKey)}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default GraphFilters;
