import { isObjectIdString } from "../utils/objectId.js";

/**
 * CoffeeRecord のリクエスト入力を検証する。
 *
 * なぜモデルのvalidationと別に用意するのか:
 *   Mongooseのvalidationは「DBへ保存してよい形か」を守るもので、
 *   壊れた入力はDB層まで到達してから CastError などになる。
 *   例えば originId に "abc" が来ると Mongoose は CastError を投げ、
 *   そのままだと500になってしまう（CLAUDE.md「不正ObjectIdを500にしない」）。
 *
 *   ここでHTTP境界の形を先に確認し、400 + details で返せるようにする。
 *
 * 設計:
 *   DBにもExpressにも依存しない純粋関数にしている。
 *   req / res を受け取らないので、テストがモック無しで書ける。
 *   Expressのmiddlewareへ載せるのは Phase 2（prompts/02）。
 *
 * 返り値:
 *   { valid: boolean, details: [{ field, message }] }
 *   details は docs/architecture.md の Error Response の details に入る。
 */

const RECORD_TYPES = ["home", "cafe"];

const MAX_LENGTH = {
  title: 120,
  notes: 2000,
  cafeName: 120,
  roasterName: 120,
  farmName: 120,
};

/** 参照が単数のフィールド（ObjectId 1つ） */
const SINGLE_REF_FIELDS = ["originId", "processId", "roastLevelId"];

/** 参照が複数のフィールド（ObjectIdの配列） */
const MULTI_REF_FIELDS = ["varietyIds", "flavorIds"];

/** 自由入力の文字列フィールド（任意） */
const OPTIONAL_TEXT_FIELDS = ["notes", "cafeName", "roasterName", "farmName"];

/** 味覚グラフ用の6軸評価フィールド（任意、1〜5の整数） */
const TASTE_FIELDS = [
  "tasteSweetness",
  "tasteBitterness",
  "tasteAcidity",
  "tasteBody",
  "tasteAroma",
  "tasteAftertaste",
];

/**
 * 抽出の詳細（任意、数値）。記録編集フォームではなく記録詳細ページの
 * 独立カード（BrewDetailsCard.jsx）からのみ送られてくる想定だが、
 * 検証自体はcreate/updateどちらでも同じルールで通す。
 * 上限は誤入力防止のための緩いガード（重さ5000g、時間86400秒=24時間。
 * コールドブリューの長時間抽出も許容する）
 */
const BREW_NUMERIC_LIMITS = {
  doseWeight: 5000,
  waterWeight: 5000,
  brewTimeSeconds: 86400,
};
const BREW_NUMERIC_FIELDS = Object.keys(BREW_NUMERIC_LIMITS);

const MAX_POURS = 20;

const isMissing = (value) => value === undefined || value === null || value === "";

// ── 個別の検証 ──────────────────────────────────────────────────

const validateTitle = (value, details) => {
  if (typeof value !== "string" || value.trim() === "") {
    details.push({ field: "title", message: "タイトルを入力してください" });
    return;
  }
  if (value.trim().length > MAX_LENGTH.title) {
    details.push({
      field: "title",
      message: `タイトルは${MAX_LENGTH.title}文字以内で入力してください`,
    });
  }
};

const validateConsumedAt = (value, details) => {
  // new Date("あ") は Invalid Date になり、getTime() が NaN を返す
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    details.push({ field: "consumedAt", message: "日付の形式が正しくありません" });
  }
};

const validateRecordType = (value, details) => {
  if (!RECORD_TYPES.includes(value)) {
    details.push({
      field: "recordType",
      message: `記録タイプは ${RECORD_TYPES.join(" または ")} を指定してください`,
    });
  }
};

const validateRating = (value, details) => {
  // 未評価を許可する。null / undefined / "" は「評価なし」として扱う
  if (isMissing(value)) return;

  if (!Number.isInteger(value) || value < 1 || value > 5) {
    details.push({ field: "rating", message: "評価は1〜5の整数で指定してください" });
  }
};

const validateTasteScore = (field, value, details) => {
  // 未評価を許可する。null / undefined / "" は「評価なし」として扱う
  // （validateRatingと同じ理由。ratingが単一の総合評価なのに対し、
  // これは6軸それぞれの評価）
  if (isMissing(value)) return;

  if (!Number.isInteger(value) || value < 1 || value > 5) {
    details.push({ field, message: "1〜5の整数で指定してください" });
  }
};

const validateOptionalText = (field, value, details) => {
  if (isMissing(value)) return;

  if (typeof value !== "string") {
    details.push({ field, message: "文字列で指定してください" });
    return;
  }
  if (value.trim().length > MAX_LENGTH[field]) {
    details.push({
      field,
      message: `${MAX_LENGTH[field]}文字以内で入力してください`,
    });
  }
};

const validateSingleRef = (field, value, details) => {
  // null は「選択なし」を意味するので許可する
  if (isMissing(value)) return;

  if (!isObjectIdString(value)) {
    details.push({ field, message: "選択された項目のIDが不正です" });
  }
};

const validateMultiRef = (field, value, details) => {
  if (isMissing(value)) return;

  if (!Array.isArray(value)) {
    details.push({ field, message: "配列で指定してください" });
    return;
  }
  if (value.some((id) => !isObjectIdString(id))) {
    details.push({ field, message: "選択された項目のIDが不正です" });
  }
};

