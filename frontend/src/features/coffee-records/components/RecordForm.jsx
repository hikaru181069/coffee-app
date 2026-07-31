import { useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";

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
import { RECORD_TYPES } from "../utils/recordFormat";

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
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  // カフェ記録のときだけ店名を出す（docs/mvp.md: cafeNameはカフェ記録のみ）
  const isCafe = values.recordType === "cafe";

  // 何か問題があるとき、閉じている詳細セクションの中にエラーがあると
  // ユーザーが気づけないので開いて見せる
  const detailFields = ["farmName", "roasterName", "originId", "processId", "roastLevelId"];
  const hasHiddenError = detailFields.some((field) => errors[field]);
  const showDetails = isDetailsOpen || hasHiddenError;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      {/* ── 基本情報 ─────────────────────────────── */}
      <section className={`${cardClass} flex flex-col gap-5`}>
        <FormField id="title" label="タイトル" required error={errors.title}>
          <input
            id="title"
            type="text"
            value={values.title}
            onChange={(event) => setValue("title", event.target.value)}
            placeholder="例: Ethiopia Yirgacheffe"
            maxLength={120}
            disabled={isSubmitting}
            aria-invalid={Boolean(errors.title)}
            aria-describedby={errors.title ? "title-error" : undefined}
            className={controlClass(errors.title)}
          />
        </FormField>

        <FormField id="consumedAt" label="飲んだ日時" required error={errors.consumedAt}>
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

        <FormField id="recordType" label="どこで飲んだか" required error={errors.recordType}>
          <div role="radiogroup" aria-labelledby="recordType" className="flex gap-2">
            {RECORD_TYPES.map((type) => (
              <label
                key={type.value}
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-ctp-blue/50 ${
                  values.recordType === type.value
                    ? "border-ctp-blue bg-ctp-blue/15 font-semibold text-ctp-text"
                    : "border-ctp-overlay0/60 text-ctp-subtext1 hover:border-ctp-overlay0"
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
                {type.label}
              </label>
            ))}
          </div>
        </FormField>

        {isCafe && (
          <FormField id="cafeName" label="店名" error={errors.cafeName}>
            <input
              id="cafeName"
              type="text"
              value={values.cafeName}
              onChange={(event) => setValue("cafeName", event.target.value)}
              placeholder="例: Blue Bottle Coffee"
              maxLength={120}
              disabled={isSubmitting}
              className={controlClass(errors.cafeName)}
            />
          </FormField>
        )}

        <FormField id="rating" label="評価" error={errors.rating}>
          <RatingInput
            id="rating"
            value={values.rating}
            onChange={(next) => setValue("rating", next)}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id="notes" label="メモ" error={errors.notes}>
          <textarea
            id="notes"
            value={values.notes}
            onChange={(event) => setValue("notes", event.target.value)}
            placeholder="味の印象、淹れ方、そのときのことなど"
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
            <span className="block text-sm font-semibold text-ctp-text">コーヒーの詳細</span>
            <span className="mt-0.5 block text-xs text-ctp-subtext0">
              産地や品種を選ぶと、記録どうしがつながります（すべて任意）
            </span>
          </span>
          <ChevronDown
            size={18}
            aria-hidden="true"
            className={`flex-shrink-0 text-ctp-subtext0 transition-transform duration-200 ${
              showDetails ? "rotate-180" : ""
            }`}
          />
        </button>

        {showDetails && (
          <div id="coffee-details" className="mt-5 flex flex-col gap-5">
            {masterDataError && (
              <p className="rounded-lg border border-ctp-peach/40 bg-ctp-peach/10 px-3 py-2 text-xs text-ctp-peach">
                選択肢を読み込めませんでした。この部分は空欄のままでも記録は保存できます。
              </p>
            )}

            <FormField id="originId" label="産地" error={errors.originId}>
              <select
                id="originId"
                value={values.originId}
                onChange={(event) => setValue("originId", event.target.value)}
                disabled={isSubmitting || isMasterDataLoading}
                className={controlClass(errors.originId)}
              >
                <option value="">選択しない</option>
                {masterData.origins.map((origin) => (
                  <option key={origin.id} value={origin.id}>
                    {origin.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField
              id="farmName"
              label="農園"
              hint="候補が無いため自由入力です"
              error={errors.farmName}
            >
              <input
                id="farmName"
                type="text"
                value={values.farmName}
                onChange={(event) => setValue("farmName", event.target.value)}
                placeholder="例: Konga Washing Station"
                maxLength={120}
                disabled={isSubmitting}
                className={controlClass(errors.farmName)}
              />
            </FormField>

            <FormField id="varietyIds" label="品種" hint="複数選べます">
              <ChipMultiSelect
                id="varietyIds"
                options={masterData.varieties}
                selectedIds={values.varietyIds}
                onToggle={(optionId) => toggleValue("varietyIds", optionId)}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField id="processId" label="精製方法" error={errors.processId}>
              <select
                id="processId"
                value={values.processId}
                onChange={(event) => setValue("processId", event.target.value)}
                disabled={isSubmitting || isMasterDataLoading}
                className={controlClass(errors.processId)}
              >
                <option value="">選択しない</option>
                {masterData.processes.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="roastLevelId" label="焙煎度" error={errors.roastLevelId}>
              <select
                id="roastLevelId"
                value={values.roastLevelId}
                onChange={(event) => setValue("roastLevelId", event.target.value)}
                disabled={isSubmitting || isMasterDataLoading}
                className={controlClass(errors.roastLevelId)}
              >
                <option value="">選択しない</option>
                {masterData.roastLevels.map((roastLevel) => (
                  <option key={roastLevel.id} value={roastLevel.id}>
                    {roastLevel.name}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField id="flavorIds" label="フレーバー" hint="複数選べます">
              <ChipMultiSelect
                id="flavorIds"
                options={masterData.flavors}
                selectedIds={values.flavorIds}
                onToggle={(optionId) => toggleValue("flavorIds", optionId)}
                disabled={isSubmitting}
              />
            </FormField>

            <FormField id="roasterName" label="焙煎者・ロースター" error={errors.roasterName}>
              <input
                id="roasterName"
                type="text"
                value={values.roasterName}
                onChange={(event) => setValue("roasterName", event.target.value)}
                placeholder="例: Onibus Coffee"
                maxLength={120}
                disabled={isSubmitting}
                className={controlClass(errors.roasterName)}
              />
            </FormField>
          </div>
        )}
      </section>

      {/* 項目に紐づかないエラー（通信エラーなど）はここへ出す */}
      {submitError && !submitError.isValidationError && (
        <p role="alert" className="rounded-lg border border-ctp-red/40 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red">
          {submitError.message}
        </p>
      )}
      {submitError?.isValidationError && (
        <p role="alert" className="rounded-lg border border-ctp-red/40 bg-ctp-red/10 px-3 py-2 text-sm text-ctp-red">
          入力内容を確認してください。
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
          キャンセル
        </button>
        <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
          {isSubmitting && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
          {isSubmitting ? "保存中..." : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default RecordForm;
