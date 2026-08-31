import { apiRequest } from "../../coffee-records/api/httpClient";

/**
 * Origin Quality（産地の品質スコア）のAPI呼び出し。
 *
 * features/discover/api/discoverApi.js と同じ方針: httpClientはcoffee-records
 * featureのものをそのまま使う。Discoverとは完全に独立した機能・エンドポイント
 * （docs/features.md「Origin Quality」参照）。
 */

const ORIGIN_QUALITY_PATH = "/api/origin-quality";

/**
 * 指定した産地ノードについて、精製方法ごとの品質スコアを取得する。
 * origin以外のnodeIdを渡した場合もエラーにはならず、空配列が返る
 * （backend/services/coffee/originQualityService.js参照）。
 */
export const fetchOriginQuality = async (nodeId, { signal } = {}) => {
  const payload = await apiRequest(`${ORIGIN_QUALITY_PATH}/nodes/${encodeURIComponent(nodeId)}`, { signal });
  return payload.data;
};

/** CQIデータに含まれる全産地の平均品質スコアを取得する（World Mapの色分け用） */
export const fetchAllOriginQuality = async ({ signal } = {}) => {
  const payload = await apiRequest(ORIGIN_QUALITY_PATH, { signal });
  return payload.data;
};
