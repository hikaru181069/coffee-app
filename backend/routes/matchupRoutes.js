const express = require("express");
const { getMatchupStats, getMatchupPrediction } = require("../controllers/matchupController");

const router = express.Router();

// GET /api/matchup?pitcherId=X&batterId=Y
router.get("/", getMatchupStats);

// GET /api/matchup/predict?pitcherId=X&batterId=Y
router.get("/predict", getMatchupPrediction);

module.exports = router;
