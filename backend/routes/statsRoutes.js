const express = require("express");
const { getLeaders, getHotPlayers, getRisingStars } = require("../controllers/statsController");

const router = express.Router();

router.get("/leaders", getLeaders);
router.get("/hot", getHotPlayers);
router.get("/rising-stars", getRisingStars);

module.exports = router;

// 年度別成績（statsRoutes に追加）
