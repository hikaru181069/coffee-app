const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

const {
  getPlayers,
  createPlayer,
  searchPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
} = require("../controllers/playerController");

router.get("/", getPlayers);
router.post("/", protect, createPlayer);
router.get("/search", searchPlayers);
router.get("/:id", getPlayerById);
router.put("/:id", protect, updatePlayer);
router.delete("/:id", protect, deletePlayer);

module.exports = router;
