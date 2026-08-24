/**
 * 記録フォームの入力検証（クライアント側）。
 *
 * サーバー側の validators/coffeeRecordValidator.js が本来の門番で、
 * ここはそれを置き換えるものではない。目的が違う:
 *
 *   サーバー … 不正なデータをDBへ入れない（信頼できる検証）
 *   ここ     … 送信する前に気づかせる（体感の速さ）
 *
 * そのため条件はサーバー側と意図的にそろえてある。
 * ずれると「画面では通るのにAPIで400」という分かりにくい状態になる。
 *
 * DOMにもAPIにも依存しない純粋関数にして、
 * フォームの状態管理から切り離してある。
 */

import { TASTE_AXES, fromDateTimeLocalValue } from "../utils/recordFormat";

const MAX_LENGTH = {
  title: 120,
  notes: 2000,
  cafeName: 120,
  roasterName: 120,
  farmName: 120,
};

const RECORD_TYPES = ["home", "cafe"];

/**
 * フォームの値を検証する。
 *
 * @param {object} values フォームの状態（すべて文字列または配列）
 * @param {Function} t react-i18nextのt関数
 * @returns {object} { フィールド名: メッセージ }。問題が無ければ空オブジェクト
 */
export const validateRecordForm = (values = {}, t) => {
  const errors = {};

  // ── 必須項目 ──────────────────────────────────────
  const title = (values.title ?? "").trim();
  if (title === "") {
    errors.title = t("validation.titleRequired");
  } else if (title.length > MAX_LENGTH.title) {
    errors.title = t("validation.maxLength", { max: MAX_LENGTH.title });
  }

  if (!values.consumedAt) {
    errors.consumedAt = t("validation.dateRequired");
  } else if (Number.isNaN(new Date(values.consumedAt).getTime())) {
    errors.consumedAt = t("validation.dateInvalid");
  }

  if (!RECORD_TYPES.includes(values.recordType)) {
    errors.recordType = t("validation.recordTypeRequired");
  }

  // ── 任意項目 ──────────────────────────────────────
  // rating は「未評価」を許すので、空のときは検証しない
  if (values.rating !== "" && values.rating !== null && values.rating !== undefined) {
    const rating = Number(values.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      errors.rating = t("validation.ratingRange");
    }
  }

  // 味覚グラフの6軸も rating と同じく「未評価」を許す
  for (const { field } of TASTE_AXES) {
    const value = values[field];
    if (value === "" || value === null || value === undefined) continue;

    const score = Number(value);
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      errors[field] = t("validation.ratingRange");
    }
  }

  for (const field of ["notes", "cafeName", "roasterName", "farmName"]) {
    const value = (values[field] ?? "").trim();
    if (value.length > MAX_LENGTH[field]) {
      errors[field] = t("validation.maxLength", { max: MAX_LENGTH[field] });
    }
  }

  return errors;
};

/** 検証結果に問題があるか */
export const hasErrors = (errors) => Object.keys(errors).length > 0;

/**
 * フォームの状態をAPIへ送る形へ変換する。
 *
 * フォームはすべて文字列で持っているので、
 * ここで数値・null・配列へ直す。
 *
 * 未選択の項目に "" ではなく null を送る理由:
 *   サーバーは null を「選択を外す」として扱う。
 *   "" を送るとObjectIdとして解釈できず400になる。
 */
export const toApiPayload = (values) => ({
  title: values.title.trim(),
  // datetime-localの値はタイムゾーン情報を持たないローカル時刻の文字列なので、
  // サーバー（UTC）が誤ってUTCとして解釈しないよう、送信前にISO文字列へ変換する。
  consumedAt: fromDateTimeLocalValue(values.consumedAt),
  recordType: values.recordType,

  rating: values.rating === "" ? null : Number(values.rating),
  notes: values.notes.trim(),

  // カフェ記録でなければ店名は送らない（家で飲んだ記録に店名が残らないように）
  cafeName: values.recordType === "cafe" ? values.cafeName.trim() : "",
  roasterName: values.roasterName.trim(),

  originId: values.originId || null,
  farmName: values.farmName.trim(),
  varietyIds: values.varietyIds ?? [],
  processId: values.processId || null,
  roastLevelId: values.roastLevelId || null,
  flavorIds: values.flavorIds ?? [],

  ...Object.fromEntries(
    TASTE_AXES.map(({ field }) => [
      field,
      values[field] === "" || values[field] === null || values[field] === undefined
        ? null
        : Number(values[field]),
    ]),
  ),
});
