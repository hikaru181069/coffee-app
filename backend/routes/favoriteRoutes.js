const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  getFavorites,
  createFavorite,
  createManyFavorites,
  updateFavorite,
  deleteFavorite,
} = require("../controllers/favoriteController");

const router = express.Router();

router.get("/", protect, getFavorites);
router.post("/", protect, createFavorite);
router.post("/bulk", protect, createManyFavorites);
router.put("/:id", protect, updateFavorite);
router.delete("/:id", protect, deleteFavorite);

module.exports = router;
