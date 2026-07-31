const express = require("express");
const { getCompareAnalysis } = require("../controllers/compareController");

const router = express.Router();

// GET /api/compare/analyze?p1=660271&p2=592450
router.get("/analyze", getCompareAnalysis);

module.exports = router;
