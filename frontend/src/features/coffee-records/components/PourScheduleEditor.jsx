import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { controlClass, secondaryButtonClass } from "./formStyles";

/**
 * 注湯記録（経過時間・累計湯量の行）を手動で追加/削除する入力。
 *
 * ChipMultiSelect.jsxと同様、外部ライブラリを使わない自前実装。
 * ライブタイマー（抽出中に計測しながら記録する方式）は将来のフェーズで、
 * まずは手動リスト入力から始める（BrewDetailsCard.jsx参照）。
 *
 * @param {Array<{elapsedSeconds: string, cumulativeWaterWeight: string}>} rows
 *   フォーム編集用の行。値は制御コンポーネントにするため文字列で持つ
 */
function PourScheduleEditor({ rows, onChangeRow, onAddRow, onRemoveRow, disabled = false }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-text-tertiary">{t("records.brewDetailsPoursHint")}</p>

      {rows.map((row, index) => (
        <div key={index} className="flex items-end gap-2">
          <label className="flex-1">
            <span className="mb-1 block text-xs text-text-tertiary">
              {t("records.brewDetailsElapsedLabel")}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={row.elapsedSeconds}
              onChange={(event) => onChangeRow(index, "elapsedSeconds", event.target.value)}
              disabled={disabled}
              className={controlClass(false)}
            />
          </label>
          <label className="flex-1">
            <span className="mb-1 block text-xs text-text-tertiary">
              {t("records.brewDetailsCumulativeWaterLabel")}
            </span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              value={row.cumulativeWaterWeight}
              onChange={(event) => onChangeRow(index, "cumulativeWaterWeight", event.target.value)}
              disabled={disabled}
              className={controlClass(false)}
            />
          </label>
          <button
            type="button"
            onClick={() => onRemoveRow(index)}
            disabled={disabled}
            aria-label={t("records.brewDetailsRemovePourAriaLabel", { index: index + 1 })}
            className={`${secondaryButtonClass} px-2.5`}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={onAddRow}
        disabled={disabled}
        className={`${secondaryButtonClass} self-start`}
      >
        {t("records.brewDetailsAddPourCta")}
      </button>
    </div>
  );
}

export default PourScheduleEditor;
