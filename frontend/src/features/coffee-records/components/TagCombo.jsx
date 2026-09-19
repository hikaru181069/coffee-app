import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getNodeSolidBgClass, getNodeTextColorClass, getNodeTintBgClass } from "../../graph/utils/nodeColor";

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
 *
 * 2026-09、「デザイン・テーマの統一」レビューで、選択済みタグが
 * 記録カード・エンティティ詳細等と違い無色（`bg-surface-2`固定）の
 * ままだったことが分かった（ユーザーからの指摘、「records/newページが
 * 変更されていない」）。呼び出し側から`type`（ノード種別。現状
 * "flavor"/"variety"）を受け取り、`nodeColor.js`経由でRecordCard.jsxと
 * 同じ塗り（tint背景+文字色+個別色ドット）を選択済みタグへ適用する。
 * `type`未指定時（呼び出し側が対応していない場合）は従来の無色のまま
 * フォールバックする。
 */
function TagCombo({ id, options, selectedIds, onToggle, disabled = false, type = null }) {
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
          {selectedOptions.map((option) => {
            const colorClasses = type
              ? `${getNodeTintBgClass({ type, label: option.name })} ${getNodeTextColorClass({ type, label: option.name })}`
              : "bg-surface-2 text-text";
            return (
              <span
                key={option.id}
                className={`inline-flex items-center gap-1.5 rounded-none border border-line-strong py-1 pl-2.5 pr-1 text-xs font-medium ${colorClasses}`}
              >
                {type && (
                  <span
                    className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${getNodeSolidBgClass({ type, label: option.name })}`}
                    aria-hidden="true"
                  />
                )}
                {option.name}
                <button
                  type="button"
                  onClick={() => onToggle(option.id)}
                  disabled={disabled}
                  aria-label={t("common.delete")}
                  className="rounded-none p-0.5 opacity-70 transition-opacity duration-150 hover:bg-surface-3/60 hover:opacity-100 disabled:cursor-not-allowed"
                >
                  <X size={11} aria-hidden="true" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      <input
        type="text"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={t("common.searchPlaceholder")}
        disabled={disabled}
        className="w-full rounded-none border border-line bg-surface-1 px-2.5 py-1.5 text-sm text-text outline-none placeholder:text-text-tertiary focus:border-line-strong disabled:cursor-not-allowed disabled:opacity-60"
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
              className="rounded-none px-2.5 py-1.5 text-left text-sm text-text-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-text disabled:cursor-not-allowed disabled:opacity-60"
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
