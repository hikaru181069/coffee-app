import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { controlClass } from "./formStyles";
import { RECORD_TYPES } from "../utils/recordFormat";

/**
 * 一覧の絞り込み。
 *
 * docs/mvp.md の「基本フィルター」と docs/design.md の
 * 「home / cafe フィルター、rating・origin・flavorなどの絞り込み」に対応する。
 *
 * 状態は持たず、値と変更関数を親（RecordsPage）から受け取る。
 * URLと同期させたくなったときに、この中を触らずに済む。
 */
function RecordFilters({ filters, onChange, onClear, masterData, hasActiveFilters }) {
  const { t } = useTranslation();
  const update = (field, value) => onChange({ ...filters, [field]: value, page: 1 });

  return (
    <section aria-label={t("records.filterAriaLabel")} className="flex flex-col gap-3">
      {/* 記録タイプは選択頻度が高いので、セレクトではなくボタンで常時見せる */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => update("recordType", "")}
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
            onClick={() => update("recordType", type.value)}
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

        {hasActiveFilters && (
          <button
            type="button"
            onClick={onClear}
            className="ml-auto inline-flex items-center gap-1 text-xs text-ctp-subtext0 underline underline-offset-2 hover:text-ctp-text"
          >
            <X size={12} aria-hidden="true" />
            {t("common.clearFilters")}
          </button>
        )}
      </div>

      {/* 残りは横並び。モバイルでは1列に折り返す */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="filter-origin" className="text-xs text-ctp-subtext0">
            {t("recordForm.origin")}
          </label>
          <select
            id="filter-origin"
            value={filters.originId}
            onChange={(event) => update("originId", event.target.value)}
            className={controlClass(false)}
          >
            <option value="">{t("records.allOrigins")}</option>
            {masterData.origins.map((origin) => (
              <option key={origin.id} value={origin.id}>
                {origin.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-flavor" className="text-xs text-ctp-subtext0">
            {t("recordForm.flavor")}
          </label>
          <select
            id="filter-flavor"
            value={filters.flavorId}
            onChange={(event) => update("flavorId", event.target.value)}
            className={controlClass(false)}
          >
            <option value="">{t("records.allFlavors")}</option>
            {masterData.flavors.map((flavor) => (
              <option key={flavor.id} value={flavor.id}>
                {flavor.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="filter-rating" className="text-xs text-ctp-subtext0">
            {t("common.rating")}
          </label>
          <select
            id="filter-rating"
            value={filters.ratingMin}
            onChange={(event) => update("ratingMin", event.target.value)}
            className={controlClass(false)}
          >
            <option value="">{t("records.ratingUnfiltered")}</option>
            {[5, 4, 3, 2].map((score) => (
              <option key={score} value={score}>
                {t("common.scoreOrMore", { score })}
              </option>
            ))}
          </select>
        </div>
      </div>
    </section>
  );
}

export default RecordFilters;
