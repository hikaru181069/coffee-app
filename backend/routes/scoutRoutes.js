const express = require("express");
const { getScoutingReport } = require("../controllers/scoutController");

const router = express.Router();

router.get("/:playerId", getScoutingReport);

module.exports = router;
