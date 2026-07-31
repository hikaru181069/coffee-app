const express = require("express");
const { getPlayersByPosition } = require("../controllers/positionController");

const router = express.Router();

// GET /api/positions/:position
router.get("/:position", getPlayersByPosition);

module.exports = router;
