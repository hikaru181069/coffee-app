import { useRef } from "react";
import { Link } from "react-router-dom";
import { Star, X } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";

import { getNodeVisual } from "../utils/nodeVisuals";
import { getNodeSolidBgClass } from "../utils/nodeColor";
import { findCommunityForNode } from "../utils/communityLookup";
import CoffeeLoader from "../../../components/CoffeeLoader";
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
 *
 * 2026-09、選んだノードが属するコミュニティ（Graph Communities、
 * docs/features.md参照）があれば、種類を問わず共通で「属するグループ」
 * 欄を追加で出す。ホバー時のGraphCommunities.jsxと同じ情報だが、
 * クリックは（bottom sheetとして）モバイルでも使えるため、こちらが
 * この機能の主経路になる。
 */
function NodeDetailPanel({ node, detail, isLoading, error, communities, onClose }) {
  const { t, i18n } = useTranslation();
  const panelRef = useRef(null);

  // 2026-08、監査で発覚: Escapeで閉じる処理・開いたときのフォーカス移動が
  // 無かった（ConfirmDialog.jsxにはあった）。hooks/useFocusTrap.jsへ
  // 共通化したものをここでも使う。nodeがnullの間はhook内部で何もしない
  useFocusTrap(panelRef, Boolean(node), onClose);

  if (!node) return null;

  const community = findCommunityForNode(communities ?? [], node.id);

  const visual = getNodeVisual(node.data.type);
  const Icon = visual.icon;
  // 産地・フレーバーノードだけは種別共通の色ではなく値ごとの個別色を使う
  // という判定は、他画面とも共有するutils/nodeColor.js（2026-09新設）へ
  // 集約した。2026-09、見出しをQ構図と揃えた塗りつぶし円バッジへ変更した際、
  // アイコンの色ではなくバッジ本体の背景色として使うようになった
  const badgeBgClass = getNodeSolidBgClass({ type: node.data.type, label: node.data.label });

  return (
    <aside
      ref={panelRef}
      aria-label={t("graph.selectedNodeAriaLabel")}
      // z-[60]: BottomTabBar（App.css `.bottom-tab-bar`）がz-50のため、モバイルの
      // bottom sheetがz-40のままだとDOM順で後に置かれるBottomTabBarに負け、
      // パネル下部の内容がタブバーの裏に隠れてしまう（ConfirmDialog.jsxと同じ
      // 既知の対処。ユーザー報告により発覚）
      className="fixed inset-x-0 bottom-0 z-[60] max-h-[70vh] overflow-y-auto rounded-none-2xl border-t border-surface-2 bg-raised/90 p-4 shadow-panel backdrop-blur-xl sm:absolute sm:inset-x-auto sm:inset-y-0 sm:right-0 sm:top-0 sm:max-h-none sm:w-80 sm:rounded-none sm:rounded-none-2xl sm:border-l sm:border-t-0"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className={`flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full shadow-elevated ${badgeBgClass}`}>
            <Icon size={20} aria-hidden="true" className="text-on-inverse" />
          </div>
          <div>
            <span className="inline-block rounded-none bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-text-secondary">
              {t(visual.labelKey)}
            </span>
            <h2 className="mt-1 text-sm font-bold text-text">{node.data.label}</h2>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("common.close")}
          className="rounded-none p-1 text-text-tertiary hover:bg-surface-2 hover:text-text"
        >
          <X size={16} aria-hidden="true" />
        </button>
      </div>

      <div className="mt-4">
        {community && <NodeGroupMembership community={community} currentNode={node.data} t={t} />}

        {isLoading && <CoffeeLoader size="lg" />}

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
              className="block rounded-none border border-surface-2 px-3 py-2 transition-colors duration-150 hover:border-line"
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

/**
 * 選択中ノードが属するコミュニティ（Graph Communities）の要約。
 * GraphCommunities.jsxと同じ見た目・情報だが、今見ているノード自身の
 * ラベルは重複表示しない（「Ethiopiaを選んだらEthiopiaと出る」を避ける）。
 */
function NodeGroupMembership({ community, currentNode, t }) {
  const chips = Object.entries(community.dominantAttributes).flatMap(([type, labels]) =>
    labels
      .filter((label) => !(type === currentNode.type && label === currentNode.label))
      .map((label) => ({ type, label })),
  );

  return (
    <div className="mb-3 rounded-none border border-line bg-surface-1 px-3 py-2">
      <p className="text-xs font-medium text-text-tertiary">{t("graph.nodeGroupHeading")}</p>
      <p className="mt-1 font-mono text-xs text-text-tertiary">
        {t("graph.communitiesRecordCount", { count: community.recordCount })}
      </p>
      {chips.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {chips.map(({ type, label }) => (
            <span key={`${type}:${label}`} className="inline-flex items-center gap-1 text-[11px] text-text-secondary">
              <span
                className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${getNodeSolidBgClass({ type, label })}`}
                aria-hidden="true"
              />
              {label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default NodeDetailPanel;
