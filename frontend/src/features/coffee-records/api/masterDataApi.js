import { apiRequest } from "./httpClient";

/**
 * マスターデータ（産地・品種・精製方法・焙煎度・フレーバー）のAPI呼び出し。
 *
 * 記録フォームの選択肢に使う。
 */

const BASE_PATH = "/api/master-data";

/**
 * 5種類すべてをまとめて取得する。
 *
 * フォームは全種類の選択肢を同時に必要とするので、
 * 種類ごとに5回リクエストせず1回で取る。
 *
 * @returns {{ origins, varieties, processes, roastLevels, flavors }}
 */
export const fetchAllMasterData = async ({ signal } = {}) => {
  const payload = await apiRequest(BASE_PATH, { signal });
  return payload.data;
};

/**
 * 種類を指定して取得する（検索つき）。
 *
 * 選択肢が多い産地やフレーバーを絞り込みたい場合に使う。
 * MVPのフォームは全件を一度に取るので未使用だが、
 * 一覧のフィルターやオートコンプリートで必要になる。
 */
export const fetchMasterDataByType = async (type, params, { signal } = {}) => {
  const payload = await apiRequest(`${BASE_PATH}/${type}`, { params, signal });
  return payload.data;
};
