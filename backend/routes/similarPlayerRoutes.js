import express from "express";
import { getSimilarPlayers } from "../controllers/similarPlayerController.js";

const router = express.Router();

// GET /api/similar-players/:playerId
router.get("/:playerId", getSimilarPlayers);

export default router;