/**
 * 記録に紐づく属性（origin/process/flavor等）の{id, name}から、
 * エンティティ詳細ページ（docs/entity-detail.md）へのリンクを組み立てる。
 *
 * stable ID形式は docs/knowledge-graph.md と同じ（{type}:{id}）。
 * RecordCard・RecordDetailPageなど、APIレスポンスの{id, name}形式から
 * 直接リンクを組みたい場所で共通して使う。
 */
export const entityNodeId = (type, id) => `${type}:${id}`;
export const entityDetailPath = (type, id) => `/entities/${encodeURIComponent(entityNodeId(type, id))}`;
