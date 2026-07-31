import mongoose from "mongoose";
import { normalizeName } from "../utils/normalizeName.js";

/**
 * 品種（Typica, Bourbon, Geisha, SL28 など）。
 *
 * 1つの記録に複数の品種が含まれることがある（ブレンド）ため、
 * CoffeeRecord 側では varietyIds という配列で参照する。
 */
const varietySchema = new mongoose.Schema(
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
varietySchema.pre("validate", function () {
  this.normalizedName = normalizeName(this.name);
});

export default mongoose.model("Variety", varietySchema);
