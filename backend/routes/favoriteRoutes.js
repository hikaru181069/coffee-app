import express from "express";
import { protect } from "../middleware/authMiddleware.js";

import {
  getFavorites,
  createFavorite,
  createManyFavorites,
  updateFavorite,
  deleteFavorite,
} from "../controllers/favoriteController.js";

const router = express.Router();

router.get("/", protect, getFavorites);
router.post("/", protect, createFavorite);
router.post("/bulk", protect, createManyFavorites);
router.put("/:id", protect, updateFavorite);
router.delete("/:id", protect, deleteFavorite);

export default router;