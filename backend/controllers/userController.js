const bcrypt = require("bcryptjs");
const User = require("../models/User");
const FavoritePlayer = require("../models/FavoritePlayer");

const createUserResponse = (user) => {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    favoriteTeam: user.favoriteTeam,
    hasCompletedOnboarding: user.hasCompletedOnboarding,
    avatarUrl: user.avatarUrl || "",
  };
};

const getMe = async (req, res) => {
  res.json(createUserResponse(req.user));
};

const updateFavoriteTeam = async (req, res) => {
  try {
    const { favoriteTeam } = req.body;

    if (!favoriteTeam || !favoriteTeam.id || !favoriteTeam.name) {
      return res.status(400).json({ message: "Favorite team is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        favoriteTeam: {
          id: Number(favoriteTeam.id),
          name: favoriteTeam.name,
          abbreviation: favoriteTeam.abbreviation || "",
        },
      },
      {
        new: true,
        runValidators: true,
      },
    ).select("-password");

    res.json(createUserResponse(user));
  } catch (error) {
    console.error("Update favorite team error:", error.message);
    res.status(400).json({ message: "Failed to update favorite team" });
  }
};

const completeOnboarding = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        hasCompletedOnboarding: true,
      },
      {
        new: true,
      },
    ).select("-password");

    res.json(createUserResponse(user));
  } catch (error) {
    console.error("Complete onboarding error:", error.message);
    res.status(400).json({ message: "Failed to complete onboarding" });
  }
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

const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatarUrl },
      { new: true },
    ).select("-password");

    res.json(createUserResponse(user));
  } catch (error) {
    console.error("Upload avatar error:", error.message);
    res.status(500).json({ message: "Failed to upload avatar" });
  }
};

const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Both current and new password are required" });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error.message);
    res.status(500).json({ message: "Failed to change password" });
  }
};

const deleteAccount = async (req, res) => {
  try {
    await FavoritePlayer.deleteMany({ user: req.user._id });
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Delete account error:", error.message);
    res.status(500).json({ message: "Failed to delete account" });
  }
};

module.exports = {
  changePassword,
  completeOnboarding,
  deleteAccount,
  getMe,
  updateFavoriteTeam,
  updateProfile,
  uploadAvatar,
};
