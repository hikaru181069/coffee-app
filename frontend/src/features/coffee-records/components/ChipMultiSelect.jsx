import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 複数選択をチップ（タグ）で行う入力。品種とフレーバーで使う。
 *
 * <select multiple> を使わない理由:
 *   - モバイルで極端に操作しづらい（Ctrl+クリックが必要な環境がある）
 *   - 今何が選ばれているか一覧しづらい
 *   - フレーバーは30件あり、スクロールする箱の中では選びにくい
 *
 * 実体はチェックボックスにしている。見た目をボタン風にしても、
 * キーボード操作と支援技術への伝わり方は標準のまま保てる。
 */
function ChipMultiSelect({ id, options, selectedIds, onToggle, disabled = false, emptyMessage }) {
  const { t } = useTranslation();
  if (options.length === 0) {
    return <p className="text-sm text-text-tertiary">{emptyMessage ?? t("common.noOptions")}</p>;
  }

  return (
    <div id={id} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selectedIds.includes(option.id);

        return (
          <label
            key={option.id}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-primary/50 ${
              isSelected
                ? "border-primary bg-primary/15 text-text"
                : "border-line/60 text-text-secondary hover:border-line hover:text-text"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(option.id)}
              disabled={disabled}
              className="sr-only"
            />
            {/* 選択済みはチェックマークでも示す（色だけで区別しない） */}
            {isSelected && <Check size={14} aria-hidden="true" strokeWidth={2.5} />}
            {option.name}
          </label>
        );
      })}
    </div>
  );
}

export default ChipMultiSelect;
