import mongoose from "mongoose";
import User, { UserDocument } from "../models/User.js";

/**
 * User へのDB問い合わせ。
 *
 * coffeeRecordRepository.js と同じ役割: 引数で受け取った条件をそのまま
 * クエリにするだけで、業務判断（存在チェック・パスワード照合等）は
 * controller/serviceの担当。
 */

type UserId = string | mongoose.Types.ObjectId;

export const findByEmail = (email: string) => User.findOne({ email });

export const findById = (userId: UserId) => User.findById(userId);

export const create = (data: Partial<UserDocument>) => User.create(data);

/** 名前だけを更新し、更新後のドキュメント（パスワード除く）を返す */
export const updateName = (userId: UserId, name: string) =>
  User.findByIdAndUpdate(
    userId,
    { name },
    { returnDocument: "after", runValidators: true },
  ).select("-password");

export const deleteById = (userId: UserId) => User.findByIdAndDelete(userId);
