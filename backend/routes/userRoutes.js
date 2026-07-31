import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  changePassword,
  completeOnboarding,
  deleteAccount,
  getMe,
  updateFavoriteTeam,
  updateProfile,
  uploadAvatar,
} from "../controllers/userController.js";

const router = express.Router();

router.get("/me", protect, getMe);
router.patch("/me", protect, updateProfile);
router.patch("/me/favorite-team", protect, updateFavoriteTeam);
router.patch("/me/onboarding-complete", protect, completeOnboarding);
router.patch("/me/password", protect, changePassword);
router.post("/me/avatar", protect, upload.single("avatar"), uploadAvatar);
router.delete("/me", protect, deleteAccount);

export default router;