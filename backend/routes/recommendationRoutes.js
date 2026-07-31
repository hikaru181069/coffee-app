import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getFutureStars,
  getRecommendations,
  getQuizRecommendations,
  getProspectRecommendations,
  getForYouRecommendations,
} from "../controllers/recommendationController.js";

const router = express.Router();

router.get("/foryou", protect, getForYouRecommendations);
router.get("/future-stars", protect, getFutureStars);
router.get("/quiz", protect, getQuizRecommendations);
router.get("/prospects", protect, getProspectRecommendations);
router.get("/", protect, getRecommendations);

export default router;