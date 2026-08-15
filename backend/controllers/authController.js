import bcrypt from "bcryptjs";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import { validateRegister, validateLogin } from "../validators/authValidator.js";

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

    const { name, email, password } = req.body;

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

    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isPasswordMatch = await bcrypt.compare(password, user.password);

    if (!isPasswordMatch) {
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
