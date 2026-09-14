import { useState } from "react";
import { Check, ChevronDown, Loader2, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import FormField from "./FormField";
import RatingInput from "./RatingInput";
import ChipMultiSelect from "./ChipMultiSelect";
import CoffeeComponentFields from "./CoffeeComponentFields";
import AttributeLabel from "./AttributeLabel";
import TasteSliderInput from "./TasteSliderInput";
import {
  controlClass,
  textareaClass,
  primaryButtonClass,
  secondaryButtonClass,
  cardClass,
  zoneHeadingClass,
} from "./formStyles";
import { RECORD_TYPES, TASTE_AXES } from "../utils/recordFormat";
import { getErrorMessage } from "../../../utils/errorMessage";

/**
 * 「コーヒーの詳細」を初期状態で開くかどうかの判定。
 *
 * 新規作成（項目が全部空）では閉じたままにする（Record First）。
 * 編集で、既に産地・フレーバーなどが入力済みの記録を開いたときは、
 * 内容が見えないまま隠れているとユーザーが気づけないため、最初から
 * 開いた状態にする（2026-08、UI/UXレビューで指摘を受け対応）。
 *
 * 2026-09、記録体験の再設計でTASTE（味覚6軸）を常時表示ゾーンへ
 * 独立させたため、ここでの判定対象からは外した（TASTE_AXESの値が
 * 入っていても、この段階的開示の対象ではなくなったため）。
 */
const hasExistingCoffeeDetails = (values) => {
  const singleValueFields = ["roasterName", "roastLevelId"];
  if (singleValueFields.some((field) => values[field])) return true;
  return values.components?.length > 0 || values.flavorIds?.length > 0;
};

/**
 * 記録の入力フォーム。作成と編集で共用する。
 *
 * 2026-09、「記録体験を向上させる」テーマの第2弾として、レシート/
 * チケット風の単一カードへ全面再設計した（それまでは基本情報・コーヒーの
 * 詳細を別々のカードに分けていた）。新しい色トークンは増やさず、
 * 破線区切り（zoneDividerClass）とゾーン見出し（zoneHeadingClass、
 * CoffeeComponentFields.jsxの「コーヒーN」見出しと同じ書体）だけで
 * ゾーンを表現する。ゾーン構成:
 *   HEADER   … title / consumedAt / recordType / cafeName
 *   COFFEE DETAILS（段階的開示）… コーヒーの詳細(components) / roastLevel /
 *              flavors / roasterName
 *   TASTE（常時表示）… 味覚6軸のスライダー。味覚評価はこのアプリの
 *              中心体験の1つのため、Coffee Detailsの折りたたみからは
 *              独立させ、発見しやすさを優先した
 *   NOTES    … notes
 *   FOOTER   … 総合評価(★) + 保存ボタン
 *
 * 「Record First」（docs/product.md）に従い、Coffee Detailsは初期状態で
 * 閉じている。入力項目の多さで記録をやめてしまわないようにするため。
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
  addComponent,
  removeComponent,
  setComponentValue,
  toggleComponentValue,
  onSubmit,
  onCancel,
  masterData,
  isMasterDataLoading,
  masterDataError,
  submitLabel,
  prefillOriginId = null,
  isJustSaved = false,
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
  // ユーザーが気づけないので開いて見せる（TASTEは常時表示のためここでは
  // 判定不要）
  const detailFields = ["roasterName", "roastLevelId"];
  const hasHiddenError = detailFields.some((field) => errors[field]);
  const showDetails = isDetailsOpen || hasHiddenError;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      {/* レシート風の単一カード。各ゾーンはdivide-yの破線で区切り、
          新しい色トークンは追加しない（2026-09、記録体験の再設計） */}
      <div className={`${cardClass} flex flex-col divide-y divide-dashed divide-line/60`}>
        {/* ── HEADER ───────────────────────────── */}
        <div className="flex flex-col gap-5 pb-5">
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
              className={`${controlClass(errors.consumedAt)} font-mono`}
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
        </div>

        {/* ── COFFEE DETAILS（段階的開示）─────────── */}
        <div className="py-5">
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

              {/* 2026-09、ブレンドコーヒー対応で産地・農園・品種・精製方法を
                  「コーヒーの詳細」1グループとして繰り返し入力できるようにした
                  （docs/domain-model.md参照）。Record First（産地未入力でも
                  保存できる）を保つため、初期状態では0グループのまま */}
              <div className="flex flex-col gap-3">
                {values.components.map((component, index) => (
                  <CoffeeComponentFields
                    key={index}
                    index={index}
                    value={component}
                    onChange={(field, value) => setComponentValue(index, field, value)}
                    onToggleVariety={(optionId) => toggleComponentValue(index, "varietyIds", optionId)}
                    onRemove={() => removeComponent(index)}
                    canRemove
                    masterData={masterData}
                    isMasterDataLoading={isMasterDataLoading}
                    isSubmitting={isSubmitting}
                  />
                ))}
                <button
                  type="button"
                  onClick={addComponent}
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-line/60 px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:border-line hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus size={16} aria-hidden="true" />
                  {t("recordForm.addComponent")}
                </button>
              </div>

              <FormField
                id="roastLevelId"
                label={<AttributeLabel type="roastLevel">{t("recordForm.roastLevel")}</AttributeLabel>}
                error={errors.roastLevelId}
              >
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

              <FormField
                id="flavorIds"
                label={<AttributeLabel type="flavor">{t("recordForm.flavor")}</AttributeLabel>}
                hint={t("recordForm.multiSelectHint")}
              >
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
            </div>
          )}
        </div>

        {/* ── TASTE（常時表示）─────────────────────── */}
        <div className="py-5">
          <span className={zoneHeadingClass}>{t("recordForm.tasteHeading")}</span>
          <div className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {TASTE_AXES.map(({ field, labelKey }) => (
              <FormField key={field} id={field} label={t(labelKey)} error={errors[field]}>
                <TasteSliderInput
                  id={field}
                  value={values[field]}
                  onChange={(next) => setValue(field, next)}
                  disabled={isSubmitting}
                />
              </FormField>
            ))}
          </div>
        </div>

        {/* ── NOTES ────────────────────────────── */}
        <div className="py-5">
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
        </div>

        {/* ── FOOTER ───────────────────────────── */}
        <div className="flex flex-col-reverse gap-4 pt-5 sm:flex-row sm:items-end sm:justify-between">
          <FormField id="rating" label={t("common.rating")} error={errors.rating}>
            <RatingInput
              id="rating"
              value={values.rating}
              onChange={(next) => setValue("rating", next)}
              disabled={isSubmitting}
            />
          </FormField>

          <button type="submit" disabled={isSubmitting} className={`${primaryButtonClass} sm:self-end`}>
            {isJustSaved ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              isSubmitting && <Loader2 size={16} aria-hidden="true" className="animate-spin" />
            )}
            {isJustSaved ? t("common.saved") : isSubmitting ? t("common.saving") : submitLabel}
          </button>
        </div>
      </div>

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

      {/* キャンセルはカードの外、控えめな見た目にして保存を主役にする
          （docs/design.md の UI Rules「主要CTAは1画面に1つ」） */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className={secondaryButtonClass}
        >
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

export default RecordForm;
