import { useTranslation } from "react-i18next";

import { getOriginAccentClass } from "../utils/originAccent";

/**
 * 産地の単一選択をチップで行う入力。
 *
 * ChipMultiSelect.jsx（品種・フレーバー、複数選択）の兄弟コンポーネント。
 * 産地は「コーヒーの詳細」1グループにつき1つのため単一選択（radio）だが、
 * 見た目はChipMultiSelectと揃える。ネイティブ`<select>`をやめたのは、
 * `<option>`には信頼できる背景色スタイリング手段が無く、産地ごとの
 * アクセントカラー（`utils/originAccent.js`。記録カード・グラフ・世界地図
 * で既に使っている）を選択肢自体に反映できないため（2026-09、記録体験の
 * UI/UX再設計）。
 */
function OriginPicker({ id, options, selectedId, onChange, disabled = false }) {
  const { t } = useTranslation();

  if (options.length === 0) {
    return <p className="text-sm text-text-tertiary">{t("common.noOptions")}</p>;
  }

  const chipClass = (isSelected) =>
    `inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-primary/50 ${
      isSelected
        ? "border-line-strong bg-surface-2 text-text"
        : "border-line/60 text-text-secondary hover:border-line hover:text-text"
    } ${disabled ? "cursor-not-allowed opacity-60" : ""}`;

  return (
    <div id={id} role="radiogroup" className="flex flex-wrap gap-2">
      <label className={chipClass(!selectedId)}>
        <input
          type="radio"
          name={id}
          checked={!selectedId}
          onChange={() => onChange("")}
          disabled={disabled}
          className="sr-only"
        />
        {t("common.notSelected")}
      </label>
      {options.map((option) => {
        const isSelected = selectedId === option.id;

        return (
          <label key={option.id} className={chipClass(isSelected)}>
            <input
              type="radio"
              name={id}
              checked={isSelected}
              onChange={() => onChange(option.id)}
              disabled={disabled}
              className="sr-only"
            />
            {/* 産地ごとのアクセントカラー。記録カード・グラフ・世界地図と
                同じ対応表（getOriginAccentClass）を使うため、ここで選んだ色が
                そのまま保存後の記録カード等でも見える */}
            <span aria-hidden="true" className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${getOriginAccentClass(option.name)}`} />
            {option.name}
          </label>
        );
      })}
    </div>
  );
}

export default OriginPicker;
