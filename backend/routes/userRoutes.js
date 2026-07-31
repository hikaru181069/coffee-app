const express = require("express");
const { protect } = require("../middleware/authMiddleware");
const upload = require("../middleware/uploadMiddleware");
const {
  changePassword,
  completeOnboarding,
  deleteAccount,
  getMe,
  updateFavoriteTeam,
  updateProfile,
  uploadAvatar,
} = require("../controllers/userController");

const router = express.Router();

router.get("/me", protect, getMe);
router.patch("/me", protect, updateProfile);
router.patch("/me/favorite-team", protect, updateFavoriteTeam);
router.patch("/me/onboarding-complete", protect, completeOnboarding);
router.patch("/me/password", protect, changePassword);
router.post("/me/avatar", protect, upload.single("avatar"), uploadAvatar);
router.delete("/me", protect, deleteAccount);

module.exports = router;
