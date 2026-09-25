import { useTranslation } from "react-i18next";

import { findCommunityForNode } from "../utils/communityLookup";
import { getNodeSolidBgClass } from "../utils/nodeColor";

/**
 * キャンバス上でホバー中のノードが属するコミュニティ（グループ）だけを
 * その場でプレビュー表示する（docs/features.md「Graph Communities」）。
 *
 * 2026-09、当初は検出された全グループを常時一覧表示していたが、
 * 「表示する基準が曖昧」というユーザーからの指摘を受けて作り直した。
 * 「グラフ全体」という漠然とした単位ではなく「今ホバーしているノードに
 * 対して」という明確な基準にし、既存の「ホバーで隣接ノードのラベルを
 * 出す」挙動（GraphCanvas.jsx）と同じ操作感に揃えた。何もホバーして
 * いない・該当グループが無いときは何も表示しない（静かな道具の方針）。
 *
 * クリックしたノードの詳細（NodeDetailPanel.jsx）には別途同じグループ
 * 情報を表示しており、そちらはモバイル（ホバー操作が無い環境）でも
 * 使える主経路になっている。ここはPCでの補助的なプレビュー。
 */
function GraphCommunities({ communities, hoveredNodeId }) {
  const { t } = useTranslation();
  const community = findCommunityForNode(communities, hoveredNodeId);

  if (!community) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-full border border-line bg-surface-1 px-2.5 py-1 text-[11px] text-text-secondary">
      <span className="text-text-tertiary">{t("graph.communitiesHeading")}</span>
      <span className="font-mono text-text-tertiary">
        {t("graph.communitiesRecordCount", { count: community.recordCount })}
      </span>
      {Object.entries(community.dominantAttributes).map(([type, labels]) =>
        labels.map((label) => (
          <span key={`${type}:${label}`} className="inline-flex items-center gap-1">
            <span
              className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${getNodeSolidBgClass({ type, label })}`}
              aria-hidden="true"
            />
            {label}
          </span>
        )),
      )}
    </div>
  );
}

export default GraphCommunities;
