/**
 * 指定したノードIDが属するコミュニティ（グループ）を探す。
 *
 * GraphCommunities.jsx（キャンバスのホバー時のプレビュー）と
 * NodeDetailPanel.jsx（選択ノードの詳細）の両方から使う、
 * 同じ探索ロジックの一本化（docs/features.md「Graph Communities」）。
 * 1つのノードが複数のコミュニティへ属することは無い
 * （greedy_modularity_communitiesはグラフを重複無く分割するため）。
 */
export const findCommunityForNode = (communities, nodeId) => {
  if (!nodeId) return null;
  return communities.find((community) => community.nodeIds.includes(nodeId)) ?? null;
};
