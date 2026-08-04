import { Link } from "react-router-dom";

import { getNodeVisual } from "../../graph/utils/nodeVisuals";

/**
 * 産地・品種・精製方法・フレーバー・カフェ、いずれか1種別分の
 * 上位ランキング。項目はエンティティ詳細ページ（docs/entity-detail.md）
 * へのLinkにする（知識グラフをナビゲーションにする方針。
 * 検索結果・Insight・GraphのNodeDetailPanelと同じ考え方）。
 *
 * 該当種別の記録が1件も無ければ何も表示しない（空のランキングを
 * 並べて情報過多にしないため）。
 */
function TopRankingList({ type, items, t }) {
  if (items.length === 0) return null;

  const visual = getNodeVisual(type);
  const Icon = visual.icon;

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} aria-hidden="true" className={visual.colorClass} />
        <h3 className="text-xs font-semibold text-ctp-subtext0">{t(visual.labelKey)}</h3>
      </div>
      <ul className="flex flex-col gap-0.5">
        {items.map((item, index) => (
          <li key={item.id}>
            <Link
              to={`/entities/${encodeURIComponent(item.id)}`}
              className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-ctp-surface0"
            >
              <span className="flex min-w-0 items-center gap-2 text-ctp-text">
                <span className="font-mono text-xs text-ctp-subtext0">{index + 1}</span>
                <span className="truncate">{item.label}</span>
              </span>
              <span className="flex-shrink-0 font-mono text-xs text-ctp-subtext0">{item.count}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default TopRankingList;
