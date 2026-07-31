import mongoose from "mongoose";
import { normalizeName } from "../utils/normalizeName.js";

/**
 * 精製方法（Washed, Natural, Honey, Anaerobic など）。
 *
 * 収穫したコーヒーの実から種子（豆）を取り出す工程の違い。
 * 味への影響が大きく、ユーザーの好みが出やすい要素なので
 * 知識グラフの主要なノード種別のひとつにしている。
 */
const processSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    normalizedName: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
  },
  { timestamps: true },
);

// フックの実行条件については models/Origin.js の同じ箇所のコメントを参照
processSchema.pre("validate", function () {
  this.normalizedName = normalizeName(this.name);
});

// コレクション名は "processes"（Mongooseが自動で複数形にする）
export default mongoose.model("Process", processSchema);
