import express from "express";
import { getStandings, getScores, getWildCard } from "../controllers/leagueController.js";

const router = express.Router();

// GET /api/league/standings?season=YYYY
router.get("/standings", getStandings);
// GET /api/league/scores?date=YYYY-MM-DD
router.get("/scores", getScores);
router.get("/wildcard", getWildCard);

export default router;