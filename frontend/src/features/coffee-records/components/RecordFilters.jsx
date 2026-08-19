import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { RECORD_TYPES } from "../utils/recordFormat";

/**
 * コンパクトな横並び用のselect。formStyles.jsのcontrolClassは
 * RecordFormの縦積みフォーム向け（py-2・幅いっぱい）なので、
 * 「ブラウズ用のfilter bar」に収まる高さ・幅にした専用クラスを
 * ここに閉じる（RecordForm側の見た目には影響させない）。
 */
const compactSelectClass =
  "w-auto rounded-lg border border-line/60 bg-surface-1 py-1.5 pl-2.5 pr-7 text-sm text-text " +
  "transition-colors duration-150 hover:border-line focus:outline-none focus:ring-2 focus:ring-primary/50";

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
 */
function RecordFilters({ filters, onChange, onClear, masterData, hasActiveFilters }) {
  const { t } = useTranslation();
  const update = (field, value) => onChange({ ...filters, [field]: value, page: 1 });

  return (
    <section
      aria-label={t("records.filterAriaLabel")}
      className="flex flex-wrap items-center justify-between gap-3"
    >
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

      {/* 右側: origin / flavor / rating。狭い画面では自然に次の行へ折り返す */}
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="filter-origin" className="sr-only">
          {t("recordForm.origin")}
        </label>
        <select
          id="filter-origin"
          value={filters.originId}
          onChange={(event) => update("originId", event.target.value)}
          className={compactSelectClass}
        >
          <option value="">{t("records.allOrigins")}</option>
          {masterData.origins.map((origin) => (
            <option key={origin.id} value={origin.id}>
              {origin.name}
            </option>
          ))}
        </select>

        <label htmlFor="filter-flavor" className="sr-only">
          {t("recordForm.flavor")}
        </label>
        <select
          id="filter-flavor"
          value={filters.flavorId}
          onChange={(event) => update("flavorId", event.target.value)}
          className={compactSelectClass}
        >
          <option value="">{t("records.allFlavors")}</option>
          {masterData.flavors.map((flavor) => (
            <option key={flavor.id} value={flavor.id}>
              {flavor.name}
            </option>
          ))}
        </select>

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
    </section>
  );
}

export default RecordFilters;
