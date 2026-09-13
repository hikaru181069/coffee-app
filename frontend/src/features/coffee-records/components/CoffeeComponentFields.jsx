import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import FormField from "./FormField";
import ChipMultiSelect from "./ChipMultiSelect";
import { controlClass } from "./formStyles";

/**
 * 「コーヒーの詳細」1グループぶんの入力欄（産地・農園・品種・精製方法）。
 *
 * 2026-09、ブレンドコーヒー対応で新設。RecordForm.jsxから
 * `values.components`の要素ごとに繰り返し描画される。産地・精製方法は
 * 実際の豆のロット単位で1つに決まる（1グループにつき1つ、`<select>`）が、
 * 品種だけは同じロットに複数の品種が混在することがあるため複数選択
 * （ChipMultiSelect）のままにしている。焙煎度・フレーバー・味覚グラフ等、
 * 「カップとしての結果」を表す項目はRecordForm.jsx側に残る
 * （docs/domain-model.md参照）。
 *
 * サーバー側のバリデーションエラー（`components.0.originId`のような
 * インデックス付きキー）はこのコンポーネントの個別の欄へは割り当てず、
 * RecordForm.jsxの汎用エラーバナーに任せている。産地・精製方法は
 * セレクト、品種はChipMultiSelectから選ぶため、実際のユーザー操作からは
 * 不正な値が来ない想定（poursの検証と同じ考え方）。
 */
function CoffeeComponentFields({
  index,
  value,
  onChange,
  onToggleVariety,
  onRemove,
  canRemove,
  masterData,
  isMasterDataLoading,
  isSubmitting,
}) {
  const { t } = useTranslation();
  const idPrefix = `component-${index}`;

  return (
    <div className="rounded-xl border border-line/60 bg-surface-1 p-4">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {t("recordForm.componentHeading", { index: index + 1 })}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            disabled={isSubmitting}
            aria-label={t("common.delete")}
            className="rounded-full p-1 text-text-tertiary transition-colors duration-150 hover:bg-surface-2 hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <X size={16} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <FormField id={`${idPrefix}-originId`} label={t("recordForm.origin")}>
          <select
            id={`${idPrefix}-originId`}
            value={value.originId}
            onChange={(event) => onChange("originId", event.target.value)}
            disabled={isSubmitting || isMasterDataLoading}
            className={controlClass(false)}
          >
            <option value="">{t("common.notSelected")}</option>
            {masterData.origins.map((origin) => (
              <option key={origin.id} value={origin.id}>
                {origin.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id={`${idPrefix}-farmName`} label={t("recordForm.farmName")} hint={t("recordForm.farmNameHint")}>
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

        <FormField id={`${idPrefix}-varietyIds`} label={t("recordForm.variety")} hint={t("recordForm.multiSelectHint")}>
          <ChipMultiSelect
            id={`${idPrefix}-varietyIds`}
            options={masterData.varieties}
            selectedIds={value.varietyIds}
            onToggle={onToggleVariety}
            disabled={isSubmitting}
          />
        </FormField>

        <FormField id={`${idPrefix}-processId`} label={t("recordForm.process")}>
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
