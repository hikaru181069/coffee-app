import mongoose from "mongoose";

/**
 * 焙煎度（light 〜 dark）。
 *
 * 他のマスターと違い normalizedName を持たない。理由:
 *   - 値が light / medium-light / medium / medium-dark / dark に固定されており、
 *     ユーザーが自由に増やす想定がない
 *   - 「浅い→深い」という順序があり、画面でその順に並べたい
 *
 * そのため、機械が使う識別子 key（unique）と、並び順 order を持たせている。
 * name は表示用で、将来の多言語化でここだけ差し替えられる。
 */
const roastLevelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50,
  },
  key: {
    type: String,
    required: true,
    unique: true,
    index: true,
    trim: true,
    lowercase: true,
    maxlength: 50,
  },
  // 浅煎りを小さい数字にする。並べ替えのためだけに使う
  order: {
    type: Number,
    required: true,
  },
});

export default mongoose.model("RoastLevel", roastLevelSchema);
