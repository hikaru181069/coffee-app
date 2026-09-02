import { useRef } from "react";
import { Link } from "react-router-dom";
import { Star, X } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { getNodeVisual } from "../utils/nodeVisuals";
import { getOriginTextClass } from "../../coffee-records/utils/originAccent";
import { secondaryButtonClass } from "../../coffee-records/components/formStyles";
import { formatConsumedAtShort } from "../../coffee-records/utils/recordFormat";
import { getErrorMessage } from "../../../utils/errorMessage";
import { useFocusTrap } from "../../../hooks/useFocusTrap";

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
  const { t, i18n } = useTranslation();
  const panelRef = useRef(null);

  // 2026-08、監査で発覚: Escapeで閉じる処理・開いたときのフォーカス移動が
  // 無かった（ConfirmDialog.jsxにはあった）。hooks/useFocusTrap.jsへ
  // 共通化したものをここでも使う。nodeがnullの間はhook内部で何もしない
  useFocusTrap(panelRef, Boolean(node), onClose);

  if (!node) return null;

  const visual = getNodeVisual(node.data.type);
  const Icon = visual.icon;
  // 産地ノードだけは種別共通の色ではなく、産地ごとの個別色
  // （originAccent.js。GraphCanvas.jsxのnodeColorと同じ考え方）を使う
  const iconColorClass = node.data.type === "origin" ? getOriginTextClass(node.data.label) : visual.colorClass;

  return (
    <aside
      ref={panelRef}
      aria-label={t("graph.selectedNodeAriaLabel")}
      // z-[60]: BottomTabBar（App.css `.bottom-tab-bar`）がz-50のため、モバイルの
      // bottom sheetがz-40のままだとDOM順で後に置かれるBottomTabBarに負け、
      // パネル下部の内容がタブバーの裏に隠れてしまう（ConfirmDialog.jsxと同じ
      // 既知の対処。ユーザー報告により発覚）
      className="fixed inset-x-0 bottom-0 z-[60] max-h-[70vh] overflow-y-auto rounded-t-2xl border-t border-surface-2 bg-raised/90 p-4 shadow-panel backdrop-blur-xl sm:absolute sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:top-0 sm:max-h-none sm:w-80 sm:rounded-none sm:rounded-l-2xl sm:border-l sm:border-t-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <Icon size={18} aria-hidden="true" className={iconColorClass} strokeWidth={1.75} />
          <div>
            <p className="text-xs text-text-tertiary">{t(visual.labelKey)}</p>
            <h2 className="text-sm font-semibold text-text">{node.data.label}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="rounded p-1 text-text-tertiary hover:bg-surface-2 hover:text-text"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4">
        {isLoading && <NodeDetailSkeleton isRecord={node.data.type === "record"} t={t} />}

        {error && <p className="text-sm text-danger">{getErrorMessage(error, t)}</p>}

        {!isLoading && !error && detail?.kind === "record" && (
          <RecordNodeDetail record={detail.record} language={i18n.language} t={t} />
        )}

        {!isLoading && !error && detail?.kind === "attribute" && (
          <AttributeNodeDetail
            nodeId={node.id}
            recordCount={node.data.metadata.recordCount}
            relatedRecords={detail.relatedRecords}
            language={i18n.language}
            t={t}
          />
        )}
      </div>
    </aside>
  );
}

/**
 * 読み込み中のパネル本体。選択したノードの種類（node.data.type）は
 * 選択した時点で既に分かっている（読み込み中なのはdetailだけ）ため、
 * RecordNodeDetail/AttributeNodeDetailの形に合わせて出し分ける。
 */
function NodeDetailSkeleton({ isRecord, t }) {
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-3">
      {isRecord ? (
        <>
          <div className="skeleton-block h-4 w-24 rounded" />
          <div className="skeleton-block h-4 w-20 rounded" />
          <div className="flex flex-col gap-1.5">
            <div className="skeleton-block h-3.5 w-full rounded" />
            <div className="skeleton-block h-3.5 w-full rounded" />
            <div className="skeleton-block h-3.5 w-2/3 rounded" />
          </div>
          <div className="skeleton-block mt-1 h-9 w-full rounded-lg" />
        </>
      ) : (
        <>
          <div className="skeleton-block h-4 w-32 rounded" />
          <div className="skeleton-block h-9 w-full rounded-lg" />
          <div className="skeleton-block h-14 w-full rounded-lg" />
          <div className="skeleton-block h-14 w-full rounded-lg" />
        </>
      )}
    </div>
  );
}

/** recordノードを選んだときの中身 */
function RecordNodeDetail({ record, language, t }) {
  if (!record) return null;

  return (
    <div className="flex flex-col gap-2">
      <p className="font-mono text-sm text-text-secondary">
        {formatConsumedAtShort(record.consumedAt, language)}
      </p>
      {record.rating !== null && (
        <p className="flex items-center gap-1 text-sm text-warn">
          <Star size={14} aria-hidden="true" fill="currentColor" strokeWidth={0} />
          <span className="font-mono">{record.rating} / 5</span>
        </p>
      )}
      {record.notes && (
        <p className="line-clamp-3 text-sm italic text-text-secondary">{record.notes}</p>
      )}
      <Link to={`/records/${record.id}`} className={`${secondaryButtonClass} mt-2`}>
        {t("graph.viewRecordDetail")}
      </Link>
    </div>
  );
}

/** 属性ノード（産地・農園・品種・精製方法・焙煎度・フレーバー・カフェ）を選んだときの中身 */
function AttributeNodeDetail({ nodeId, recordCount, relatedRecords, language, t }) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-text-tertiary">
        <Trans
          i18nKey="graph.appearsInCount"
          count={recordCount}
          components={{ mono: <span className="font-mono" /> }}
        />
      </p>

      <Link to={`/entities/${encodeURIComponent(nodeId)}`} className={secondaryButtonClass}>
        {t("graph.viewEntityDetail")}
      </Link>

      <ul className="flex flex-col gap-2">
        {(relatedRecords ?? []).map((record) => (
          <li key={record.id}>
            <Link
              to={`/records/${record.id}`}
              className="block rounded-lg border border-surface-2 px-3 py-2 transition-colors duration-150 hover:border-line"
            >
              <p className="truncate text-sm font-medium text-text">{record.title}</p>
              <p className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
                <span className="font-mono">{formatConsumedAtShort(record.consumedAt, language)}</span>
                {record.rating !== null && (
                  <span className="flex items-center gap-0.5 text-warn">
                    <Star size={10} aria-hidden="true" fill="currentColor" strokeWidth={0} />
                    <span className="font-mono">{record.rating}</span>
                  </span>
                )}
              </p>
              {record.notesExcerpt && (
                <p className="mt-1 truncate text-xs italic text-text-secondary">{record.notesExcerpt}</p>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default NodeDetailPanel;
