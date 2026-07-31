const bcrypt = require("bcryptjs");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

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
    favoriteTeam: user.favoriteTeam,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    token: createToken(user._id),
  };
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
    });

    res.status(201).json(createAuthResponse(user));
  } catch (error) {
    console.error("Register user error:", error.message);
    res.status(500).json({ message: "Failed to register user" });
  }
};

const loginUser = async (req, res) => {
  try {
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

module.exports = {
  registerUser,
  loginUser,
};
