import { Link } from "react-router-dom";

import { getNodeVisual } from "../../graph/utils/nodeVisuals";
import { computeRanks } from "../utils/rankings";
import { useReveal } from "../../../hooks/useReveal";
import { revealDelayClass } from "../../../utils/revealDelay";

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
  const ranks = computeRanks(items);

  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <Icon size={14} aria-hidden="true" className={visual.colorClass} />
        <h3 className="text-xs font-semibold text-text-tertiary">{t(visual.labelKey)}</h3>
      </div>
      <ul className="flex flex-col gap-0.5">
        {items.map((item, index) => (
          <RankingRow key={item.id} item={item} rank={ranks[index]} index={index} />
        ))}
      </ul>
    </div>
  );
}

/** ランキング1行分。スクロールインで段階的にカスケード表示する */
function RankingRow({ item, rank, index }) {
  const [ref, isVisible] = useReveal();

  return (
    <li ref={ref} className={`reveal ${isVisible ? "visible" : ""} ${revealDelayClass(index)}`}>
      <Link
        to={`/entities/${encodeURIComponent(item.id)}`}
        className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors duration-150 hover:bg-surface-1"
      >
        <span className="flex min-w-0 items-center gap-2 text-text">
          <span className="font-mono text-xs text-text-tertiary">{rank}</span>
          <span className="truncate">{item.label}</span>
        </span>
        <span className="flex-shrink-0 font-mono text-xs text-text-tertiary">{item.count}</span>
      </Link>
    </li>
  );
}

export default TopRankingList;
