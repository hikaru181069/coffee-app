import { apiRequest } from "../../../services/api/httpClient";

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
 * 2026-08、検索ボックスとフィルターの併用に対応した。filtersは
 * RecordsPage.jsxのアクティブなフィルター（recordFilterValidator.jsと
 * 同じ形。配列値はhttpClient.jsのbuildQueryStringがString()で
 * カンマ区切りへ変換する）をそのまま渡す。
 *
 * @returns {{ entities: Array, entitiesTruncated: boolean, records: Array }}
 */
export const fetchSearchResults = async (query, filters = {}, { signal } = {}) => {
  const payload = await apiRequest(SEARCH_PATH, { params: { q: query, ...filters }, signal });
  return payload.data;
};
