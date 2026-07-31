import { isObjectIdString } from "../utils/objectId.js";

/**
 * CoffeeRecordの絞り込み条件（recordType・原産地・フレーバー・評価・期間）を
 * 検証し、Mongoの$filterへ変換する。
 *
 * 一覧API（validators/coffeeRecordQueryValidator.js）と
 * グラフAPI（validators/graphQueryValidator.js）は、どちらも
 * 「どの記録を対象にするか」という同じ条件を検証する必要があるため、
 * ここへ共通化した。ページネーションやnodeTypesなど、各APIに固有の
 * 項目はそれぞれの呼び出し側で足す。
 */

const RECORD_TYPES = ["home", "cafe"];

const isMissing = (value) => value === undefined || value === null || value === "";

const toInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

/**
 * @param {object} rawQuery
 * @param {object} [options]
 * @param {boolean} [options.includeReferenceFilters=true]
 *   originId / flavorId を検証するか。docs/api.md の GET /graph の
 *   クエリにはこの2つが無いため、graphQueryValidator は false を渡す。
 * @returns {{ details: Array, filter: object }}
 */
export const validateRecordFilterQuery = (
  rawQuery = {},
  { includeReferenceFilters = true } = {},
) => {
  const details = [];
  const filter = {};

  if (!isMissing(rawQuery.recordType)) {
    if (!RECORD_TYPES.includes(rawQuery.recordType)) {
      details.push({
        field: "recordType",
        message: `recordTypeは ${RECORD_TYPES.join(" または ")} を指定してください`,
      });
    } else {
      filter.recordType = rawQuery.recordType;
    }
  }

  if (includeReferenceFilters) {
    if (!isMissing(rawQuery.originId)) {
      if (!isObjectIdString(rawQuery.originId)) {
        details.push({ field: "originId", message: "originIdの形式が正しくありません" });
      } else {
        filter.originId = rawQuery.originId;
      }
    }

    if (!isMissing(rawQuery.flavorId)) {
      if (!isObjectIdString(rawQuery.flavorId)) {
        details.push({ field: "flavorId", message: "flavorIdの形式が正しくありません" });
      } else {
        // flavorIds は配列なので、値を1つ指定すると「含む」条件になる
        filter.flavorIds = rawQuery.flavorId;
      }
    }
  }

  if (!isMissing(rawQuery.ratingMin)) {
    const ratingMin = toInteger(rawQuery.ratingMin);
    if (ratingMin === null || ratingMin < 1 || ratingMin > 5) {
      details.push({
        field: "ratingMin",
        message: "ratingMinは1〜5の整数で指定してください",
      });
    } else {
      filter.rating = { $gte: ratingMin };
    }
  }

  // dateFrom と dateTo は同じ consumedAt に対する条件なので、
  // 片方ずつ組み立てて最後にまとめる
  const consumedAt = {};

  if (!isMissing(rawQuery.dateFrom)) {
    const from = new Date(rawQuery.dateFrom);
    if (Number.isNaN(from.getTime())) {
      details.push({ field: "dateFrom", message: "dateFromの形式が正しくありません" });
    } else {
      consumedAt.$gte = from;
    }
  }

  if (!isMissing(rawQuery.dateTo)) {
    const to = new Date(rawQuery.dateTo);
    if (Number.isNaN(to.getTime())) {
      details.push({ field: "dateTo", message: "dateToの形式が正しくありません" });
    } else {
      consumedAt.$lte = to;
    }
  }

  if (consumedAt.$gte && consumedAt.$lte && consumedAt.$gte > consumedAt.$lte) {
    details.push({ field: "dateFrom", message: "開始日が終了日より後になっています" });
  }

  if (Object.keys(consumedAt).length > 0) {
    filter.consumedAt = consumedAt;
  }

  return { details, filter };
};
