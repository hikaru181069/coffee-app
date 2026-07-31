import { validateRecordFilterQuery } from "./recordFilterValidator.js";

/**
 * 一覧API（GET /api/coffee-records）のクエリ文字列を検証・変換する。
 *
 * クエリはすべて文字列で届くので、検証と同時に
 * 数値・日付・列挙へ変換して、service が扱いやすい形にして返す。
 *
 * 未指定の項目は既定値で埋める。service 側で「未指定なら〜」という
 * 分岐を書かなくて済むようにするため。
 *
 * recordType・originId・flavorId・ratingMin・期間の検証は
 * validateRecordFilterQuery() へ切り出してある。
 * グラフAPI（graphQueryValidator.js）と同じ検証が必要なため。
 */

/** docs/api.md の sort に対応する。キーを固定して任意のフィールド指定を許さない */
const SORT_OPTIONS = {
  "-consumedAt": { consumedAt: -1 },
  consumedAt: { consumedAt: 1 },
  "-rating": { rating: -1 },
  rating: { rating: 1 },
  "-createdAt": { createdAt: -1 },
  createdAt: { createdAt: 1 },
};

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

const isMissing = (value) => value === undefined || value === null || value === "";

/** "12" のような文字列を整数へ。整数でなければ null を返す */
const toInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

/**
 * @returns {{ valid: boolean, details: Array, query: object }}
 *   query は検証を通った場合のみ意味を持つ
 */
export const validateCoffeeRecordListQuery = (rawQuery = {}) => {
  const details = [];
  const query = {
    page: 1,
    limit: DEFAULT_LIMIT,
    sort: SORT_OPTIONS["-consumedAt"],
    filter: {},
  };

  // ── ページネーション ────────────────────────────────
  if (!isMissing(rawQuery.page)) {
    const page = toInteger(rawQuery.page);
    if (page === null || page < 1) {
      details.push({ field: "page", message: "pageは1以上の整数で指定してください" });
    } else {
      query.page = page;
    }
  }

  if (!isMissing(rawQuery.limit)) {
    const limit = toInteger(rawQuery.limit);
    if (limit === null || limit < 1) {
      details.push({ field: "limit", message: "limitは1以上の整数で指定してください" });
    } else if (limit > MAX_LIMIT) {
      // 上限を設けないと、1リクエストで全件取得されてDBとメモリを圧迫する
      details.push({
        field: "limit",
        message: `limitは${MAX_LIMIT}以下で指定してください`,
      });
    } else {
      query.limit = limit;
    }
  }

  // ── 並び順 ────────────────────────────────────────
  if (!isMissing(rawQuery.sort)) {
    const sort = SORT_OPTIONS[rawQuery.sort];
    if (!sort) {
      details.push({
        field: "sort",
        message: `sortは ${Object.keys(SORT_OPTIONS).join(" / ")} のいずれかを指定してください`,
      });
    } else {
      query.sort = sort;
    }
  }

  // ── 絞り込み ──────────────────────────────────────
  const filterResult = validateRecordFilterQuery(rawQuery);
  details.push(...filterResult.details);
  query.filter = filterResult.filter;

  return { valid: details.length === 0, details, query };
};

/** 検索系エンドポイント（マスターデータ一覧）のクエリを検証する */
export const validateMasterDataQuery = (rawQuery = {}) => {
  const details = [];
  const query = { search: undefined, limit: undefined };

  if (!isMissing(rawQuery.search)) {
    if (typeof rawQuery.search !== "string") {
      details.push({ field: "search", message: "searchは文字列で指定してください" });
    } else {
      query.search = rawQuery.search;
    }
  }

  if (!isMissing(rawQuery.limit)) {
    const limit = toInteger(rawQuery.limit);
    if (limit === null || limit < 1 || limit > MAX_LIMIT) {
      details.push({
        field: "limit",
        message: `limitは1〜${MAX_LIMIT}の整数で指定してください`,
      });
    } else {
      query.limit = limit;
    }
  }

  return { valid: details.length === 0, details, query };
};
