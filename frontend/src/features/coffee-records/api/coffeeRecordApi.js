import { apiRequest } from "./httpClient";

/**
 * CoffeeRecord のAPI呼び出し。
 *
 * ここはHTTPの形（パス・メソッド・レスポンスの取り出し）だけを知る。
 * 「どの順で呼ぶか」「エラーをどう見せるか」は hooks と画面の担当。
 */

const BASE_PATH = "/api/coffee-records";

/**
 * 記録の一覧を取得する。
 *
 * @param {object} params page / limit / sort / recordType / originId /
 *                        flavorId / ratingMin / dateFrom / dateTo
 * @returns {{ data: Array, pagination: object }}
 */
export const fetchCoffeeRecords = (params, { signal } = {}) =>
  apiRequest(BASE_PATH, { params, signal });

/** 記録を1件取得する */
export const fetchCoffeeRecord = async (recordId, { signal } = {}) => {
  const payload = await apiRequest(`${BASE_PATH}/${recordId}`, { signal });
  return payload.data;
};

/** 記録を作成する。作成された記録（マスター名を解決済み）が返る */
export const createCoffeeRecord = async (fields) => {
  const payload = await apiRequest(BASE_PATH, { method: "POST", body: fields });
  return payload.data;
};

/**
 * 記録を部分更新する。
 *
 * 送った項目だけが更新される。フォームは変更点だけを送る想定だが、
 * 全項目を送っても同じ結果になる。
 */
export const updateCoffeeRecord = async (recordId, fields) => {
  const payload = await apiRequest(`${BASE_PATH}/${recordId}`, {
    method: "PATCH",
    body: fields,
  });
  return payload.data;
};

/** 記録を削除する。成功時は 204 なので戻り値は無い */
export const deleteCoffeeRecord = (recordId) =>
  apiRequest(`${BASE_PATH}/${recordId}`, { method: "DELETE" });
