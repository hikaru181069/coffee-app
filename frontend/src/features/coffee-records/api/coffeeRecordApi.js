import { apiRequest } from "../../../services/api/httpClient";

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

/**
 * 記録を作成する。
 *
 * @returns {{ record: object, discoveries: Array }} 作成された記録
 *   （マスター名を解決済み）と、この記録によって新しく生まれた「発見」
 *   （backend/core/discoveries/discoveryBuilder.js参照）。2026-09、
 *   保存後の発見インタースティシャル追加にあわせ、戻り値がrecord単体から
 *   { record, discoveries } へ変わった（呼び出し側はsaved.record.idを見る）
 */
export const createCoffeeRecord = async (fields) => {
  const payload = await apiRequest(BASE_PATH, { method: "POST", body: fields });
  return { record: payload.data, discoveries: payload.discoveries ?? [] };
};

/**
 * 記録を部分更新する。
 *
 * 送った項目だけが更新される。フォームは変更点だけを送る想定だが、
 * 全項目を送っても同じ結果になる。編集は「新しい体験を記録した」文脈
 * ではないため、discoveriesは常に空配列を返す（発見演出は作成時のみ、
 * backend/services/coffee/coffeeRecordService.js参照）。
 *
 * @returns {{ record: object, discoveries: [] }}
 */
export const updateCoffeeRecord = async (recordId, fields) => {
  const payload = await apiRequest(`${BASE_PATH}/${recordId}`, {
    method: "PATCH",
    body: fields,
  });
  return { record: payload.data, discoveries: [] };
};

/** 記録を削除する。成功時は 204 なので戻り値は無い */
export const deleteCoffeeRecord = (recordId) =>
  apiRequest(`${BASE_PATH}/${recordId}`, { method: "DELETE" });
