import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ATTRIBUTE_NODE_TYPES, getNodeVisual } from "../utils/nodeVisuals";

const MAX_RESULTS_PER_TYPE = 8;

/**
 * ノードが多いグラフで、目当てのノードを検索して選ぶための入力欄。
 *
 * 「ノードが多いと目当てのものを探しにくい」という指摘への対応
 * （2026-08）。新しいAPIは呼ばず、GraphPageが既に取得済みの
 * `graph.nodes`をクライアント側でラベル部分一致フィルタするだけ
 * （docs/database.mdの「グラフの二重管理を防ぐ」方針と同じく、
 * 検索専用のインデックスは持たない）。
 *
 * 対象はrecordノードを除いた属性ノードのみ。recordノードのラベルは
 * 記録タイトルで、こちらはRecords画面の横断検索（features/search）が
 * 既にカバーしている。ここでの狙いは「産地・フレーバーなど、記録を
 * 重ねるほど増えていく属性ノードを素早く見つける」ことなので、
 * 属性ノードに絞るほうがノイズが少ない。
 *
 * 色はPostCoffeeのようなグラデーションではなく、既存のCatppuccin
 * アクセントカラー（nodeVisuals.js）をそのまま流用したフラットな色。
 * 「静かな道具」路線を維持する判断（ユーザーと合意済み）。
 */
function GraphNodeSearch({ graph, onSelectNode }) {
  const { t } = useTranslation();
  const [query, setQuery] = useState("");
  const containerRef = useRef(null);

  // このアプリで初めての「浮くドロップダウン」UIのため、入力欄以外を
  // クリックしても開いたままにならないよう自前で外側クリックを検知する
  // （Records画面の横断検索は結果を全幅パネルで表示する形で、この問題が
  // そもそも存在しない）
  useEffect(() => {
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setQuery("");
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const trimmedQuery = query.trim().toLowerCase();

  const groupedResults = useMemo(() => {
    if (!trimmedQuery || !graph) return [];

    return ATTRIBUTE_NODE_TYPES.map((type) => {
      const nodes = graph.nodes
        .filter((node) => node.type === type && node.label.toLowerCase().includes(trimmedQuery))
        .slice(0, MAX_RESULTS_PER_TYPE);
      return { type, nodes };
    }).filter((group) => group.nodes.length > 0);
  }, [graph, trimmedQuery]);

  const hasNoResults = trimmedQuery.length > 0 && groupedResults.length === 0;

  const handleSelect = (node) => {
    onSelectNode(node);
    setQuery("");
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setQuery("");
          }}
          placeholder={t("graph.nodeSearchPlaceholder")}
          aria-label={t("graph.nodeSearchAriaLabel")}
          className="w-full rounded-lg border border-line/60 bg-surface-1 py-2 pl-9 pr-3 text-sm text-text placeholder:text-text-tertiary/60 transition-colors duration-150 hover:border-line focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {(groupedResults.length > 0 || hasNoResults) && (
        <div className="absolute inset-x-0 top-full z-10 mt-1.5 max-h-72 overflow-y-auto rounded-lg border border-line/60 bg-raised p-2 shadow-panel">
          {hasNoResults && (
            <p className="px-2 py-1.5 text-sm text-text-tertiary">
              {t("graph.nodeSearchNoResults", { query })}
            </p>
          )}

          {groupedResults.map(({ type, nodes }) => {
            const visual = getNodeVisual(type);
            const Icon = visual.icon;

            return (
              <div key={type} className="mb-2 last:mb-0">
                <p className="px-2 py-1 text-xs font-medium text-text-tertiary">{t(visual.labelKey)}</p>
                <div className="flex flex-wrap gap-1.5 px-2">
                  {nodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => handleSelect({ id: node.id, data: node })}
                      className="inline-flex items-center gap-1 rounded-full border border-line/40 px-2.5 py-1 text-xs text-text transition-colors duration-150 hover:border-line hover:bg-surface-2"
                    >
                      <Icon size={12} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
                      {node.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default GraphNodeSearch;
