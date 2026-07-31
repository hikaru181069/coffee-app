import mongoose from "mongoose";
import { normalizeName } from "../utils/normalizeName.js";

/**
 * フレーバー（citrus, berry, chocolate など）。
 *
 * 1つの記録に複数付くため、CoffeeRecord 側では flavorIds という配列で参照する。
 * category は「fruity」「sweet」のような大分類で、
 * 将来グラフの色分けやフィルターに使えるようにした任意項目。
 */
const flavorSchema = new mongoose.Schema(
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
    category: {
      type: String,
      default: null,
      trim: true,
      maxlength: 50,
    },
  },
  { timestamps: true },
);

// フックの実行条件については models/Origin.js の同じ箇所のコメントを参照
flavorSchema.pre("validate", function () {
  this.normalizedName = normalizeName(this.name);
});

export default mongoose.model("Flavor", flavorSchema);
