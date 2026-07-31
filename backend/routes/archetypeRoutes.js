const express = require("express");
const { getPlayersByArchetype } = require("../controllers/archetypeController");

const router = express.Router();

// GET /api/archetype/:type
// 例: /api/archetype/power-hitter → Power Hitter の選手一覧
router.get("/:type", getPlayersByArchetype);

module.exports = router;
