const express = require("express");

const {
  getExternalPlayerById,
  getExternalPlayersByTeam,
  searchExternalPlayers,
  getPlayerSuggestions,
  getPlayerYearByYear,
  getOnboardingPlayers,
  getPlayerBiosHandler,
  getPlayerProfilesHandler,
} = require("../controllers/externalPlayerController");

const router = express.Router();

router.get("/search", searchExternalPlayers);
router.get("/popular", getOnboardingPlayers);
router.get("/bio", getPlayerBiosHandler);
router.get("/profile", getPlayerProfilesHandler);

// [Suggestions] 候補取得エンドポイント
// ⚠️ /:playerId より前に定義する必要がある
// Express はルートを上から順に評価するため、後ろに書くと
// "/suggestions" が /:playerId にマッチしてしまう
router.get("/suggestions", getPlayerSuggestions);

router.get("/team/:teamId", getExternalPlayersByTeam);
router.get("/teams/:teamId/players", getExternalPlayersByTeam);
router.get("/:playerId/year-by-year", getPlayerYearByYear);
router.get("/:playerId", getExternalPlayerById);

module.exports = router;
