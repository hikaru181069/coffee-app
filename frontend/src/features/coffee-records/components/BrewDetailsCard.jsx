import { useState } from "react";
import { Loader2, Pencil, Timer } from "lucide-react";
import { useTranslation } from "react-i18next";

import EmptyState from "../../../components/EmptyState";
import FormField from "./FormField";
import PourScheduleEditor from "./PourScheduleEditor";
import { cardClass, controlClass, primaryButtonClass, secondaryButtonClass } from "./formStyles";
import { updateCoffeeRecord } from "../api/coffeeRecordApi";
import {
  validateBrewDetails,
  hasErrors,
  toBrewApiPayload,
  secondsToMinutesSecondsStrings,
} from "../validation/brewDetailsValidation";
import { getErrorMessage } from "../../../utils/errorMessage";

/** APIのレコードから、このカードが扱う4項目だけを取り出す */
const extractBrewData = (record) => ({
  doseWeight: record?.doseWeight ?? null,
  waterWeight: record?.waterWeight ?? null,
  brewTimeSeconds: record?.brewTimeSeconds ?? null,
  pours: record?.pours ?? [],
});

/**
 * 表示用の値（数値・配列）を、編集フォーム用の文字列ベースの値へ変換する。
 * 抽出時間・注湯の経過時間は「分」「秒」の2欄に分けて編集する
 * （合計秒数を直接入力させるより直感的なため。ユーザー指摘で追加）
 */
const toFormValues = (brewData) => {
  const brewTime = secondsToMinutesSecondsStrings(brewData.brewTimeSeconds);
  return {
    doseWeight: brewData.doseWeight === null ? "" : String(brewData.doseWeight),
    waterWeight: brewData.waterWeight === null ? "" : String(brewData.waterWeight),
    brewTimeMinutes: brewTime.minutes,
    brewTimeSecondsPart: brewTime.seconds,
    pours: brewData.pours.map((pour) => {
      const elapsed = secondsToMinutesSecondsStrings(pour.elapsedSeconds);
      return {
        elapsedMinutes: elapsed.minutes,
        elapsedSecondsPart: elapsed.seconds,
        cumulativeWaterWeight: String(pour.cumulativeWaterWeight),
      };
    }),
  };
};

const formatSeconds = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

// 抽出時間は「分」「秒」の2欄に分かれているが、エラーは合計秒数として
// 1つのキー（brewTimeSeconds）にまとめて出す（PourScheduleEditorのpours
// と同じ、行/欄ごとの個別エラーは持たない方針）
const BREW_TIME_ERROR_KEY_MAP = { brewTimeMinutes: "brewTimeSeconds", brewTimeSecondsPart: "brewTimeSeconds" };

/**
 * 記録詳細ページの独立カード。粉量・湯量・抽出時間・注湯記録
 * （抽出の詳細）を表示・インライン編集する。
 *
 * 記録編集フォーム（RecordForm.jsx）とは意図的に切り離している。
 * レシオ関連の情報は「豆そのものの情報」とは性質が異なるという判断
 * （docs/domain-model.md「抽出の詳細」参照）。保存は既存のPATCH
 * （coffeeRecordApi.jsのupdateCoffeeRecord）をそのまま使い、新しい
 * APIエンドポイントは作らない。ページ全体のreload()は呼ばず、
 * このカード自身の表示状態だけを更新する（他のセクションはこの
 * フィールドを参照しないため）。
 */
