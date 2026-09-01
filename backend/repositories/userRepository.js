import User from "../models/User.js";

/**
 * User へのDB問い合わせ。
 *
 * coffeeRecordRepository.js と同じ役割: 引数で受け取った条件をそのまま
 * クエリにするだけで、業務判断（存在チェック・パスワード照合等）は
 * controller/serviceの担当。
 */

export const findByEmail = (email) => User.findOne({ email });

export const findById = (userId) => User.findById(userId);

export const create = (data) => User.create(data);

/** 名前だけを更新し、更新後のドキュメント（パスワード除く）を返す */
export const updateName = (userId, name) =>
  User.findByIdAndUpdate(
    userId,
    { name },
    { returnDocument: "after", runValidators: true },
  ).select("-password");

export const deleteById = (userId) => User.findByIdAndDelete(userId);
