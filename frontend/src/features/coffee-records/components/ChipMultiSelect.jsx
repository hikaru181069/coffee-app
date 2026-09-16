import { Check } from "lucide-react";
import { motion } from "framer-motion";
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
 *
 * 2026-09、記録体験の再設計（第3弾）。`vivid`（既定false）を渡すと
 * Framer Motionのバネでホバー・押下時に浮き上がる演出が付く。既定は
 * 今まで通り（`RecordFilters.jsx`の絞り込みチップは`vivid`を渡さないため
 * 見た目・挙動とも変わらない）。記録フォーム側（RecordForm.jsx・
 * CoffeeComponentFields.jsx）からの呼び出しだけ`vivid`を付ける。
 */
function ChipMultiSelect({ id, options, selectedIds, onToggle, disabled = false, emptyMessage, vivid = false }) {
  const { t } = useTranslation();
  if (options.length === 0) {
    return <p className="text-sm text-text-tertiary">{emptyMessage ?? t("common.noOptions")}</p>;
  }

  const Chip = vivid ? motion.label : "label";
  const hoverMotionProps =
    vivid && !disabled
      ? {
          whileHover: { y: -2, scale: 1.05 },
          whileTap: { scale: 0.95 },
          transition: { type: "spring", stiffness: 500, damping: 22 },
        }
      : {};

  return (
    <div id={id} className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selectedIds.includes(option.id);

        return (
          <Chip
            key={option.id}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-primary/50 ${
              isSelected
                ? "border-line-strong bg-surface-2 text-text"
                : "border-line/60 text-text-secondary hover:border-line hover:text-text"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
            {...hoverMotionProps}
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
          </Chip>
        );
      })}
    </div>
  );
}

export default ChipMultiSelect;
