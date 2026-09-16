import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import FormField from "./FormField";
import TagCombo from "./TagCombo";
import OriginBadgePicker from "./OriginBadgePicker";
import AttributeLabel from "./AttributeLabel";
import { controlClass } from "./formStyles";

/**
 * ブレンド用「コーヒーの詳細」1グループぶんの入力欄
 * （産地・農園・品種・精製方法）。「＋ブレンドを追加」で2グループ目
 * 以降が増えるたびに描画される。
 *
 * 2026-09、「コーヒーキャンバス」の作り直しで、1グループ目
 * （`values.components[0]`）はRecordForm.jsxが個別のプロパティ
 * ボタン（産地は大きなバッジ、農園・品種・精製方法は小さいボタン）へ
 * 直接展開するようになったため、このコンポーネントは2グループ目以降
 * （ブレンド）専用になった。1グループぶんをまとめて1枚のカードとして
 * 見せる（ブレンドの各豆が別の産地・精製方法から届くことがあるため、
 * 「どの産地がどの精製方法と対応するか」を対応関係ごと1枚にまとめて
 * 保つ。docs/domain-model.md参照）。
 *
 * 産地バッジは`onCommit`（保存前の発見プレビュー、RecordForm.jsxの
 * 主役の産地バッジだけが持つ演出）を繋がない。ブレンドは稀なケースで
 * あり、発見プレビューの主目的（「最初の1杯を選ぶ瞬間の後押し」）からも
 * 外れるための意図的な省略（docs/features.md「Save Discoveries」参照。
 * 保存時の発見自体はブレンドの産地も含めて通常どおり計算される）。
 *
 * 品種は選択肢が13件あるため、TagCombo.jsx（検索式タグ入力）を使う
 * （ChipMultiSelectの全チップ表示だと、カードの中でも縦に長くなり
 * 過ぎるため）。
 */
function CoffeeComponentFields({
  headingIndex,
  value,
  onChange,
  onToggleVariety,
  onRemove,
  masterData,
  isMasterDataLoading,
  isSubmitting,
}) {
  const { t } = useTranslation();
  const idPrefix = `component-${headingIndex}`;

  return (
    <div className="rounded-xl border border-line/60 bg-surface-1 p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {t("recordForm.componentHeading", { index: headingIndex + 1 })}
        </span>
        <button
          type="button"
          onClick={onRemove}
          disabled={isSubmitting}
          aria-label={t("common.delete")}
          className="rounded-full p-1 text-text-tertiary transition-colors duration-150 hover:bg-surface-2 hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col gap-4">
        <FormField id={`${idPrefix}-originId`} label={<AttributeLabel type="origin">{t("recordForm.origin")}</AttributeLabel>}>
          <OriginBadgePicker
            id={`${idPrefix}-originId`}
            options={masterData.origins}
            selectedId={value.originId}
            onChange={(optionId) => onChange("originId", optionId)}
            disabled={isSubmitting || isMasterDataLoading}
          />
        </FormField>

        <FormField
          id={`${idPrefix}-farmName`}
          label={<AttributeLabel type="farm">{t("recordForm.farmName")}</AttributeLabel>}
          hint={t("recordForm.farmNameHint")}
        >
          <input
            id={`${idPrefix}-farmName`}
            type="text"
            value={value.farmName}
            onChange={(event) => onChange("farmName", event.target.value)}
            placeholder={t("recordForm.farmNamePlaceholder")}
            maxLength={120}
            disabled={isSubmitting}
            className={controlClass(false)}
          />
        </FormField>

        <FormField
          id={`${idPrefix}-varietyIds`}
          label={<AttributeLabel type="variety">{t("recordForm.variety")}</AttributeLabel>}
          hint={t("recordForm.multiSelectHint")}
        >
          <TagCombo
            id={`${idPrefix}-varietyIds`}
            options={masterData.varieties}
            selectedIds={value.varietyIds}
            onToggle={onToggleVariety}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id={`${idPrefix}-processId`} label={<AttributeLabel type="process">{t("recordForm.process")}</AttributeLabel>}>
          <select
            id={`${idPrefix}-processId`}
            value={value.processId}
            onChange={(event) => onChange("processId", event.target.value)}
            disabled={isSubmitting || isMasterDataLoading}
            className={controlClass(false)}
          >
            <option value="">{t("common.notSelected")}</option>
            {masterData.processes.map((process) => (
              <option key={process.id} value={process.id}>
                {process.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    </div>
  );
}

export default CoffeeComponentFields;
