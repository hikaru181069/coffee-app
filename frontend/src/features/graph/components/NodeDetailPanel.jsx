import { Link } from "react-router-dom";
import { Star, X } from "lucide-react";

import { getNodeVisual } from "../utils/nodeVisuals";
import { secondaryButtonClass } from "../../coffee-records/components/formStyles";
import { formatConsumedAtShort } from "../../coffee-records/utils/recordFormat";

/**
 * 選択中ノードのサイドパネル。
 *
 * docs/design.md「モバイルではグラフ詳細をbottom sheetまたは下部パネルに
 * する」に従い、デスクトップでは右側の固定パネル、モバイルでは画面下からの
 * bottom sheetにする。Tailwindのレスポンシブクラスだけで切り替え、
 * JSの分岐は持たない（features/coffee-records/components/ConfirmDialog.jsx
 * と同じ考え方）。
 *
 * ノードの種類で表示内容を分ける（docs/knowledge-graph.md の Interaction）:
 *   record ノード … 記録日・rating・notesの短い抜粋・詳細画面へのリンク
 *   属性ノード     … type・label・recordCount・関連記録一覧
 */
function NodeDetailPanel({ node, detail, isLoading, error, onClose }) {
  if (!node) return null;

  const visual = getNodeVisual(node.data.type);
  const Icon = visual.icon;

  return (
    <aside
      role="complementary"
      aria-label="選択中のノード"
      className="fixed inset-x-0 bottom-0 z-40 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-ctp-surface1 bg-ctp-mantle p-4 shadow-xl sm:absolute sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:top-0 sm:max-h-none sm:w-80 sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={18} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
          <div>
            <p className="text-xs text-ctp-subtext0">{visual.label}</p>
            <h2 className="text-sm font-semibold text-ctp-text">{node.data.label}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="閉じる"
          className="rounded p-1 text-ctp-subtext0 hover:bg-ctp-surface1 hover:text-ctp-text"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4">
        {isLoading && (
          <div className="flex flex-col gap-2" aria-busy="true">
            <div className="skeleton-block h-4 w-2/3 rounded" />
            <div className="skeleton-block h-4 w-1/2 rounded" />
          </div>
        )}

        {error && <p className="text-sm text-ctp-red">{error.message}</p>}

        {!isLoading && !error && detail?.kind === "record" && (
          <RecordNodeDetail record={detail.record} />
        )}

        {!isLoading && !error && detail?.kind === "attribute" && (
          <AttributeNodeDetail
            recordCount={node.data.metadata.recordCount}
            relatedRecords={detail.relatedRecords}
          />
        )}
      </div>
    </aside>
  );
}

/** recordノードを選んだときの中身 */
function RecordNodeDetail({ record }) {
  if (!record) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-ctp-subtext1">{formatConsumedAtShort(record.consumedAt)}</p>
      {record.rating !== null && (
        <p className="flex items-center gap-1 text-sm text-ctp-yellow">
          <Star size={14} aria-hidden="true" fill="currentColor" strokeWidth={0} />
          {record.rating} / 5
        </p>
      )}
      {record.notes && (
        <p className="line-clamp-3 text-sm text-ctp-subtext1">{record.notes}</p>
      )}
      <Link to={`/records/${record.id}`} className={`${secondaryButtonClass} mt-2`}>
        記録の詳細を見る
      </Link>
    </div>
  );
}

/** 属性ノード（産地・農園・品種・精製方法・焙煎度・フレーバー）を選んだときの中身 */
function AttributeNodeDetail({ recordCount, relatedRecords }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-ctp-subtext0">{recordCount} 件の記録で登場</p>

      <ul className="flex flex-col gap-2">
        {(relatedRecords ?? []).map((record) => (
          <li key={record.id}>
            <Link
              to={`/records/${record.id}`}
              className="block rounded-lg border border-ctp-surface1 px-3 py-2 transition-colors duration-150 hover:border-ctp-overlay0"
            >
              <p className="truncate text-sm font-medium text-ctp-text">{record.title}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-ctp-subtext0">
                <span>{formatConsumedAtShort(record.consumedAt)}</span>
                {record.rating !== null && (
                  <span className="flex items-center gap-0.5 text-ctp-yellow">
                    <Star size={10} aria-hidden="true" fill="currentColor" strokeWidth={0} />
                    {record.rating}
                  </span>
                )}
              </p>
              {record.notesExcerpt && (
                <p className="mt-1 truncate text-xs text-ctp-subtext1">{record.notesExcerpt}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NodeDetailPanel;
