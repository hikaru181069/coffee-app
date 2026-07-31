import mongoose from "mongoose";
import { normalizeName } from "../utils/normalizeName.js";

/**
 * 産地（コーヒー豆の生産国・地域）。
 *
 * CoffeeRecord から参照される。自由入力ではなく参照にする理由は
 * docs/database.md「Why References」を参照。
 */
const originSchema = new mongoose.Schema(
  {
    // 画面に表示する名前。ユーザーが入力した見た目を保つ
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    // 重複判定・検索用の正規化した名前。unique はこちらに張る
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    // ISO 3166-1 alpha-2（例: ET, KE）。将来の地図表示を見据えた任意項目
    countryCode: {
      type: String,
      default: null,
      uppercase: true,
      trim: true,
      maxlength: 2,
    },
  },
  { timestamps: true },
);

// name から normalizedName を必ず導出する。
// service側で入れ忘れても表記揺れが混入しないよう、モデル側で保証する。
//
// 注意: このフックは save() や await doc.validate() では実行されるが、
// 同期版の doc.validateSync() では実行されない（Mongooseの仕様）。
// テストで正規化を確認する場合は await doc.validate() を使うこと。
// また updateOne(upsert) はドキュメントを作らないためフックも走らない。
// seeds/seedMasterData.js は normalizedName を自分で計算して渡している。
originSchema.pre("validate", function () {
  this.normalizedName = normalizeName(this.name);
});

export default mongoose.model("Origin", originSchema);
