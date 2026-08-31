import bcrypt from "bcryptjs";
import User from "../models/User.js";
import CoffeeRecord from "../models/CoffeeRecord.js";

const createUserResponse = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
  };
};

const getMe = async (req, res) => {
  res.json(createUserResponse(req.user));
};

const updateProfile = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Name is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name: name.trim() },
      { new: true, runValidators: true },
    ).select("-password");

    res.json(createUserResponse(user));
  } catch (error) {
    console.error("Update profile error:", error.message);
    res.status(400).json({ message: "Failed to update profile" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    // 2026-08、型チェックが無く、オブジェクト等を送るとnewPassword.lengthが
    // undefinedになりチェックをすり抜けたり、bcrypt.hashに非文字列が渡ったり
    // していた（validateLogin.jsの型チェックと同じ考え方）
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ message: "Both current and new password must be strings" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // ハッシュ化はUser.js（pre-saveフック）が行う
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error.message);
    res.status(500).json({ message: "Failed to change password" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    // ユーザーを消すだけだと記録が持ち主のいないデータとして残ってしまうので、
    // 自分の記録も一緒に削除する
    await CoffeeRecord.deleteMany({ userId: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error.message);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

export { changePassword, deleteAccount, getMe, updateProfile };
