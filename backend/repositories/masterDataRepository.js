import Origin from "../models/Origin.js";
import Variety from "../models/Variety.js";
import Process from "../models/Process.js";
import RoastLevel from "../models/RoastLevel.js";
import Flavor from "../models/Flavor.js";

/**
 * マスターデータ（産地・品種・精製方法・焙煎度・フレーバー）へのDB問い合わせ。
 *
 * repository層の役割は「MongoDBの問い合わせ方を隠すこと」。
 * service層が Mongoose のクエリを直接書かなくて済むようにし、
 * 将来クエリを変えたときの影響範囲をこのファイルに閉じ込める。
 *
 * 5種類のマスターは形がほぼ同じなので、type をキーにしたマップで扱う。
 * docs/api.md のパス（/master-data/origins など）とこの type が対応する。
 */

/** 焙煎度だけスキーマが異なる（normalizedName を持たず、key と order を持つ） */
export const MASTER_TYPES = {
  origins: {
    model: Origin,
    // 一覧の既定の並び順。焙煎度以外は名前順が自然
    defaultSort: { name: 1 },
  },
  varieties: { model: Variety, defaultSort: { name: 1 } },
  processes: { model: Process, defaultSort: { name: 1 } },
  roastLevels: { model: RoastLevel, defaultSort: { order: 1 } },
  flavors: { model: Flavor, defaultSort: { name: 1 } },
};

/** 有効な master type かどうか（controllerがパスを検証するのに使う） */
export const isMasterType = (type) =>
  Object.prototype.hasOwnProperty.call(MASTER_TYPES, type);

const getConfig = (type) => {
  if (!isMasterType(type)) {
    throw new Error(`Unknown master data type: ${type}`);
  }
  return MASTER_TYPES[type];
};

/**
 * 1種類のマスターを一覧取得する。
 *
 * @param {string} type   MASTER_TYPES のキー
 * @param {object} options
 * @param {string} [options.search] 名前の部分一致検索
 * @param {number} [options.limit]  取得件数の上限
 */
export const findMany = async (type, { search, limit } = {}) => {
  const { model, defaultSort } = getConfig(type);

  const filter = {};
  if (search && search.trim() !== "") {
    // 正規表現の特殊文字をエスケープしてから部分一致にする。
    // 未検証の入力をそのままクエリへ渡さないため（docs/architecture.md Security）。
    const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.name = { $regex: escaped, $options: "i" };
  }

  const query = model.find(filter).sort(defaultSort).lean();
  if (limit) query.limit(limit);

  return query;
};

/** 全種類のマスターをまとめて取得する（docs/api.md の GET /master-data 用） */
export const findAllTypes = async () => {
  const types = Object.keys(MASTER_TYPES);
  const results = await Promise.all(types.map((type) => findMany(type)));

  return Object.fromEntries(types.map((type, index) => [type, results[index]]));
};

/**
 * 指定したIDが実在するものだけを返す。
 *
 * CoffeeRecord作成時に「存在しない産地IDが指定されていないか」を
 * service層が確認するために使う。_id だけ取れば十分なので projection を絞る。
 */
export const findExistingIds = async (type, ids) => {
  if (!Array.isArray(ids) || ids.length === 0) return [];

  const { model } = getConfig(type);
  const docs = await model.find({ _id: { $in: ids } }, { _id: 1 }).lean();

  return docs.map((doc) => String(doc._id));
};

/**
 * マスターを1件 upsert する（seed用）。
 *
 * 冪等性の要: 一意キー（normalizedName / key）で検索し、
 * 無ければ挿入、あれば何もしない。何度実行しても重複しない。
 *
 * $setOnInsert を使う理由:
 *   $set にすると、実行のたびに既存ドキュメントを上書きしてしまう。
 *   seedはあくまで「初期候補を用意する」ものなので、
 *   すでにあるデータには手を触れない。
 *
 * @returns {"inserted" | "skipped"}
 */
export const upsertOne = async (type, uniqueFilter, document) => {
  const { model } = getConfig(type);

  const result = await model.updateOne(
    uniqueFilter,
    { $setOnInsert: document },
    { upsert: true },
  );

  return result.upsertedCount > 0 ? "inserted" : "skipped";
};

/** 件数を数える（seedの結果表示に使う） */
export const countAll = async (type) => {
  const { model } = getConfig(type);
  return model.countDocuments();
};
