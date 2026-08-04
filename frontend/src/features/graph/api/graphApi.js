import { apiRequest } from "../../coffee-records/api/httpClient";

/**
 * 知識グラフのAPI呼び出し。
 *
 * httpClient は coffee-records feature のものをそのまま使う。
 * 認証ヘッダの付与とエラー形式の解釈は既にそちらへ集約されており、
 * グラフ専用に作り直す理由が無いため。
 */

const GRAPH_PATH = "/api/graph";

/**
 * 知識グラフを取得する。
 *
 * @param {object} params nodeTypes(配列) / recordType / ratingMin
 * @returns {{ nodes: Array, edges: Array, summary: object }}
 */
export const fetchGraph = (params, { signal } = {}) => {
  // nodeTypesは配列で受け取り、APIへはカンマ区切りの1文字列として送る
  // （backend/validators/graphQueryValidator.js がこの形式を受け付ける）
  const query = { ...params };
  if (Array.isArray(query.nodeTypes)) {
    query.nodeTypes = query.nodeTypes.length > 0 ? query.nodeTypes.join(",") : undefined;
  }

  return apiRequest(GRAPH_PATH, { params: query, signal });
};

/**
 * 指定したノードに関連する記録の一覧を取得する。
 *
 * nodeId は "origin:507f..." のようなstable ID。
 * パスに含めるのでエンコードする（スペースを含みうるfarmノードのため）。
 */
export const fetchNodeRecords = async (nodeId, params, { signal } = {}) => {
  const query = { ...params };
  if (Array.isArray(query.nodeTypes)) {
    query.nodeTypes = undefined; // related recordsではnodeTypesは使わない
  }

  const payload = await apiRequest(`${GRAPH_PATH}/nodes/${encodeURIComponent(nodeId)}/records`, {
    params: query,
    signal,
  });
  return payload.data;
};

/**
 * 指定したノード（属性）の詳細（統計・関連属性・関連記録）を取得する。
 * エンティティ詳細ページ用。フィルターは持たない（backend/services/coffee/graphService.js参照）。
 */
export const fetchNodeDetail = async (nodeId, { signal } = {}) => {
  const payload = await apiRequest(`${GRAPH_PATH}/nodes/${encodeURIComponent(nodeId)}`, { signal });
  return payload.data;
};
