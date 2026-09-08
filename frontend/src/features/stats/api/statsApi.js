import { apiRequest } from "../../../services/api/httpClient";

/**
 * 統計のAPI呼び出し。
 *
 * features/insights/api/insightApi.js と同じ方針: httpClientは
 * services/api/httpClient.js のものをそのまま使う。フィルターは持たない。
 */

const STATS_PATH = "/api/stats";

export const fetchStats = async ({ signal } = {}) => {
  const payload = await apiRequest(STATS_PATH, { signal });
  return payload.data;
};
