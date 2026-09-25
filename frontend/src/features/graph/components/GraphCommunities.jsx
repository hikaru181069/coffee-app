import { useTranslation } from "react-i18next";

import { useGraphCommunities } from "../hooks/useGraphCommunities";
import { getNodeSolidBgClass } from "../utils/nodeColor";

/**
 * 知識グラフのコミュニティ検出結果（記録のグループ分け）を、
 * GraphLegendと同じ「説明書き」の見た目で表示する
 * （docs/features.md「Graph Communities」）。
 *
 * FastAPI（NetworkXのgreedy modularity法）にグラフのnodes/edgesを渡して
 * 計算させた結果を、そのまま「グループ内で件数の多い属性」のチップとして
 * 並べるだけ。属性の色は記録カード・エンティティ詳細等と同じ
 * getNodeSolidBgClass（origin/flavorは値ごとの個別色、他は種別共通色）で揃える。
 *
 * 候補が無い・読み込み中は何も表示しない（Similar Records/Discover等と
 * 同じ「静かな道具」の方針。空状態の説明文までは出さない）。
 */
function GraphCommunities() {
  const { t } = useTranslation();
  const { communities, isLoading } = useGraphCommunities();

  if (isLoading || communities.length === 0) return null;

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-text-tertiary">{t("graph.communitiesHeading")}</span>
      <ul className="flex flex-wrap gap-2">
        {communities.map((community) => (
          <li
            key={community.id}
            className="flex items-center gap-1.5 rounded-full border border-line bg-surface-1 px-2.5 py-1 text-[11px] text-text-secondary"
          >
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
          </li>
        ))}
      </ul>
    </div>
  );
}

export default GraphCommunities;
