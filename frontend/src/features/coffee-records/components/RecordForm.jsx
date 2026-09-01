import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import FormField from "./FormField";
import RatingInput from "./RatingInput";
import ChipMultiSelect from "./ChipMultiSelect";
import {
  controlClass,
  textareaClass,
  primaryButtonClass,
  secondaryButtonClass,
  cardClass,
} from "./formStyles";
import { RECORD_TYPES, TASTE_AXES } from "../utils/recordFormat";
import { getErrorMessage } from "../../../utils/errorMessage";

/**
 * 「コーヒーの詳細」を初期状態で開くかどうかの判定。
 *
 * 新規作成（項目が全部空）では閉じたままにする（Record First）。
 * 編集で、既に産地・フレーバー・味覚評価などが入力済みの記録を開いた
 * ときは、内容が見えないまま隠れているとユーザーが気づけないため、
 * 最初から開いた状態にする（2026-08、UI/UXレビューで指摘を受け対応）。
 */
const hasExistingCoffeeDetails = (values) => {
  const singleValueFields = ["farmName", "roasterName", "originId", "processId", "roastLevelId"];
  if (singleValueFields.some((field) => values[field])) return true;
  if (values.varietyIds?.length > 0 || values.flavorIds?.length > 0) return true;
  return TASTE_AXES.some(
    (axis) => values[axis.field] !== null && values[axis.field] !== undefined && values[axis.field] !== "",
  );
};

/**
 * 記録の入力フォーム。作成と編集で共用する。
 *
 * 構成は docs/design.md の「New / Edit Record」に沿う:
 *   最初に見せる … title / consumedAt / recordType / rating / notes
 *   段階的に見せる … origin / farm / variety / process / roastLevel /
 *                    flavors / cafeName / roasterName
 *
 * 「Record First」（docs/product-principles.md）に従い、
 * Coffee Details は初期状態で閉じている。
 * 入力項目の多さで記録をやめてしまわないようにするため。
 *
 * このコンポーネントは状態を持たない（開閉を除く）。
 * 値とエラーは useRecordForm から渡される。
 */
