/**
 * マスターデータを API 応答の形へ変換する。
 *
 * coffeeRecordSerializer.js と同じ理由でここを通す。
 * とくにマスターは、そのまま返すと内部項目が外へ出てしまう:
 *
 *   - normalizedName … 重複判定のための内部表現。クライアントには不要で、
 *                       公開すると「正規化の仕様」がAPIの一部になってしまう
 *   - __v            … Mongooseのバージョンキー
 *
 * IDの項目名も _id ではなく id にそろえる。
 * CoffeeRecord の応答が id を使っているので、フロント側で
 * 「マスターだけ _id」という例外を覚えなくて済むようにする。
 */

const toIdString = (value) => (value === null || value === undefined ? null : String(value));

/** 名前だけを持つマスター（品種・精製方法） */
const serializeNamed = (doc) => ({
  id: toIdString(doc._id),
  name: doc.name,
});

const serializeOrigin = (doc) => ({
  ...serializeNamed(doc),
  countryCode: doc.countryCode ?? null,
});

const serializeFlavor = (doc) => ({
  ...serializeNamed(doc),
  category: doc.category ?? null,
});

const serializeRoastLevel = (doc) => ({
  ...serializeNamed(doc),
  // key と order は画面が使う。key は値の識別、order は並び順の維持
  key: doc.key,
  order: doc.order,
});

/** マスターの種類ごとの変換関数。repository の MASTER_TYPES と同じキーを使う */
const SERIALIZERS = {
  origins: serializeOrigin,
  varieties: serializeNamed,
  processes: serializeNamed,
  roastLevels: serializeRoastLevel,
  flavors: serializeFlavor,
};

/** 1種類のマスター配列を変換する */
export const serializeMasterData = (type, docs) => {
  const serializer = SERIALIZERS[type];
  if (!serializer) return [];

  return (docs ?? []).map(serializer);
};

/** 全種類をまとめた形（GET /api/master-data）を変換する */
export const serializeAllMasterData = (byType) =>
  Object.fromEntries(
    Object.entries(byType ?? {}).map(([type, docs]) => [
      type,
      serializeMasterData(type, docs),
    ]),
  );
