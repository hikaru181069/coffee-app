import { apiRequest } from "../../coffee-records/api/httpClient";

/**
 * Discover（まだ試していない産地の提案）のAPI呼び出し。
 *
 * features/insights/api/insightApi.js と同じ方針: httpClientはcoffee-records
 * featureのものをそのまま使う。Insightとは完全に独立した機能・エンドポイント
 * （docs/features.md「Discover」参照。core/insights/insightBuilder.jsには
 * 一切触れていない）。
 */

const DISCOVER_PATH = "/api/discover";

/**
 * 指定した産地ノードについて、まだ試していない産地の提案を取得する。
 * origin以外のnodeIdを渡した場合もエラーにはならず、空配列が返る
 * （backend/services/coffee/discoverService.js参照）。
 */
export const fetchOriginDiscovery = async (nodeId, { signal } = {}) => {
  const payload = await apiRequest(`${DISCOVER_PATH}/nodes/${encodeURIComponent(nodeId)}`, { signal });
  return payload.data;
};

/**
 * Home画面用の、全産地を横断した提案1件を取得する。
 * 条件を満たす産地が無ければ teaser: null が返る。
 */
export const fetchDiscoverTeaser = async ({ signal } = {}) => {
  const payload = await apiRequest(DISCOVER_PATH, { signal });
  return payload.data;
};
