import { useState } from "react";
import { motion as Motion } from "framer-motion";
import { Building2, Plus, StickyNote, Store } from "lucide-react";
import { useTranslation } from "react-i18next";

import CoffeeLoader from "../../../components/CoffeeLoader";
import FormField from "./FormField";
import RatingInput from "./RatingInput";
import TagCombo from "./TagCombo";
import PropertyButton from "./PropertyButton";
import CoffeeComponentFields from "./CoffeeComponentFields";
import OriginBadgePicker from "./OriginBadgePicker";
import TasteRadarInput from "./TasteRadarInput";
import DiscoveryBadge from "./DiscoveryBadge";
import AttributeLabel from "./AttributeLabel";
import {
  controlClass,
  textareaClass,
  primaryButtonClass,
  secondaryButtonClass,
  zoneHeadingClass,
} from "./formStyles";
import { emptyComponent } from "../hooks/useRecordForm";
import { RECORD_TYPES, TASTE_AXES } from "../utils/recordFormat";
import { getOriginHex } from "../utils/originAccent";
import { getNodeVisual } from "../../graph/utils/nodeVisuals";
import { previewOriginDiscovery } from "../api/discoveriesApi";
import { getErrorMessage } from "../../../utils/errorMessage";

/**
 * 保存ボタンの「完成度」を大まかに算出する（0〜1）。新しいメーターを
 * 増やさず、保存ボタン自体の質感（影の強さ）がこの値に応じて変わる。
 */
const calcCompleteness = (values) => {
  const checks = [
    values.components?.length > 0,
    values.flavorIds?.length > 0,
    Boolean(values.roastLevelId),
    values.notes.trim() !== "",
    TASTE_AXES.some(({ field }) => values[field] !== ""),
  ];
  return checks.filter(Boolean).length / checks.length;
};

/** 保存成功時に一瞬だけ再生する「淹れる」演出のアイコン。 */
function PourIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5 9h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V9Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M16 11h1.2a2 2 0 1 1 0 4H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <Motion.rect
        x="6.5"
        width="8"
        rx="1"
        fill="currentColor"
        initial={{ y: 15, height: 0, opacity: 0 }}
        animate={{ y: 11, height: 4.5, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
      />
    </svg>
  );
}

/**
 * 記録の入力フォーム「コーヒーキャンバス」。作成と編集で共用する。
 *
 * 2026-09、「記録体験を向上させる」テーマの作り直し。承認済み
 * Artifactモックアップ「Coffee Canvas v2」がベース
 * （docs/design.md「New / Edit Record」参照）。ゾーン構成:
 *
 *   タイトル       … 画面最上部の大見出しとして直接編集
 *   キャンバス     … 産地バッジ（1グループ目=values.components[0]の産地。
 *                    選ぶとレーダーの塗り色がその産地色を纏う）＋
 *                    六角形の味覚レーダー（頂点ドラッグで6軸入力）
 *   必須のクイック行 … 日時・home/cafe（必須項目はボタン化せず常時表示）
 *   コーヒーの詳細 … フレーバー・農園・品種・精製方法・焙煎度・
 *                    ロースター名・店名・メモを、それぞれ現在値を示す
 *                    小さいボタン（PropertyButton）にする。クリックした
 *                    ときだけその場にポップオーバーを開いて編集する。
 *                    実データ件数（フレーバー41種等）でも、ボタンの帯は
 *                    折り返すだけでキャンバス自体の高さは変わらない
 *   実務の帯       … 評価・保存ボタン
 *
 * 産地の色は「キャンバス背景全体を染める」演出をやめ、産地バッジ自体の
 * 色と味覚レーダーの塗り色という、局所的な使い方に留めている
 * （ユーザーから「背景に使うのはダサい」という指摘を受けた対応）。
 *
 * 必須項目（タイトル・日時・recordType）は変えていないため、Record First
 * （最小限の入力で保存できる）自体は崩れていない。
 */
