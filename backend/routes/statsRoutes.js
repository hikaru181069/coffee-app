import express from "express";
import { getLeaders, getHotPlayers, getRisingStars } from "../controllers/statsController.js";

const router = express.Router();

router.get("/leaders", getLeaders);
router.get("/hot", getHotPlayers);
router.get("/rising-stars", getRisingStars);

export default router;
// 年度別成績（statsRoutes に追加）
