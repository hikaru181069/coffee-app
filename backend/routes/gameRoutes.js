const express = require("express");
const { getGame, getGamePlays, getGameHighlights } = require("../controllers/gameController");

const router = express.Router();

router.get("/:gamePk/plays", getGamePlays);
router.get("/:gamePk/highlights", getGameHighlights);
router.get("/:gamePk", getGame);

module.exports = router;
