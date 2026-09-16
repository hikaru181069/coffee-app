import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * 選択肢が多い項目（フレーバー41種・品種13種）向けの、検索式タグ入力。
 *
 * 2026-09、「コーヒーキャンバス」で使っていたChipMultiSelect（全選択肢を
 * チップとして並べる）だと、選択肢の総数ぶんポップオーバーが巨大化して
 * しまうという指摘を受けて追加した。表示の大きさが「選んだタグの数」で
 * 決まり、「選べる総数」には左右されないようにする（上に選択済みタグ、
 * 下に検索欄、入力にマッチする候補だけを最大6件表示。GitHubのラベル
 * 選択・Notionのマルチセレクトと同じ仕組み。Artifactモックアップ
 * 「Coffee Canvas v2」で検証済み）。
 *
 * ChipMultiSelect.jsxと同じ`{ id, options, selectedIds, onToggle }`の
 * 形を踏襲しているため、呼び出し側（RecordForm.jsx・
 * CoffeeComponentFields.jsx）は配線を変えずに差し替えられる。
 */
function TagCombo({ id, options, selectedIds, onToggle, disabled = false }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");

  const selectedOptions = selectedIds
    .map((selectedId) => options.find((option) => option.id === selectedId))
    .filter(Boolean);

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return options
      .filter((option) => !selectedIds.includes(option.id))
      .filter((option) => normalizedQuery === "" || option.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 6);
  }, [options, selectedIds, query]);

  return (
    <div id={id} className="flex w-64 flex-col gap-2">
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span
              key={option.id}
              className="inline-flex items-center gap-1 rounded-full border border-line-strong bg-surface-2 py-1 pl-2.5 pr-1 text-xs text-text"
            >
              {option.name}
              <button
                type="button"
                onClick={() => onToggle(option.id)}
                disabled={disabled}
                aria-label={t("common.delete")}
                className="rounded-full p-0.5 text-text-tertiary transition-colors duration-150 hover:bg-surface-3 hover:text-text disabled:cursor-not-allowed"
              >
                <X size={11} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("common.searchPlaceholder")}
        disabled={disabled}
        className="w-full rounded-lg border border-line bg-surface-1 px-2.5 py-1.5 text-sm text-text outline-none placeholder:text-text-tertiary focus:border-line-strong disabled:cursor-not-allowed disabled:opacity-60"
      />

      <div className="flex flex-col gap-0.5">
        {suggestions.length === 0 ? (
          <p className="px-2 py-1.5 text-xs text-text-tertiary">{t("common.noMatches")}</p>
        ) : (
          suggestions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onToggle(option.id)}
              disabled={disabled}
              className="rounded-lg px-2.5 py-1.5 text-left text-sm text-text-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
            >
              {option.name}
            </button>
          ))
        )}
      </div>
    </div>
  );
}

export default TagCombo;
