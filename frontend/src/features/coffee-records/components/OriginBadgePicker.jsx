import { motion as Motion } from "framer-motion";
import { useTranslation } from "react-i18next";

import { getOriginHex } from "../utils/originAccent";

/**
 * 産地の単一選択を、円形バッジ（国コード+産地ごとの色）で行う入力。
 *
 * 2026-09、「コーヒーキャンバス」（記録体験の再設計・作り直し）で
 * OriginPicker.jsx（チップ選択）を置き換えた。選んだ産地の色は
 * `getOriginHex`（産地ごとに手動で決め打ちした対応表、記録カード・
 * グラフ・世界地図と共通）をそのまま使い、キャンバス専用の新しい色は
 * 増やさない。
 *
 * バッジの国コードだけでは判別しづらいため、産地名は常にバッジの下へ
 * 表示する（モックアップではホバー時のみ表示していたが、ホバーの
 * 無いタッチ端末では産地名が読めなくなってしまうため、本実装では
 * 常時表示にした）。
 *
 * onCommitはクリック／Enter・Spaceでの決定だけを拾う（OriginPicker.jsx
 * と同じ設計）。矢印キーによるラジオグループ内の選択肢移動は`change`の
 * みを発火し`click`は発火しないため、キーボードでの選択肢間ナビゲーション
 * を妨げずに済む。OriginPicker.jsxにあった「label要素へonClickを
 * 付けると、ラベルの実クリックとinputへの合成クリックで二重発火する」
 * バグを避けるため、onClickは<input>要素自体へ付ける。
 */
function OriginBadgePicker({ id, options, selectedId, onChange, onCommit, disabled = false }) {
  const { t } = useTranslation();

  if (options.length === 0) {
    return <p className="text-sm text-text-tertiary">{t("common.noOptions")}</p>;
  }

  const hoverMotionProps = disabled
    ? {}
    : {
        whileHover: { y: -3, scale: 1.08 },
        whileTap: { scale: 0.94 },
        transition: { type: "spring", stiffness: 500, damping: 22 },
      };

  return (
    <div className="flex flex-col gap-2">
      <div id={id} role="radiogroup" className="flex flex-wrap gap-x-3 gap-y-4">
        {options.map((option) => {
          const isSelected = selectedId === option.id;
          const hex = getOriginHex(option.name);
          const glyph = (option.countryCode || option.name.slice(0, 2)).toUpperCase();

          return (
            <label
              key={option.id}
              className={`flex w-16 flex-col items-center gap-1.5 rounded-none p-1 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary/50 ${
                disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
              }`}
            >
              <input
                type="radio"
                name={id}
                checked={isSelected}
                onChange={() => onChange(option.id)}
                onClick={() => onCommit?.(option.id)}
                disabled={disabled}
                className="sr-only"
              />
              <Motion.span
                aria-hidden="true"
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full font-mono text-[10px] font-bold"
                style={{
                  backgroundColor: hex,
                  color: "#141414",
                  boxShadow: isSelected
                    ? `0 0 0 2px var(--color-base), 0 0 0 4px ${hex}, 0 10px 22px -8px ${hex}`
                    : "0 4px 10px -4px rgba(0, 0, 0, 0.5)",
                }}
                {...hoverMotionProps}
              >
                {glyph}
              </Motion.span>
              <span
                className={`text-center text-[11px] leading-tight ${
                  isSelected ? "font-semibold text-text" : "text-text-tertiary"
                }`}
              >
                {option.name}
              </span>
            </label>
          );
        })}
      </div>

      {selectedId && !disabled && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="self-start text-xs text-text-tertiary underline underline-offset-2 hover:text-text"
        >
          {t("common.clear")}
        </button>
      )}
    </div>
  );
}

export default OriginBadgePicker;
