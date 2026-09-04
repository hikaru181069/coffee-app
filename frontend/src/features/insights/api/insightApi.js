import { apiRequest } from "../../../services/api/httpClient";

/**
 * Insight（傾向）のAPI呼び出し。
 *
 * features/graph/api/graphApi.js と同じ方針: httpClientはcoffee-records
 * featureのものをそのまま使う。フィルターは持たない
 * （「自分の記録全体からの傾向」を示す機能のため）。
 */

const INSIGHTS_PATH = "/api/insights";

/**
 * Insightの一覧を取得する。優先度順に並んでいる。
 *
 * @returns {{ insights: Array }}
 */
export const fetchInsights = async ({ signal } = {}) => {
  const payload = await apiRequest(INSIGHTS_PATH, { signal });
  return payload.data;
};
