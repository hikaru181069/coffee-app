import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { validateRegister, validateLogin } from "../validators/authValidator.js";

// ユーザーが存在しない場合でもbcrypt.compareを必ず1回実行するためのダミーハッシュ。
// 実在するパスワードのハッシュ値ではない（"never-a-real-password"を
// bcryptでハッシュ化しただけの固定値）。loginUser参照
const DUMMY_PASSWORD_HASH = "$2b$10$qaNUWn1/W0VCMsV2y.nO..eh/Lbh31ub9zW2c85h6z0K/sN4Y2YCW";

const createToken = (userId) => {
  return jwt.sign(
    {
      userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

const createAuthResponse = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    token: createToken(user._id),
  };
};

const registerUser = async (req, res) => {
  try {
    const { valid, details } = validateRegister(req.body);
    if (!valid) {
      return res.status(400).json({ message: details[0].message, details });
    }

    const { name, password } = req.body;
    // 2026-08、User.jsのemail lowercase:trueはドキュメントの保存時にしか
    // 適用されない（findOneのクエリ条件までは正規化されない）ため、
    // 検索・作成どちらでも同じ正規化済みemailを使う必要がある
    const email = req.body.email.trim().toLowerCase();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ハッシュ化はUser.js（pre-saveフック）が行う
    const user = await User.create({
      name,
      email,
      password,
    });

    res.status(201).json(createAuthResponse(user));
  } catch (error) {
    console.error("Register user error:", error.message);
    res.status(500).json({ message: "Failed to register user" });
  }
};

const loginUser = async (req, res) => {
  try {
    const { valid, details } = validateLogin(req.body);
    if (!valid) {
      return res.status(400).json({ message: details[0].message, details });
    }

    const { password } = req.body;
    const email = req.body.email.trim().toLowerCase();

    const user = await User.findOne({ email });

    // 2026-08、ユーザーが存在しない場合に即座に401を返していたため、
    // 「存在する場合はbcrypt.compareの分だけ応答が遅い」というタイミング
    // サイドチャネルで登録済みメールアドレスを推測できた。ユーザーの
    // 有無に関わらず必ずbcrypt.compareを1回実行することで解消する
    // （存在しない場合はDUMMY_PASSWORD_HASHと比較。どうせ一致しない）
    const isPasswordMatch = await bcrypt.compare(password, user ? user.password : DUMMY_PASSWORD_HASH);

    if (!user || !isPasswordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json(createAuthResponse(user));
  } catch (error) {
    console.error("Login user error:", error.message);
    res.status(500).json({ message: "Failed to login" });
  }
};

export {
  registerUser,
  loginUser,
};
