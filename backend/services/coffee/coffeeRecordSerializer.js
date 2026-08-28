/**
 * CoffeeRecord を API 応答の形へ変換する。
 *
 * なぜ専用の関数を置くのか（CLAUDE.md「MongoDBのObjectIdを文字列として
 * 扱う境界を明確にする」）:
 *   - ドキュメントをそのまま res.json() へ渡すと、__v など内部項目まで
 *     外へ出てしまい、後からスキーマを変えるたびに応答が勝手に変わる
 *   - ObjectId が文字列になるタイミングが JSON.stringify 任せになり、
 *     「どこから先が文字列か」がコードから読み取れなくなる
 *
 * ここを通ったものだけがクライアントへ出る、という一方通行にする。
 *
 * populate されている場合（originId に Origin ドキュメントが入っている）は
 * { id, name } の形へ、されていない場合はID文字列へ変換する。
 * フロントは「オブジェクトなら名前を表示、文字列ならIDだけ」と扱える。
 */

/** ObjectId でも文字列でも、確実に文字列にする */
const toIdString = (value) => (value === null || value === undefined ? null : String(value));

/**
 * 単数の参照を変換する。
 * populate 済みなら { id, name }、未populateならID文字列、未選択なら null
 *
 * countryCode は Origin モデルにしか存在しないフィールド（models/Origin.js）。
 * Variety/Process/RoastLevel/Flavor の populate 済みオブジェクトには
 * そもそもこのプロパティが無い（undefined）ため、`!== undefined`の判定だけで
 * 「Originのときだけ含める」を実現できる。世界地図機能（2026-08）で
 * countryCodeをAPI応答まで届ける必要が生じたために追加した。
 */
const serializeRef = (value) => {
  if (value === null || value === undefined) return null;

  // populate されると name を持つオブジェクトになる
  if (typeof value === "object" && value.name !== undefined) {
    const ref = { id: toIdString(value._id), name: value.name };
    if (value.countryCode !== undefined) ref.countryCode = value.countryCode;
    return ref;
  }

  return toIdString(value);
};

/** 配列の参照を変換する */
const serializeRefs = (values) => {
  if (!Array.isArray(values)) return [];
  return values.map(serializeRef);
};

/**
 * CoffeeRecord 1件を API 応答の形へ変換する。
 *
 * @param {object} record Mongooseドキュメント または lean() の結果
 */
export const serializeCoffeeRecord = (record) => {
  if (!record) return null;

  // Mongooseドキュメントなら素のオブジェクトへ。lean()済みならそのまま
  const doc = typeof record.toObject === "function" ? record.toObject() : record;

  return {
    id: toIdString(doc._id),

    title: doc.title,
    consumedAt: doc.consumedAt,
    recordType: doc.recordType,
    rating: doc.rating ?? null,
    tasteSweetness: doc.tasteSweetness ?? null,
    tasteBitterness: doc.tasteBitterness ?? null,
    tasteAcidity: doc.tasteAcidity ?? null,
    tasteBody: doc.tasteBody ?? null,
    tasteAroma: doc.tasteAroma ?? null,
    tasteAftertaste: doc.tasteAftertaste ?? null,
    notes: doc.notes ?? "",
    cafeName: doc.cafeName ?? "",
    roasterName: doc.roasterName ?? "",

    origin: serializeRef(doc.originId),
    farmName: doc.farmName ?? "",
    varieties: serializeRefs(doc.varietyIds),
    process: serializeRef(doc.processId),
    roastLevel: serializeRef(doc.roastLevelId),
    flavors: serializeRefs(doc.flavorIds),

    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };

  // userId は意図的に含めない。
  // 自分の記録しか返さないので情報としての意味が無く、
  // 他ユーザーのIDが漏れる経路を作らないため
};

/** 一覧用 */
export const serializeCoffeeRecords = (records) =>
  (records ?? []).map(serializeCoffeeRecord);
