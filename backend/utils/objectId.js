import mongoose from "mongoose";

/**
 * MongoDBのObjectIdを扱う境界をここに集約する（CLAUDE.md の Implementation Rules）。
 *
 * ObjectIdは「24桁の16進数文字列」としてHTTP境界を行き来し、
 * DB境界では ObjectId 型として扱う。この変換と判定を各所に散らすと、
 * 不正な文字列がそのままMongooseへ渡って CastError（=500）になりやすい。
 */

/**
 * ObjectIdとして解釈できる文字列かを判定する。
 *
 * mongoose.isValidObjectId() を使わず自前で判定している理由:
 *   - 「24桁の16進数」という受け入れ条件がコードに明示され、
 *     Mongooseのバージョンによる判定の揺れに影響されない
 *     （実際 Mongoose 6 系では12文字の任意文字列も true になっていた）
 *   - validator は HTTP境界の純粋関数にしておきたく、
 *     文字列の形を見るだけのためにDBライブラリへ依存させたくない
 */
export const isObjectIdString = (value) =>
  typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);

/** ObjectIdインスタンスか、ObjectIdとして解釈できる文字列かを判定する */
export const isObjectIdLike = (value) =>
  value instanceof mongoose.Types.ObjectId || isObjectIdString(value);

/**
 * ObjectIdの配列から重複を取り除く。
 *
 * ObjectIdはオブジェクトなので、new Set() へそのまま入れても
 * 同じIDが別インスタンスなら重複を除去できない。文字列に直して比較する。
 * 元の並び順は保つ（ユーザーが選んだ順を表示に使えるようにするため）。
 */
export const dedupeIds = (values) => {
  if (!Array.isArray(values)) return values;

  const seen = new Set();
  const result = [];

  for (const value of values) {
    if (value === null || value === undefined) continue;

    const key = String(value);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(value);
  }

  return result;
};
