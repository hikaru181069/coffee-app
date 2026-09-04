import { apiRequest } from "../../../services/api/httpClient";

/**
 * Similar Records（似た記録）のAPI呼び出し。
 *
 * features/discover/api/discoverApi.js と同じ方針: httpClientはcoffee-records
 * featureのものをそのまま使う。Discover/Origin Qualityとは完全に独立した
 * 機能・エンドポイント（docs/features.md「Similar Records」参照）。
 */

const SIMILAR_RECORDS_PATH = "/api/similar-records";

/** 指定した記録に似た記録の一覧を取得する */
export const fetchSimilarRecords = async (recordId, { signal } = {}) => {
  const payload = await apiRequest(`${SIMILAR_RECORDS_PATH}/${encodeURIComponent(recordId)}`, { signal });
  return payload.data;
};
