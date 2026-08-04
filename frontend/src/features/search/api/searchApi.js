import { apiRequest } from "../../coffee-records/api/httpClient";

/**
 * 横断検索のAPI呼び出し。
 *
 * features/graph/api/graphApi.js と同じ方針: httpClientはcoffee-records
 * featureのものをそのまま使う。
 */

const SEARCH_PATH = "/api/search";

/**
 * 記録・属性を横断して検索する。
 *
 * @returns {{ entities: Array, records: Array }}
 */
export const fetchSearchResults = async (query, { signal } = {}) => {
  const payload = await apiRequest(SEARCH_PATH, { params: { q: query }, signal });
  return payload.data;
};
