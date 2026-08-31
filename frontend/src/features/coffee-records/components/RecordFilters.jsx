import { useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RECORD_TYPES } from "../utils/recordFormat";
import ChipMultiSelect from "./ChipMultiSelect";

/**
 * コンパクトな横並び用のselect。formStyles.jsのcontrolClassは
 * RecordFormの縦積みフォーム向け（py-2・幅いっぱい）なので、
 * 「ブラウズ用のfilter bar」に収まる高さ・幅にした専用クラスを
 * ここに閉じる（RecordForm側の見た目には影響させない）。
 */
const compactSelectClass =
  "w-auto rounded-lg border border-line/60 bg-surface-1 py-1.5 pl-2.5 pr-7 text-sm text-text " +
  "transition-colors duration-150 hover:border-line focus:outline-none focus:ring-2 focus:ring-primary/50";

const compactInputClass =
  "w-auto rounded-lg border border-line/60 bg-surface-1 px-2.5 py-1.5 text-sm text-text " +
  "transition-colors duration-150 hover:border-line focus:outline-none focus:ring-2 focus:ring-primary/50";

/** 産地・品種・精製方法・焙煎度・フレーバーの複数選択フィールド一覧。詳細フィルターのレンダリングとhasActiveFiltersの判定で共有する */
const REFERENCE_FIELDS = [
  { field: "originIds", labelKey: "recordForm.origin", optionsKey: "origins" },
  { field: "varietyIds", labelKey: "recordForm.variety", optionsKey: "varieties" },
  { field: "processIds", labelKey: "recordForm.process", optionsKey: "processes" },
  { field: "roastLevelIds", labelKey: "recordForm.roastLevel", optionsKey: "roastLevels" },
  { field: "flavorIds", labelKey: "recordForm.flavor", optionsKey: "flavors" },
];

/**
 * 一覧の絞り込み。
 *
 * docs/mvp.md の「基本フィルター」と docs/design.md の
 * 「home / cafe フィルター、rating・origin・flavorなどの絞り込み」に対応する。
 *
 * 状態は持たず、値と変更関数を親（RecordsPage）から受け取る。
 * URLと同期させたくなったときに、この中を触らずに済む。
 *
 * 2026-08、「検索フォーム」ではなく「Recordsをブラウズするfilter bar」に
 * 見えるよう、縦積み2ブロックから横並び1行（左: type toggle、右: select群）
 * へ再構成した。selectの上に常時出していたラベルはsr-only化し、
 * 選択されていない状態のoption文言（「すべての産地」等）自体を視覚的な
 * ラベル代わりにしている（見た目のコンパクトさとアクセシビリティを両立）。
 *
 * 2026-08、産地・品種・精製方法・焙煎度・フレーバーの複数選択と、
 * 期間（dateFrom/dateTo）に対応した。5項目分のChipMultiSelect+日付2つを
 * 常時この行に並べると窮屈になるため、RecordForm.jsxの「Coffee Details」
 * と同じ段階的開示（初期状態は閉じる）で「詳細フィルター」の中へまとめた。
 * recordType・rating・検索ボックス（RecordsPage.jsx側）は利用頻度が高い
 * ため引き続き常時表示のまま。
 */
function RecordFilters({ filters, onChange, onClear, masterData, hasActiveFilters }) {
  const { t } = useTranslation();
  const advancedFilterCount = REFERENCE_FIELDS.filter(
    ({ field }) => (filters[field]?.length ?? 0) > 0,
  ).length + (filters.dateFrom ? 1 : 0) + (filters.dateTo ? 1 : 0);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(advancedFilterCount > 0);

  const update = (field, value) => onChange({ ...filters, [field]: value, page: 1 });

  const toggleReferenceId = (field, id) => {
    const current = filters[field] ?? [];
    const next = current.includes(id) ? current.filter((value) => value !== id) : [...current, id];
    update(field, next);
  };

  return (
    <section aria-label={t("records.filterAriaLabel")} className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* 記録タイプは選択頻度が高いので、セレクトではなくボタンで常時見せる */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => update("recordType", "")}
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
              onClick={() => update("recordType", type.value)}
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
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="filter-rating" className="sr-only">
            {t("common.rating")}
          </label>
          <select
            id="filter-rating"
            value={filters.ratingMin}
            onChange={(event) => update("ratingMin", event.target.value)}
            className={compactSelectClass}
          >
            <option value="">{t("records.ratingUnfiltered")}</option>
            {[5, 4, 3, 2].map((score) => (
              <option key={score} value={score}>
                {t("common.scoreOrMore", { score })}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIsAdvancedOpen((open) => !open)}
            aria-expanded={isAdvancedOpen}
            aria-controls="advanced-filters"
            className={`${compactSelectClass} inline-flex items-center gap-1.5 pr-3`}
          >
            {t("records.advancedFilters")}
            {advancedFilterCount > 0 && (
              <span className="rounded-full bg-surface-2 px-1.5 font-mono text-xs text-text-secondary">
                {advancedFilterCount}
              </span>
            )}
            <ChevronDown
              size={14}
              aria-hidden="true"
              className={`transition-transform duration-200 ${isAdvancedOpen ? "rotate-180" : ""}`}
            />
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 text-xs text-text-tertiary underline underline-offset-2 hover:text-text"
            >
              <X size={12} aria-hidden="true" />
              {t("common.clearFilters")}
            </button>
          )}
        </div>
      </div>

      {isAdvancedOpen && (
        <div
          id="advanced-filters"
          aria-label={t("records.advancedFiltersAriaLabel")}
          className="grid grid-cols-1 gap-5 border-t border-line/40 pt-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {REFERENCE_FIELDS.map(({ field, labelKey, optionsKey }) => (
            <div key={field}>
              <p className="mb-2 text-xs font-medium text-text-tertiary">{t(labelKey)}</p>
              <ChipMultiSelect
                id={`filter-${field}`}
                options={masterData[optionsKey] ?? []}
                selectedIds={filters[field] ?? []}
                onToggle={(id) => toggleReferenceId(field, id)}
              />
            </div>
          ))}

          <div>
            <p className="mb-2 text-xs font-medium text-text-tertiary">
              {t("records.dateFrom")} 〜 {t("records.dateTo")}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="filter-dateFrom" className="sr-only">
                {t("records.dateFrom")}
              </label>
              <input
                id="filter-dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(event) => update("dateFrom", event.target.value)}
                className={compactInputClass}
              />
              <span aria-hidden="true" className="text-sm text-text-tertiary">
                〜
              </span>
              <label htmlFor="filter-dateTo" className="sr-only">
                {t("records.dateTo")}
              </label>
              <input
                id="filter-dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(event) => update("dateTo", event.target.value)}
                className={compactInputClass}
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default RecordFilters;
