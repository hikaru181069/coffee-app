import express from "express";
import { getMatchupStats, getMatchupPrediction } from "../controllers/matchupController.js";

const router = express.Router();

// GET /api/matchup?pitcherId=X&batterId=Y
router.get("/", getMatchupStats);

// GET /api/matchup/predict?pitcherId=X&batterId=Y
router.get("/predict", getMatchupPrediction);

export default router;