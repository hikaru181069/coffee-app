const express = require("express");
const { getSimilarPlayers } = require("../controllers/similarPlayerController");

const router = express.Router();

// GET /api/similar-players/:playerId
router.get("/:playerId", getSimilarPlayers);

module.exports = router;
