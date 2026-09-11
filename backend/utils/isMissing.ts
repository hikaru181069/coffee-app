/**
 * 「値が渡されていない」ことの共通判定。
 *
 * validators/ 配下の各ファイルが「その項目は任意で、未入力なら
 * チェックをスキップする」という同じ判断を独立に実装していたため、
 * utils/objectId.js・utils/escapeRegExp.js と同じ理由でここへ集約した。
 * null / undefined / 空文字列のいずれも「未入力」として扱う
 * （0やfalseのような正当な値は「未入力」ではないため対象外）。
 */
export const isMissing = (value: unknown): boolean =>
  value === undefined || value === null || value === "";
