import express from "express";
import { getPlayersByPosition } from "../controllers/positionController.js";

const router = express.Router();

// GET /api/positions/:position
router.get("/:position", getPlayersByPosition);

export default router;