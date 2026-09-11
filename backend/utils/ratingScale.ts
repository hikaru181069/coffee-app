/**
 * 評価（rating・6軸の味覚評価・ratingMinフィルター）の範囲。
 *
 * coffeeRecordValidator.js・recordFilterValidator.js がそれぞれ
 * 独立に「1〜5の整数」という同じ範囲をハードコードしていたため、
 * ここへ集約した。各フィールドのエラーメッセージ文言は
 * 呼び出し側に残す（この定数は範囲の値だけを共有する）。
 */
export const RATING_MIN = 1;
export const RATING_MAX = 5;