function BrewDetailsCard({ record }) {
  const { t } = useTranslation();

  // recordが後から差し替わる（親の再取得等）場合に追従する。
  // useRecordForm.jsのsyncedRecordと同じ「レンダリング中に前回値と
  // 比較する」パターン
  const [syncedRecord, setSyncedRecord] = useState(record);
  const [brewData, setBrewData] = useState(() => extractBrewData(record));
  if (record !== syncedRecord) {
    setSyncedRecord(record);
    setBrewData(extractBrewData(record));
  }

  const [isEditing, setIsEditing] = useState(false);
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasBrewData =
    brewData.doseWeight !== null ||
    brewData.waterWeight !== null ||
    brewData.brewTimeSeconds !== null ||
    brewData.pours.length > 0;

  const ratio =
    brewData.doseWeight && brewData.waterWeight ? (brewData.waterWeight / brewData.doseWeight).toFixed(1) : null;

  const startEditing = () => {
    setValues(toFormValues(brewData));
    setErrors({});
    setSubmitError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setValues(null);
    setErrors({});
    setSubmitError(null);
  };

  const setField = (field, value) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    const errorKey = BREW_TIME_ERROR_KEY_MAP[field] ?? field;
    setErrors((prev) => {
      if (!prev[errorKey]) return prev;
      const next = { ...prev };
      delete next[errorKey];
      return next;
    });
  };

  const changeRow = (index, key, value) => {
    setValues((prev) => ({
      ...prev,
      pours: prev.pours.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    }));
    setErrors((prev) => {
      if (!prev.pours) return prev;
      const next = { ...prev };
      delete next.pours;
      return next;
    });
  };

  const addRow = () => {
    setValues((prev) => ({
      ...prev,
      pours: [...prev.pours, { elapsedMinutes: "", elapsedSecondsPart: "", cumulativeWaterWeight: "" }],
    }));
  };

  const removeRow = (index) => {
    setValues((prev) => ({ ...prev, pours: prev.pours.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    const validationErrors = validateBrewDetails(values, t);
    if (hasErrors(validationErrors)) {
      setErrors(validationErrors);
      setSubmitError(null);
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setErrors({});

    try {
      const updated = await updateCoffeeRecord(record.id, toBrewApiPayload(values));
      setBrewData(extractBrewData(updated));
      setIsEditing(false);
      setValues(null);
    } catch (caught) {
      const fieldErrors = caught.fieldErrors ?? {};
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
      }
      setSubmitError(caught);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-text">{t("records.brewDetailsHeading")}</h2>
        {!isEditing && hasBrewData && (
          <button
            type="button"
            onClick={startEditing}
            className="inline-flex items-center gap-1 text-xs text-text-tertiary transition-colors duration-150 hover:text-text"
          >
            <Pencil size={12} aria-hidden="true" />
            <span className="underline underline-offset-2">{t("common.edit")}</span>
          </button>
        )}
      </div>

      {!isEditing && !hasBrewData && (
        <div className="mt-4">
          <EmptyState
            icon={Timer}
            title={t("records.brewDetailsEmptyTitle")}
            action={
              <button type="button" onClick={startEditing} className={`${primaryButtonClass} mt-1`}>
                {t("records.brewDetailsEmptyCta")}
              </button>
            }
          />
        </div>
      )}

      {!isEditing && hasBrewData && (
        <div className="mt-4 flex flex-col gap-4">
          <dl className="flex flex-wrap gap-x-8 gap-y-3">
            {brewData.doseWeight !== null && (
              <div>
                <dt className="text-xs text-text-tertiary">{t("records.brewDetailsDoseLabel")}</dt>
                <dd className="font-mono text-sm text-text">{brewData.doseWeight}</dd>
              </div>
            )}
            {brewData.waterWeight !== null && (
              <div>
                <dt className="text-xs text-text-tertiary">{t("records.brewDetailsWaterLabel")}</dt>
                <dd className="font-mono text-sm text-text">{brewData.waterWeight}</dd>
              </div>
            )}
            {ratio && (
              <div>
                <dt className="text-xs text-text-tertiary">{t("records.brewDetailsRatioLabel")}</dt>
                <dd className="font-mono text-sm text-text">1 : {ratio}</dd>
              </div>
            )}
            {brewData.brewTimeSeconds !== null && (
              <div>
                <dt className="text-xs text-text-tertiary">{t("records.brewDetailsTimeLabel")}</dt>
                <dd className="font-mono text-sm text-text">{formatSeconds(brewData.brewTimeSeconds)}</dd>
              </div>
            )}
          </dl>

          {brewData.pours.length > 0 && (
            <div>
              <span className="block text-xs font-semibold text-text-tertiary">
                {t("records.brewDetailsPoursHeading")}
              </span>
              <ul className="mt-2 flex flex-col gap-1">
                {brewData.pours.map((pour, index) => (
                  <li key={index} className="font-mono text-sm text-text-secondary">
                    {formatSeconds(pour.elapsedSeconds)} – {pour.cumulativeWaterWeight}g
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {isEditing && (
        <form onSubmit={handleSubmit} noValidate className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField id="doseWeight" label={t("records.brewDetailsDoseLabel")} error={errors.doseWeight}>
              <input
                id="doseWeight"
                type="number"
                inputMode="decimal"
                min="0"
                value={values.doseWeight}
                onChange={(event) => setField("doseWeight", event.target.value)}
                disabled={isSubmitting}
                className={controlClass(errors.doseWeight)}
              />
            </FormField>
            <FormField id="waterWeight" label={t("records.brewDetailsWaterLabel")} error={errors.waterWeight}>
              <input
                id="waterWeight"
                type="number"
                inputMode="decimal"
                min="0"
                value={values.waterWeight}
                onChange={(event) => setField("waterWeight", event.target.value)}
                disabled={isSubmitting}
                className={controlClass(errors.waterWeight)}
              />
            </FormField>
            <FormField
              id="brewTimeMinutes"
              label={t("records.brewDetailsTimeLabel")}
              error={errors.brewTimeSeconds}
            >
              <div className="flex items-center gap-1">
                <input
                  id="brewTimeMinutes"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={values.brewTimeMinutes}
                  onChange={(event) => setField("brewTimeMinutes", event.target.value)}
                  disabled={isSubmitting}
                  aria-label={t("records.brewDetailsMinutesLabel")}
                  className={controlClass(errors.brewTimeSeconds)}
                />
                <span aria-hidden="true" className="text-text-tertiary">
                  :
                </span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  max="59"
                  value={values.brewTimeSecondsPart}
                  onChange={(event) => setField("brewTimeSecondsPart", event.target.value)}
                  disabled={isSubmitting}
                  aria-label={t("records.brewDetailsSecondsLabel")}
                  className={controlClass(errors.brewTimeSeconds)}
                />
              </div>
            </FormField>
          </div>

          <FormField id="pours" label={t("records.brewDetailsPoursHeading")} error={errors.pours}>
            <PourScheduleEditor
              rows={values.pours}
              onChangeRow={changeRow}
              onAddRow={addRow}
              onRemoveRow={removeRow}
              disabled={isSubmitting}
            />
          </FormField>

          {submitError && (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {getErrorMessage(submitError, t)}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isSubmitting}
              className={secondaryButtonClass}
            >
              {t("common.cancel")}
            </button>
            <button type="submit" disabled={isSubmitting} className={primaryButtonClass}>
              {isSubmitting && <Loader2 size={16} aria-hidden="true" className="animate-spin" />}
              {isSubmitting ? t("common.saving") : t("records.brewDetailsSave")}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

export default BrewDetailsCard;
