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
}) {
  const { t } = useTranslation();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

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
              <div className="mt-4 flex flex-col gap-5">
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