function RecordForm({
  values,
  errors,
  submitError,
  isSubmitting,
  setValue,
  validateField,
  toggleValue,
  addComponent,
  removeComponent,
  setComponentValue,
  toggleComponentValue,
  setPrimaryComponentValue,
  togglePrimaryComponentVariety,
  onSubmit,
  onCancel,
  masterData,
  isMasterDataLoading,
  masterDataError,
  submitLabel,
  isJustSaved = false,
}) {
  const { t } = useTranslation();
  const [discoveryPreview, setDiscoveryPreview] = useState(null);

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  const isCafe = values.recordType === "cafe";

  // 1グループ目（産地キャンバスが直接操作する対象）。まだ何も選んでいない
  // 新規作成では values.components が空配列のままなので、表示用に空の値を
  // 補う（実際にcomponents[0]が作られるのは、ユーザーが何かを選んだ瞬間。
  // setPrimaryComponentValue/togglePrimaryComponentVarietyが吸収する）
  const primaryComponent = values.components[0] ?? emptyComponent();
  const blendComponents = values.components.slice(1);

  const primaryOriginName = primaryComponent.originId
    ? masterData.origins.find((origin) => origin.id === primaryComponent.originId)?.name
    : null;
  const originMoodHex = primaryOriginName ? getOriginHex(primaryOriginName) : null;

  const primaryVarietyNames = (primaryComponent.varietyIds ?? [])
    .map((varietyId) => masterData.varieties.find((variety) => variety.id === varietyId)?.name)
    .filter(Boolean);
  const primaryProcessName = primaryComponent.processId
    ? masterData.processes.find((process) => process.id === primaryComponent.processId)?.name
    : null;
  const roastLevelName = values.roastLevelId
    ? masterData.roastLevels.find((roastLevel) => roastLevel.id === values.roastLevelId)?.name
    : null;

  /**
   * 産地バッジを実際に選び終えた（クリック／Enter・Space）瞬間だけ、
   * 保存前の「発見」プレビューを呼ぶ。DBには何も保存しない、読み取り
   * 専用の問い合わせ。結果が1件以上あれば専用のDiscoveryBadgeで一瞬
   * 知らせる。ネットワークエラー等で失敗しても、記録自体の入力を
   * 妨げたくないので静かに無視する
   */
  const handlePrimaryOriginCommit = async (originId) => {
    try {
      const { discoveries } = await previewOriginDiscovery(originId);
      setDiscoveryPreview(discoveries[0] ?? null);
    } catch {
      // 静かに無視する
    }
  };

  /**
   * 「＋ブレンドを追加」。1グループ目がまだ無い（componentsが空配列の
   * まま）状態でクリックされた場合は、2グループ目を作る前にまず
   * 1グループ目を確定させる
   */
  const handleAddBlend = () => {
    if (values.components.length === 0) addComponent();
    addComponent();
  };

  const completeness = calcCompleteness(values);

  const radarAxes = TASTE_AXES.map((axis) => ({
    ...axis,
    value: values[axis.field] === "" ? null : Number(values[axis.field]),
  }));

  const flavorVisual = getNodeVisual("flavor");
  const farmVisual = getNodeVisual("farm");
  const varietyVisual = getNodeVisual("variety");
  const processVisual = getNodeVisual("process");
  const roastVisual = getNodeVisual("roastLevel");

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto flex flex-col gap-8 p-1 sm:p-6">
      {/* ── タイトル ─────────────────────────────── */}
      <FormField id="title" label={t("recordForm.title")} required error={errors.title}>
        <input
          id="title"
          type="text"
          value={values.title}
          onChange={(event) => setValue("title", event.target.value)}
          onBlur={() => validateField("title")}
          placeholder={t("recordForm.titlePlaceholder")}
          maxLength={120}
          disabled={isSubmitting}
          aria-invalid={Boolean(errors.title)}
          aria-describedby={errors.title ? "title-error" : undefined}
          className="w-full border-none bg-transparent p-0 text-4xl font-bold leading-tight text-text placeholder:text-text-tertiary/35 outline-none sm:text-5xl"
        />
      </FormField>

      {/* ── キャンバス: 産地 + 味覚レーダー ─────────────── */}
      <div className="grid gap-8 sm:grid-cols-2 sm:items-center">
        <div className="flex flex-col gap-3">
          <FormField id="origin-primary" label={<AttributeLabel type="origin">{t("recordForm.origin")}</AttributeLabel>}>
            <OriginBadgePicker
              id="origin-primary"
              options={masterData.origins}
              selectedId={primaryComponent.originId}
              onChange={(optionId) => setPrimaryComponentValue("originId", optionId)}
              onCommit={handlePrimaryOriginCommit}
              disabled={isSubmitting || isMasterDataLoading}
            />
          </FormField>
          <DiscoveryBadge discovery={discoveryPreview} />
        </div>

        <div className="flex flex-col items-center gap-2">
          <span className={zoneHeadingClass}>{t("recordForm.tasteHeading")}</span>
          <TasteRadarInput
            axes={radarAxes}
            onChangeAxis={setValue}
            disabled={isSubmitting}
            accentHex={originMoodHex}
            className="max-w-[240px] sm:max-w-[260px]"
          />
        </div>
      </div>

      {/* ── 必須のクイック行 ─────────────────────────── */}
      <div className="flex flex-wrap gap-6">
        <FormField id="consumedAt" label={t("recordForm.consumedAt")} required error={errors.consumedAt}>
          <input
            id="consumedAt"
            type="datetime-local"
            value={values.consumedAt}
            onChange={(event) => setValue("consumedAt", event.target.value)}
            onBlur={() => validateField("consumedAt")}
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
                className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-center text-sm transition-colors duration-150 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50 ${
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
      </div>

      {/* ── コーヒーの詳細（任意項目、ボタン化） ───────────── */}
      <div className="flex flex-col gap-3 border-t border-dashed border-line/60 pt-6">
        <span className={zoneHeadingClass}>{t("records.detailsHeading")}</span>

        {masterDataError && (
          <p className="rounded-lg border border-warn/40 bg-warn/10 px-3 py-2 text-xs text-warn">
            {t("recordForm.masterDataError")}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <PropertyButton
            icon={flavorVisual.icon}
            label={t("recordForm.flavor")}
            hasValue={values.flavorIds.length > 0}
            valueLabel={
              values.flavorIds.length > 0
                ? t("recordForm.selectedCount", { count: values.flavorIds.length })
                : t("common.notSelected")
            }
            disabled={isSubmitting || isMasterDataLoading}
          >
            <FormField id="flavorIds" label={t("recordForm.flavor")} hint={t("recordForm.multiSelectHint")}>
              <TagCombo
                id="flavorIds"
                type="flavor"
                options={masterData.flavors}
                selectedIds={values.flavorIds}
                onToggle={(optionId) => toggleValue("flavorIds", optionId)}
                disabled={isSubmitting}
              />
            </FormField>
          </PropertyButton>

          <PropertyButton
            icon={farmVisual.icon}
            label={t("recordForm.farmName")}
            hasValue={Boolean(primaryComponent.farmName)}
            valueLabel={primaryComponent.farmName || t("common.notSelected")}
            disabled={isSubmitting}
          >
            <FormField id="component-primary-farmName" label={t("recordForm.farmName")} hint={t("recordForm.farmNameHint")}>
              <input
                id="component-primary-farmName"
                type="text"
                value={primaryComponent.farmName}
                onChange={(event) => setPrimaryComponentValue("farmName", event.target.value)}
                placeholder={t("recordForm.farmNamePlaceholder")}
                maxLength={120}
                disabled={isSubmitting}
                className={`${controlClass(false)} w-56`}
              />
            </FormField>
          </PropertyButton>

          <PropertyButton
            icon={varietyVisual.icon}
            label={t("recordForm.variety")}
            hasValue={primaryVarietyNames.length > 0}
            valueLabel={primaryVarietyNames.length > 0 ? primaryVarietyNames.join(", ") : t("common.notSelected")}
            disabled={isSubmitting || isMasterDataLoading}
          >
            <FormField id="component-primary-varietyIds" label={t("recordForm.variety")} hint={t("recordForm.multiSelectHint")}>
              <TagCombo
                id="component-primary-varietyIds"
                type="variety"
                options={masterData.varieties}
                selectedIds={primaryComponent.varietyIds}
                onToggle={togglePrimaryComponentVariety}
                disabled={isSubmitting}
              />
            </FormField>
          </PropertyButton>

          <PropertyButton
            icon={processVisual.icon}
            label={t("recordForm.process")}
            hasValue={Boolean(primaryProcessName)}
            valueLabel={primaryProcessName || t("common.notSelected")}
            disabled={isSubmitting || isMasterDataLoading}
          >
            <FormField id="component-primary-processId" label={t("recordForm.process")}>
              <select
                id="component-primary-processId"
                value={primaryComponent.processId}
                onChange={(event) => setPrimaryComponentValue("processId", event.target.value)}
                disabled={isSubmitting || isMasterDataLoading}
                className={`${controlClass(false)} w-48`}
              >
                <option value="">{t("common.notSelected")}</option>
                {masterData.processes.map((process) => (
                  <option key={process.id} value={process.id}>
                    {process.name}
                  </option>
                ))}
              </select>
            </FormField>
          </PropertyButton>

          <PropertyButton
            icon={roastVisual.icon}
            label={t("recordForm.roastLevel")}
            hasValue={Boolean(roastLevelName)}
            valueLabel={roastLevelName || t("common.notSelected")}
            disabled={isSubmitting || isMasterDataLoading}
          >
            <FormField id="roastLevelId" label={t("recordForm.roastLevel")} error={errors.roastLevelId}>
              <select
                id="roastLevelId"
                value={values.roastLevelId}
                onChange={(event) => setValue("roastLevelId", event.target.value)}
                disabled={isSubmitting || isMasterDataLoading}
                className={`${controlClass(errors.roastLevelId)} w-48`}
              >
                <option value="">{t("common.notSelected")}</option>
                {masterData.roastLevels.map((roastLevel) => (
                  <option key={roastLevel.id} value={roastLevel.id}>
                    {roastLevel.name}
                  </option>
                ))}
              </select>
            </FormField>
          </PropertyButton>

          <PropertyButton
            icon={Building2}
            label={t("recordForm.roasterName")}
            hasValue={Boolean(values.roasterName)}
            valueLabel={values.roasterName || t("common.notSelected")}
            disabled={isSubmitting}
          >
            <FormField id="roasterName" label={t("recordForm.roasterName")} error={errors.roasterName}>
              <input
                id="roasterName"
                type="text"
                value={values.roasterName}
                onChange={(event) => setValue("roasterName", event.target.value)}
                placeholder={t("recordForm.roasterNamePlaceholder")}
                maxLength={120}
                disabled={isSubmitting}
                className={`${controlClass(errors.roasterName)} w-56`}
              />
            </FormField>
          </PropertyButton>

          {isCafe && (
            <PropertyButton
              icon={Store}
              label={t("recordForm.cafeName")}
              hasValue={Boolean(values.cafeName)}
              valueLabel={values.cafeName || t("common.notSelected")}
              disabled={isSubmitting}
            >
              <FormField id="cafeName" label={t("recordForm.cafeName")} error={errors.cafeName}>
                <input
                  id="cafeName"
                  type="text"
                  value={values.cafeName}
                  onChange={(event) => setValue("cafeName", event.target.value)}
                  placeholder={t("recordForm.cafeNamePlaceholder")}
                  maxLength={120}
                  disabled={isSubmitting}
                  className={`${controlClass(errors.cafeName)} w-56`}
                />
              </FormField>
            </PropertyButton>
          )}

          <PropertyButton
            icon={StickyNote}
            label={t("recordForm.notes")}
            hasValue={Boolean(values.notes)}
            valueLabel={values.notes ? values.notes.slice(0, 12) + (values.notes.length > 12 ? "…" : "") : t("common.notSelected")}
            disabled={isSubmitting}
          >
            <FormField id="notes" label={t("recordForm.notes")} error={errors.notes}>
              <textarea
                id="notes"
                value={values.notes}
                onChange={(event) => setValue("notes", event.target.value)}
                placeholder={t("recordForm.notesPlaceholder")}
                maxLength={2000}
                disabled={isSubmitting}
                className={`${textareaClass(errors.notes)} w-64`}
              />
              <p className="mt-1 text-right text-xs text-text-tertiary">{values.notes.length} / 2000</p>
            </FormField>
          </PropertyButton>
        </div>

        {blendComponents.map((component, blendIndex) => {
          const actualIndex = blendIndex + 1;
          return (
            <CoffeeComponentFields
              key={actualIndex}
              headingIndex={actualIndex}
              value={component}
              onChange={(field, value) => setComponentValue(actualIndex, field, value)}
              onToggleVariety={(optionId) => toggleComponentValue(actualIndex, "varietyIds", optionId)}
              onRemove={() => removeComponent(actualIndex)}
              masterData={masterData}
              isMasterDataLoading={isMasterDataLoading}
              isSubmitting={isSubmitting}
            />
          );
        })}

        <button
          type="button"
          onClick={handleAddBlend}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center gap-1.5 self-start rounded-xl border border-dashed border-line/60 px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors duration-150 hover:border-line hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Plus size={16} aria-hidden="true" />
          {t("recordForm.addComponent")}
        </button>
      </div>

      {/* ── 実務の帯（評価・保存） ───────────────────────── */}
      <div className="flex flex-col-reverse gap-4 border-t border-dashed border-line/60 pt-6 sm:flex-row sm:items-end sm:justify-between">
        <FormField id="rating" label={t("common.rating")} error={errors.rating}>
          <RatingInput
            id="rating"
            value={values.rating}
            onChange={(next) => setValue("rating", next)}
            disabled={isSubmitting}
          />
        </FormField>

        <Motion.button
          type="submit"
          disabled={isSubmitting}
          animate={{
            boxShadow:
              isSubmitting || isJustSaved
                ? "0 8px 24px rgba(0, 0, 0, 0.35)"
                : `0 ${4 + completeness * 10}px ${14 + completeness * 22}px rgba(0, 0, 0, ${(0.18 + completeness * 0.17).toFixed(2)})`,
          }}
          transition={{ type: "spring", stiffness: 220, damping: 26 }}
          whileHover={!isSubmitting ? { scale: 1.04, y: -2 } : undefined}
          whileTap={!isSubmitting ? { scale: 0.95 } : undefined}
          className={`${primaryButtonClass} sm:self-end`}
        >
          {isJustSaved ? (
            <PourIcon />
          ) : (
            isSubmitting && <CoffeeLoader size="sm" />
          )}
          {isJustSaved ? t("common.saved") : isSubmitting ? t("common.saving") : submitLabel}
        </Motion.button>
      </div>

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

      <div className="flex justify-end">
        <button type="button" onClick={onCancel} disabled={isSubmitting} className={secondaryButtonClass}>
          {t("common.cancel")}
        </button>
      </div>
    </form>
  );
}

export default RecordForm;
