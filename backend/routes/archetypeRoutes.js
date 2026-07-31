import express from "express";
import { getPlayersByArchetype } from "../controllers/archetypeController.js";

const router = express.Router();

// GET /api/archetype/:type
// 例: /api/archetype/power-hitter → Power Hitter の選手一覧
router.get("/:type", getPlayersByArchetype);

export default router;