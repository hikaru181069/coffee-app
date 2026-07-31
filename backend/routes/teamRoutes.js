import express from "express";
import {
  getTeam,
  getTeamSchedule,
  getTeamLeaders,
  getTeamInjuries,
} from "../controllers/teamController.js";

const router = express.Router();

// GET /api/teams/:teamId?season=YYYY        → 基本情報 + 順位/勝敗
router.get("/:teamId", getTeam);
// GET /api/teams/:teamId/schedule           → 直近〜今後の試合
router.get("/:teamId/schedule", getTeamSchedule);
// GET /api/teams/:teamId/leaders?season=YYYY → チーム内リーダー
router.get("/:teamId/leaders", getTeamLeaders);
router.get("/:teamId/injuries", getTeamInjuries);

export default router;