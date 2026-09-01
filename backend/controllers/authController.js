import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import * as userRepository from "../repositories/userRepository.js";
import { validateRegister, validateLogin } from "../validators/authValidator.js";
import { validationError, conflictError, invalidCredentialsError } from "../utils/AppError.js";

/**
 * register / login controller。
 *
 * 2026-08、User モデルへ直接アクセスしていたのを他のcontrollerと同じ
 * 「controller → repository」の層構造へ揃え、try/catchでの独自エラー
 * 応答もやめてAppErrorを投げる形にした（coffeeRecordController.jsと
 * 同じ方針。Express 5はasyncハンドラのrejectを自動でerrorHandlerへ渡す）。
 */

// ユーザーが存在しない場合でもbcrypt.compareを必ず1回実行するためのダミーハッシュ。
// 実在するパスワードのハッシュ値ではない（"never-a-real-password"を
// bcryptでハッシュ化しただけの固定値）。loginUser参照
const DUMMY_PASSWORD_HASH = "$2b$10$qaNUWn1/W0VCMsV2y.nO..eh/Lbh31ub9zW2c85h6z0K/sN4Y2YCW";

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const createAuthResponse = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  token: createToken(user._id),
});

export const registerUser = async (req, res) => {
  const { valid, details } = validateRegister(req.body);
  if (!valid) throw validationError(details);

  const { name, password } = req.body;
  // 2026-08、User.jsのemail lowercase:trueはドキュメントの保存時にしか
  // 適用されない（findOneのクエリ条件までは正規化されない）ため、
  // 検索・作成どちらでも同じ正規化済みemailを使う必要がある
  const email = req.body.email.trim().toLowerCase();

  const existingUser = await userRepository.findByEmail(email);
  if (existingUser) throw conflictError("このメールアドレスは既に登録されています");

  // ハッシュ化はUser.js（pre-saveフック）が行う
  const user = await userRepository.create({ name, email, password });

  res.status(201).json(createAuthResponse(user));
};

export const loginUser = async (req, res) => {
  const { valid, details } = validateLogin(req.body);
  if (!valid) throw validationError(details);

  const { password } = req.body;
  const email = req.body.email.trim().toLowerCase();

  const user = await userRepository.findByEmail(email);

  // 2026-08、ユーザーが存在しない場合に即座に401を返していたため、
  // 「存在する場合はbcrypt.compareの分だけ応答が遅い」というタイミング
  // サイドチャネルで登録済みメールアドレスを推測できた。ユーザーの
  // 有無に関わらず必ずbcrypt.compareを1回実行することで解消する
  // （存在しない場合はDUMMY_PASSWORD_HASHと比較。どうせ一致しない）
  const isPasswordMatch = await bcrypt.compare(
    password,
    user ? user.password : DUMMY_PASSWORD_HASH,
  );

  if (!user || !isPasswordMatch) throw invalidCredentialsError();

  res.json(createAuthResponse(user));
};
