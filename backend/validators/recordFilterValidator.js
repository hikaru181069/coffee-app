import { isObjectIdString } from "../utils/objectId.js";
import { escapeRegExp } from "../utils/escapeRegExp.js";

/**
 * CoffeeRecordの絞り込み条件（recordType・産地・農園参照・評価・期間・
 * タイトル）を検証し、Mongoの$filterへ変換する。
 *
 * 一覧API（validators/coffeeRecordQueryValidator.js）と
 * グラフAPI（validators/graphQueryValidator.js）・横断検索API
 * （services/coffee/searchService.js）は、どちらも「どの記録を対象に
 * するか」という同じ条件を検証する必要があるため、ここへ共通化した。
 * ページネーションやnodeTypesなど、各APIに固有の項目はそれぞれの
 * 呼び出し側で足す。
 *
 * 2026-08、産地・品種・精製方法・焙煎度・フレーバーの複数選択
 * （OR条件）に対応した。カンマ区切りのID列（例:
 * `?originIds=<id1>,<id2>`）を受け取り、単一IDなら等価条件、
 * 複数IDなら`$in`条件へ変換する。以前の単数形（originId/flavorId）から
 * 複数形へ改名した（フィールド名にidsの意味を持たせるため）。
 * この関数の呼び出し元は`RecordsPage.jsx`のみで、他ページからの
 * 深いリンクにこのクエリ形式へ依存する箇所は無いことを確認済み。
 */

const RECORD_TYPES = ["home", "cafe"];
// 1リクエストで指定できるIDの上限。$inクエリが際限なく膨らむのを防ぐ
const MAX_IDS_PER_FIELD = 20;

const isMissing = (value) => value === undefined || value === null || value === "";

const toInteger = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

/**
 * カンマ区切りのID列を検証し、配列へ変換する。
 * 不正な値があれば details へ積んで null を返す。
 */
const parseIdList = (rawValue, fieldName, details) => {
  const ids = String(rawValue)
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id !== "");

  if (ids.length === 0) return null;

  if (ids.length > MAX_IDS_PER_FIELD) {
    details.push({ field: fieldName, message: `${fieldName}は${MAX_IDS_PER_FIELD}件までです` });
    return null;
  }

  if (ids.some((id) => !isObjectIdString(id))) {
    details.push({ field: fieldName, message: `${fieldName}の形式が正しくありません` });
    return null;
  }

  return ids;
};

/** 単一IDなら等価条件、複数IDなら$in条件を返す（単一値の場合は素直にインデックスが効くようにする） */
const idListToCondition = (ids) => (ids.length === 1 ? ids[0] : { $in: ids });

/**
 * @param {object} rawQuery
 * @param {object} [options]
 * @param {boolean} [options.includeReferenceFilters=true]
 *   産地・品種・精製方法・焙煎度・フレーバーを検証するか。
 *   docs/api.md の GET /graph のクエリにはこれらが無いため、
 *   graphQueryValidator は false を渡す。
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
    // originId/processId/roastLevelId は単一参照だが、複数指定時は$inで
    // 「いずれかに一致」を表す。varietyIds/flavorIdsは元から配列フィールド
    // なので、$in自体が「配列がいずれかを含む」を意味し扱いは同じになる
    const referenceFields = [
      ["originIds", "originId"],
      ["processIds", "processId"],
      ["roastLevelIds", "roastLevelId"],
      ["varietyIds", "varietyIds"],
      ["flavorIds", "flavorIds"],
    ];

    for (const [queryField, filterField] of referenceFields) {
      if (isMissing(rawQuery[queryField])) continue;
      const ids = parseIdList(rawQuery[queryField], queryField, details);
      if (ids) filter[filterField] = idListToCondition(ids);
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

  // 2026-08、検索ボックスとフィルターの併用向けに追加。記録一覧の
  // フィルターとしても、横断検索（searchService.js）がアクティブな
  // フィルターの範囲内で検索するためにも使う
  if (!isMissing(rawQuery.title)) {
    if (typeof rawQuery.title !== "string") {
      details.push({ field: "title", message: "titleは文字列で指定してください" });
    } else {
      const trimmed = rawQuery.title.trim();
      if (trimmed) {
        filter.title = { $regex: escapeRegExp(trimmed), $options: "i" };
      }
    }
  }

  return { details, filter };
};
