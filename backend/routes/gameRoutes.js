import express from "express";
import { getGame, getGamePlays, getGameHighlights } from "../controllers/gameController.js";

const router = express.Router();

router.get("/:gamePk/plays", getGamePlays);
router.get("/:gamePk/highlights", getGameHighlights);
router.get("/:gamePk", getGame);

export default router;