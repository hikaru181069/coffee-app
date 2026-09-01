import bcrypt from "bcryptjs";
import * as userRepository from "../repositories/userRepository.js";
import * as coffeeRecordRepository from "../repositories/coffeeRecordRepository.js";
import { validateUpdateProfile, validateChangePassword } from "../validators/userValidator.js";
import { validationError, invalidCurrentPasswordError } from "../utils/AppError.js";

/**
 * ログイン中ユーザー自身のプロフィールを扱うcontroller。
 *
 * 2026-08、User/CoffeeRecordモデルへ直接アクセスしていたのを
 * authController.jsと同じくrepository経由・AppError投げっぱなしの形へ
 * 揃えた。
 */

const createUserResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
});

export const getMe = async (req, res) => {
  res.json(createUserResponse(req.user));
};

export const updateProfile = async (req, res) => {
  const { valid, details } = validateUpdateProfile(req.body);
  if (!valid) throw validationError(details);

  const user = await userRepository.updateName(req.user._id, req.body.name.trim());

  res.json(createUserResponse(user));
};

export const changePassword = async (req, res) => {
  const { valid, details } = validateChangePassword(req.body);
  if (!valid) throw validationError(details);

  const { currentPassword, newPassword } = req.body;

  const user = await userRepository.findById(req.user._id);
  const isMatch = await bcrypt.compare(currentPassword, user.password);

  // 2026-08、以前は401を返していたが、「現在のパスワードが違う」は
  // トークンの有効性とは無関係の入力内容の問題。401のままだと
  // フロントの共通クライアント（httpClient.js）が自動ログアウトして
  // しまうため400にした（AppError.jsのinvalidCurrentPasswordError参照）
  if (!isMatch) throw invalidCurrentPasswordError();

  // ハッシュ化はUser.js（pre-saveフック）が行う
  user.password = newPassword;
  await user.save();

  res.json({ message: "Password updated successfully" });
};

export const deleteAccount = async (req, res) => {
  // ユーザーを消すだけだと記録が持ち主のいないデータとして残ってしまうので、
  // 自分の記録も一緒に削除する
  await coffeeRecordRepository.deleteAllForUser(req.user._id);
  await userRepository.deleteById(req.user._id);

  res.json({ message: "Account deleted successfully" });
};
