import express from "express";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

import {
  getPlayers,
  createPlayer,
  searchPlayers,
  getPlayerById,
  updatePlayer,
  deletePlayer,
} from "../controllers/playerController.js";

router.get("/", getPlayers);
router.post("/", protect, createPlayer);
router.get("/search", searchPlayers);
router.get("/:id", getPlayerById);
router.put("/:id", protect, updatePlayer);
router.delete("/:id", protect, deletePlayer);

export default router;