function RecordForm({
  values,
  errors,
  submitError,
  isSubmitting,
  setValue,
  toggleValue,
  onSubmit,
  onCancel,
  masterData,
  isMasterDataLoading,
  masterDataError,
  submitLabel,
  prefillOriginId = null,
}) {
  const { t } = useTranslation();
  const [isDetailsOpen, setIsDetailsOpen] = useState(() => hasExistingCoffeeDetails(values));

  // 2026-08、Discoverの「この産地を記録してみる」からの産地事前入力
  // （useRecordForm.jsのprefillOriginId）は、masterData読み込み待ちで
  // 初回レンダーより後に届く。上のuseStateの遅延初期化は初回レンダー
  // でしか評価されないため、それだけでは間に合わずCoffee Detailsが
  // 閉じたままになってしまう。GraphPage.jsxのappliedFocusGraphと同じ
  // 「レンダリング中に前回値と比較する」パターンで、prefillOriginIdが
  // 届いたときだけ1回開く。hasExistingCoffeeDetails(values)全般では
  // 判定しない（RecordForm.test.jsxの「隠れた項目にエラーがあれば自動的に
  // 開く」ケースと違い、値が入っただけ・エラーが無い間は開かないという
  // Record First の方針を崩さないため）
  const [openedForPrefillOriginId, setOpenedForPrefillOriginId] = useState(null);
  if (prefillOriginId && prefillOriginId !== openedForPrefillOriginId) {
    setOpenedForPrefillOriginId(prefillOriginId);
    setIsDetailsOpen(true);
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  // カフェ記録のときだけ店名を出す（docs/mvp.md: cafeNameはカフェ記録のみ）
  const isCafe = values.recordType === "cafe";

  // 何か問題があるとき、閉じている詳細セクションの中にエラーがあると
  // ユーザーが気づけないので開いて見せる
  const detailFields = [
    "farmName",
    "roasterName",
    "originId",
    "processId",
    "roastLevelId",
    ...TASTE_AXES.map((axis) => axis.field),
  ];
  const hasHiddenError = detailFields.some((field) => errors[field]);
  const showDetails = isDetailsOpen || hasHiddenError;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* ── 基本情報 ─────────────────────────────── */}
      <section className={`${cardClass} flex flex-col gap-5`}>
        <FormField id="title" label={t("recordForm.title")} required error={errors.title}>
          <input
            id="title"
            type="text"
            value={values.title}
            onChange={(event) => setValue("title", event.target.value)}
            placeholder={t("recordForm.titlePlaceholder")}
            maxLength={120}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            className={controlClass(errors.title)}
          />
        </FormField>

        <FormField id="consumedAt" label={t("recordForm.consumedAt")} required error={errors.consumedAt}>
          <input
            id="consumedAt"
            type="datetime-local"
            value={values.consumedAt}
            onChange={(event) => setValue("consumedAt", event.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.consumedAt)}
            aria-describedby={errors.consumedAt ? "consumedAt-error" : undefined}
            className={controlClass(errors.consumedAt)}
          />
        </FormField>

        <FormField id="recordType" label={t("recordForm.recordTypeLabel")} required error={errors.recordType}>
          <div role="radiogroup" aria-labelledby="recordType" className="flex gap-2">
            {RECORD_TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-primary/50 ${
                  values.recordType === type.value
                    ? "border-line-strong bg-surface-2 font-semibold text-text"
                    : "border-line/60 text-text-secondary hover:border-line"
                }`}
              >
                <input
                  type="radio"
                  name="recordType"
                  value={type.value}
                  checked={values.recordType === type.value}
                  onChange={(event) => setValue("recordType", event.target.value)}
                  disabled={isSubmitting}
                  className="sr-only"
                />
                {t(type.labelKey)}
              </label>
            ))}
          </div>
        </FormField>

        {isCafe && (
          <FormField id="cafeName" label={t("recordForm.cafeName")} error={errors.cafeName}>
            <input
              id="cafeName"
              type="text"
              value={values.cafeName}
              onChange={(event) => setValue("cafeName", event.target.value)}
              placeholder={t("recordForm.cafeNamePlaceholder")}
              maxLength={120}
              disabled={isSubmitting}
              className={controlClass(errors.cafeName)}
            />
          </FormField>
        )}

        <FormField id="rating" label={t("common.rating")} error={errors.rating}>
          <RatingInput
            id="rating"
            value={values.rating}
            onChange={(next) => setValue("rating", next)}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="notes" label={t("recordForm.notes")} error={errors.notes}>
          <textarea
            id="notes"
            value={values.notes}
            onChange={(event) => setValue("notes", event.target.value)}
            placeholder={t("recordForm.notesPlaceholder")}
            maxLength={2000}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.notes)}
            className={textareaClass(errors.notes)}
          />
          <p className="mt-1 text-right text-xs text-text-tertiary">
            {values.notes.length} / 2000
          </p>
        </FormField>
      </section>

      {/* ── コーヒーの詳細（段階的開示）───────────── */}
      <section className={cardClass}>
        <button
          type="button"
          onClick={() => setIsDetailsOpen((open) => !open)}
          aria-expanded={showDetails}
          aria-controls="coffee-details"
          className="flex w-full items-center justify-between gap-3 text-left"
        >
          <span>
            <span className="block text-sm font-semibold text-text">{t("records.detailsHeading")}</span>
            <span className="mt-0.5 block text-xs text-text-tertiary">
              {t("recordForm.detailsHint")}
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`flex-shrink-0 text-text-tertiary transition-transform duration-200 ${
              showDetails ? "rotate-180" : ""
            }`}
          />
        </button>

        {showDetails && (
          <div id="coffee-details" className="mt-5 flex flex-col gap-5">
            {masterDataError && (
              <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
                {t("recordForm.masterDataError")}
              </p>
            )}

            <span className="block text-sm font-semibold text-text">
              {t("recordForm.originFlavorHeading")}
            </span>

            <FormField id="originId" label={t("recordForm.origin")} error={errors.originId}>
              <select
                id="originId"
                value={values.originId}
                onChange={(event) => setValue("originId", event.target.value)}
                disabled={isSubmitting || isMasterDataLoading}
                className={controlClass(errors.originId)}
              >
                <option value="">{t("common.notSelected")}</option>
                {masterData.origins.map((origin) => (
                  <option key={origin.id} value={origin.id}>
                    {origin.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="farmName"
              label={t("recordForm.farmName")}
              hint={t("recordForm.farmNameHint")}
              error={errors.farmName}
            >
              <input
                id="farmName"
                type="text"
                value={values.farmName}
                onChange={(event) => setValue("farmName", event.target.value)}
                placeholder={t("recordForm.farmNamePlaceholder")}
                maxLength={120}
                disabled={isSubmitting}
                className={controlClass(errors.farmName)}
              />
            </FormField>

            <FormField id="varietyIds" label={t("recordForm.variety")} hint={t("recordForm.multiSelectHint")}>
              <ChipMultiSelect
                id="varietyIds"
                options={masterData.varieties}
                selectedIds={values.varietyIds}
                onToggle={(optionId) => toggleValue("varietyIds", optionId)}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField id="processId" label={t("recordForm.process")} error={errors.processId}>
              <select
                id="processId"
                value={values.processId}
                onChange={(event) => setValue("processId", event.target.value)}
                disabled={isSubmitting || isMasterDataLoading}
                className={controlClass(errors.processId)}
              >
                <option value="">{t("common.notSelected")}</option>
                {masterData.processes.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="roastLevelId" label={t("recordForm.roastLevel")} error={errors.roastLevelId}>
              <select
                id="roastLevelId"
                value={values.roastLevelId}
                onChange={(event) => setValue("roastLevelId", event.target.value)}
                disabled={isSubmitting || isMasterDataLoading}
                className={controlClass(errors.roastLevelId)}
              >
                <option value="">{t("common.notSelected")}</option>
                {masterData.roastLevels.map((roastLevel) => (
                  <option key={roastLevel.id} value={roastLevel.id}>
                    {roastLevel.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="flavorIds" label={t("recordForm.flavor")} hint={t("recordForm.multiSelectHint")}>
              <ChipMultiSelect
                id="flavorIds"
                options={masterData.flavors}
                selectedIds={values.flavorIds}
                onToggle={(optionId) => toggleValue("flavorIds", optionId)}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField id="roasterName" label={t("recordForm.roasterName")} error={errors.roasterName}>
              <input
                id="roasterName"
                type="text"
                value={values.roasterName}
                onChange={(event) => setValue("roasterName", event.target.value)}
                placeholder={t("recordForm.roasterNamePlaceholder")}
                maxLength={120}
                disabled={isSubmitting}
                className={controlClass(errors.roasterName)}
              />
            </FormField>

            {/* 味覚グラフ（6軸）。既存のratingと同じRatingInputを再利用する */}
            <div className="border-t border-line/60 pt-5">
              <span className="block text-sm font-semibold text-text">
                {t("recordForm.tasteHeading")}
              </span>
              <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                {TASTE_AXES.map(({ field, labelKey }) => (
                  <FormField key={field} id={field} label={t(labelKey)} error={errors[field]}>
                    <RatingInput
                      id={field}
                      value={values[field]}
                      onChange={(next) => setValue(field, next)}
                      disabled={isSubmitting}
                    />
                  </FormField>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* 項目に紐づかないエラー（通信エラーなど）はここへ出す */}
      {submitError && !submitError.isValidationError && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {getErrorMessage(submitError, t)}
        </p>
      )}
      {submitError?.isValidationError && (
        <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {t("recordForm.checkInput")}
        </p>
      )}

      {/* 主要CTAは1画面に1つ（docs/design.md の UI Rules）。
          キャンセルは控えめな見た目にして、保存を主役にする */}
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={secondaryButtonClass}
        >
          {t("common.cancel")}
        </button>
        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
          {isSubmitting ? t("common.saving") : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default RecordForm;
