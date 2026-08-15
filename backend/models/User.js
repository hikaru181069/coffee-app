import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

/**
 * パスワードのハッシュ化をモデル層に集約する。
 *
 * 以前はcontroller側（authController.js / userController.js）が
 * それぞれ個別にbcrypt.hashを呼んでいた。動いてはいたが、将来別の
 * 書き込み経路（管理用API・別のseedスクリプト等）が増えたとき、
 * そこでハッシュ化を書き忘れると平文パスワードがそのまま保存されて
 * しまうリスクがある。保存される直前に必ず1回通るモデルのフックへ
 * 寄せることで、書き込み経路が何であれハッシュ化を構造的に保証する。
 *
 * isModified("password")のガードが無いと、パスワード以外の項目だけ
 * 更新したときにも毎回ハッシュ化し直してしまい、ログインできなくなる
 * （既にハッシュ済みの文字列を、さらにハッシュした値で上書きするため）。
 */
userSchema.pre("save", async function hashPasswordIfModified() {
  // async関数として定義したpre-hookには、Mongooseはnextを渡さない
  // （Promiseの解決をもって完了とみなすため）。next()の呼び出しは不要
  if (!this.isModified("password")) return;

  this.password = await bcrypt.hash(this.password, 10);
});

export default mongoose.model("User", userSchema);
