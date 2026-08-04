import { apiRequest } from "../../coffee-records/api/httpClient";

/**
 * 統計のAPI呼び出し。
 *
 * features/insights/api/insightApi.js と同じ方針: httpClientはcoffee-records
 * featureのものをそのまま使う。フィルターは持たない。
 */

const STATS_PATH = "/api/stats";

export const fetchStats = async ({ signal } = {}) => {
  const payload = await apiRequest(STATS_PATH, { signal });
  return payload.data;
};
