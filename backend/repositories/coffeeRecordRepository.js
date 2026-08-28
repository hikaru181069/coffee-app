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

/**
 * 参照しているマスターデータの名前を一緒に引く。
 *
 * 画面は産地IDではなく「Ethiopia」を表示したいので、
 * IDだけ返すとフロントが5種類のマスターを別途取得して突き合わせる
 * ことになる。1回の問い合わせで名前まで解決する。
 *
 * 取得するのは _id と name（焙煎度は order、産地は countryCode も）だけに
 * 絞る。一覧で20件返すとマスターの結合も20件分走るため、
 * 使わない項目まで運ばない。
 *
 * countryCodeは世界地図機能（2026-08）向け。coffeeRecordSerializer.jsの
 * serializeRefはpopulate済みオブジェクトが持つフィールドしか転記できない
 * ため、ここで選択し忘れると常にnullになる（実際に踏んだ不具合）。
 */
const withMasterData = (query) =>
  query
    .populate("originId", "name countryCode")
    .populate("varietyIds", "name")
    .populate("processId", "name")
    .populate("roastLevelId", "name order")
    .populate("flavorIds", "name category");

/** 記録を1件作成する */
export const create = (data) => CoffeeRecord.create(data);

/**
 * 記録を1件取得する。
 *
 * recordId だけでなく userId も条件に入れる。
 * こうすると他ユーザーの記録は「見つからない」扱いになり、
 * 呼び出し側が所有者確認を忘れても情報が漏れない。
 */
export const findOneByIdForUser = (recordId, userId, { populate = false } = {}) => {
  const query = CoffeeRecord.findOne({ _id: recordId, userId });
  return populate ? withMasterData(query) : query;
};

/**
 * 自分の記録を取得する。
 *
 * sort は呼び出し側（service）が組み立てたものを受け取る。
 * ここで既定値を持つと「どの並び順が使われるか」が2か所に散るため。
 */
export const findManyForUser = (
  userId,
  { filter = {}, sort = { consumedAt: -1 }, skip = 0, limit = 20, populate = false } = {},
) => {
  const query = CoffeeRecord.find({ userId, ...filter }).sort(sort).skip(skip).limit(limit);
  return populate ? withMasterData(query) : query;
};

/** ページネーションの total を出すための件数取得 */
export const countForUser = (userId, filter = {}) =>
  CoffeeRecord.countDocuments({ userId, ...filter });

/**
 * 自分の記録を全件取得する（知識グラフ生成用）。
 *
 * グラフは「自分の記録すべて」から導出するのでページネーションしない
 * （docs/knowledge-graph.md の Graph Generation）。
 * populate はデフォルトで有効にしている。グラフのノードラベルは
 * 産地・品種などの「名前」を必要とし、IDのままでは使えないため。
 */
export const findAllForUser = (userId, filter = {}, { populate = true } = {}) => {
  const query = CoffeeRecord.find({ userId, ...filter }).sort({ consumedAt: -1 });
  return populate ? withMasterData(query) : query;
};

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
