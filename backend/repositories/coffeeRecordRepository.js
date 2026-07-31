import CoffeeRecord from "../models/CoffeeRecord.js";

/**
 * CoffeeRecord へのDB問い合わせ。
 *
 * Phase 1 では「土台」だけを用意する。
 * CRUD APIの組み立て（フィルター構築・ページネーション・所有者確認）は
 * Phase 2（prompts/02-coffee-record-api.md）で service 側に足していく。
 *
 * この層の約束:
 *   - 引数で受け取った条件をそのままクエリにする。業務判断はしない
 *   - 所有者確認（userId の一致）は必ず呼び出し側から userId を受け取って行う。
 *     「自分の記録だけ」を保証する場所を1か所に固定するため
 */

/** 記録を1件作成する */
export const create = (data) => CoffeeRecord.create(data);

/**
 * 記録を1件取得する。
 *
 * recordId だけでなく userId も条件に入れる。
 * こうすると他ユーザーの記録は「見つからない」扱いになり、
 * 呼び出し側が所有者確認を忘れても情報が漏れない。
 */
export const findOneByIdForUser = (recordId, userId) =>
  CoffeeRecord.findOne({ _id: recordId, userId });

/** 自分の記録を新しい順に取得する */
export const findManyForUser = (userId, { filter = {}, skip = 0, limit = 20 } = {}) =>
  CoffeeRecord.find({ userId, ...filter })
    .sort({ consumedAt: -1 })
    .skip(skip)
    .limit(limit);

/** ページネーションの total を出すための件数取得 */
export const countForUser = (userId, filter = {}) =>
  CoffeeRecord.countDocuments({ userId, ...filter });

/**
 * 自分の記録を全件取得する（知識グラフ生成用）。
 *
 * グラフは「自分の記録すべて」から導出するのでページネーションしない
 * （docs/knowledge-graph.md の Graph Generation）。
 * Phase 4 で graphService から使う。
 */
export const findAllForUser = (userId, filter = {}) =>
  CoffeeRecord.find({ userId, ...filter }).sort({ consumedAt: -1 });

/** 記録を1件更新する。他ユーザーの記録は更新できない */
export const updateOneForUser = (recordId, userId, update) =>
  CoffeeRecord.findOneAndUpdate({ _id: recordId, userId }, update, {
    // 更新後のドキュメントを返す（Mongoose 9 では new: true ではなくこちら）
    returnDocument: "after",
    // update経由ではスキーマのvalidationが既定で走らないため明示的に有効にする
    runValidators: true,
  });

/** 記録を1件削除する。他ユーザーの記録は削除できない */
export const deleteOneForUser = (recordId, userId) =>
  CoffeeRecord.findOneAndDelete({ _id: recordId, userId });