const validateBrewNumber = (field, value, details) => {
  // 未記録を許可する（doseWeight等はdefault null）
  if (isMissing(value)) return;

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    details.push({ field, message: "0より大きい数値で指定してください" });
    return;
  }
  if (value > BREW_NUMERIC_LIMITS[field]) {
    details.push({ field, message: "数値が大きすぎます" });
  }
};

/**
 * 注湯記録（経過時間ごとの累計湯量）の検証。
 * 各要素の妥当性に加え、elapsedSecondsが単調増加であることを確認する
 * （後の注湯が前より時間的に早い、という矛盾したデータを防ぐ）
 */
const validatePours = (value, details) => {
  if (isMissing(value)) return;

  if (!Array.isArray(value)) {
    details.push({ field: "pours", message: "配列で指定してください" });
    return;
  }
  if (value.length > MAX_POURS) {
    details.push({ field: "pours", message: `注湯の記録は${MAX_POURS}件までです` });
    return;
  }

  let previousElapsedSeconds = -Infinity;
  for (const pour of value) {
    const { elapsedSeconds, cumulativeWaterWeight } = pour ?? {};
    const isValidShape =
      typeof elapsedSeconds === "number" &&
      Number.isFinite(elapsedSeconds) &&
      elapsedSeconds >= 0 &&
      typeof cumulativeWaterWeight === "number" &&
      Number.isFinite(cumulativeWaterWeight) &&
      cumulativeWaterWeight > 0;

    if (!isValidShape) {
      details.push({ field: "pours", message: "経過時間と累計湯量を正しく入力してください" });
      return;
    }
    if (elapsedSeconds <= previousElapsedSeconds) {
      details.push({ field: "pours", message: "経過時間は前の注湯より後にしてください" });
      return;
    }
    previousElapsedSeconds = elapsedSeconds;
  }
};

// ── 公開API ────────────────────────────────────────────────────

/**
 * 記録作成（POST /api/coffee-records）の入力を検証する。
 *
 * userId は検証対象に含めない。
 * リクエスト本文の userId は信用せず、認証情報から設定するため
 * （CLAUDE.md / docs/architecture.md の Security）。
 */
export const validateCreateCoffeeRecord = (body = {}) => {
  const details = [];

  validateTitle(body.title, details);

  if (isMissing(body.consumedAt)) {
    details.push({ field: "consumedAt", message: "日付を入力してください" });
  } else {
    validateConsumedAt(body.consumedAt, details);
  }

  validateRecordType(body.recordType, details);
  validateRating(body.rating, details);

  for (const field of OPTIONAL_TEXT_FIELDS) {
    validateOptionalText(field, body[field], details);
  }
  for (const field of TASTE_FIELDS) {
    validateTasteScore(field, body[field], details);
  }
  for (const field of SINGLE_REF_FIELDS) {
    validateSingleRef(field, body[field], details);
  }
  for (const field of MULTI_REF_FIELDS) {
    validateMultiRef(field, body[field], details);
  }
  for (const field of BREW_NUMERIC_FIELDS) {
    validateBrewNumber(field, body[field], details);
  }
  validatePours(body.pours, details);

  return { valid: details.length === 0, details };
};

/**
 * 記録の部分更新（PATCH /api/coffee-records/:recordId）の入力を検証する。
 *
 * 作成時との違いは「送られてこなかった項目は検証しない」こと。
 * ただし送られてきた必須項目を空にすることは許さない。
 */
export const validateUpdateCoffeeRecord = (body = {}) => {
  const details = [];

  if (Object.keys(body).length === 0) {
    return {
      valid: false,
      details: [{ field: "body", message: "更新する項目がありません" }],
    };
  }

  if ("title" in body) validateTitle(body.title, details);
  if ("consumedAt" in body) {
    if (isMissing(body.consumedAt)) {
      details.push({ field: "consumedAt", message: "日付を入力してください" });
    } else {
      validateConsumedAt(body.consumedAt, details);
    }
  }
  if ("recordType" in body) validateRecordType(body.recordType, details);
  if ("rating" in body) validateRating(body.rating, details);

  for (const field of OPTIONAL_TEXT_FIELDS) {
    if (field in body) validateOptionalText(field, body[field], details);
  }
  for (const field of TASTE_FIELDS) {
    if (field in body) validateTasteScore(field, body[field], details);
  }
  for (const field of SINGLE_REF_FIELDS) {
    if (field in body) validateSingleRef(field, body[field], details);
  }
  for (const field of MULTI_REF_FIELDS) {
    if (field in body) validateMultiRef(field, body[field], details);
  }
  for (const field of BREW_NUMERIC_FIELDS) {
    if (field in body) validateBrewNumber(field, body[field], details);
  }
  if ("pours" in body) validatePours(body.pours, details);

  return { valid: details.length === 0, details };
};

/**
 * リクエスト本文から、CoffeeRecordへ書き込んでよい項目だけを抜き出す。
 *
 * userId や _id が本文に含まれていても、ここで確実に捨てられる。
 * controllerが body をそのまま model へ渡す事故を防ぐための関門。
 */
export const pickCoffeeRecordFields = (body = {}) => {
  const allowed = [
    "title",
    "consumedAt",
    "recordType",
    "rating",
    ...OPTIONAL_TEXT_FIELDS,
    ...TASTE_FIELDS,
    ...SINGLE_REF_FIELDS,
    ...MULTI_REF_FIELDS,
    ...BREW_NUMERIC_FIELDS,
    "pours",
  ];

  const result = {};
  for (const field of allowed) {
    if (field in body) result[field] = body[field];
  }
  return result;
};
