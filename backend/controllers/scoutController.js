const { fetchExternalPlayerFullDetails } = require("../services/mlb");
const { fetchLeagueStats } = require("../services/mlb/leagueStatsService");
const { fetchScoutingReport } = require("../services/fastApiService");
const { getOaaMap, getSprintSpeedMap, getArmStrengthMap } = require("../services/mlb/baseballSavantService");

const buildHitterPayload = (playerData, leagueStats) => {
  const id          = Number(playerData.mlbPlayerId);
  const hitterStats = playerData.currentSeasonStats?.hitterStats || {};
  return {
    player: {
      ops:         parseFloat(hitterStats.ops)           || 0,
      homeRuns:    parseInt(hitterStats.homeRuns)         || 0,
      stolenBases: parseInt(hitterStats.stolenBases)      || 0,
      avg:         parseFloat(hitterStats.battingAverage) || 0,
      rbi:         parseInt(hitterStats.rbis)             || 0,
      oaa:         getOaaMap()[id]                        ?? null,
      sprintSpeed: getSprintSpeedMap()[id]                ?? 0,
      armStrength: getArmStrengthMap()[id]                ?? 0,
    },
    leagueStats:       leagueStats.hitter.distributions,
    comparablePlayers: leagueStats.hitter.players,
  };
};

const buildPitcherPayload = (playerData, leagueStats) => {
  const pitcherStats = playerData.currentSeasonStats?.pitcherStats || {};
  return {
    pitcherPlayer: {
      era:        parseFloat(pitcherStats.era)            || 0,
      whip:       parseFloat(pitcherStats.whip)           || 0,
      strikeouts: parseInt(pitcherStats.strikeouts)       || 0,
      walks:      parseInt(pitcherStats.baseOnBalls)      || 0,
      wins:       parseInt(pitcherStats.wins)             || 0,
      innings:    parseFloat(pitcherStats.inningsPitched) || 0,
    },
    pitcherLeagueStats: leagueStats.pitcher.distributions,
    pitcherComparables: leagueStats.pitcher.players,
  };
};

const getScoutingReport = async (req, res) => {
  try {
    const { playerId } = req.params;
    const id = parseInt(playerId);

    if (!id || isNaN(id)) {
      return res.status(400).json({ message: "Invalid player ID" });
    }

    const [playerData, leagueStats] = await Promise.all([
      fetchExternalPlayerFullDetails(id),
      fetchLeagueStats(),
    ]);

    if (!playerData) {
      return res.status(404).json({ message: "Player not found" });
    }

    const isPitcher = playerData.playerType === "pitcher";
    const statsPayload = isPitcher
      ? buildPitcherPayload(playerData, leagueStats)
      : buildHitterPayload(playerData, leagueStats);

    // 規定打席 / 規定投球回 チェック
    const hitterStats  = playerData.currentSeasonStats?.hitterStats  || {};
    const pitcherStats = playerData.currentSeasonStats?.pitcherStats || {};
    const isQualified  = isPitcher
      ? parseFloat(pitcherStats.inningsPitched || 0) >= (leagueStats.qualifyingIP || 0)
      : parseInt(hitterStats.plateAppearances  || 0) >= (leagueStats.qualifyingPA || 0);

    const report = await fetchScoutingReport({
      playerType:     isPitcher ? "pitcher" : "hitter",
      playerPosition: playerData.positionAbbr || "",
      playerIdToExclude: id,
      ...statsPayload,
    });

    // stats を返すフィールド名を統一（フロントで playerType を見て切り替え）
    const stats = isPitcher
      ? statsPayload.pitcherPlayer
      : statsPayload.player;

    res.json({
      player: {
        id: playerData.mlbPlayerId,
        fullName: playerData.name,
        currentTeam: playerData.team,
        position:     playerData.position,
        positionAbbr: playerData.positionAbbr,
        image: playerData.image,
        playerType: isPitcher ? "pitcher" : "hitter",
      },
      isQualified,
      stats,
      report,
    });
  } catch (error) {
    console.error("Scouting report error:", error.message);
    res.status(500).json({ message: "Failed to generate scouting report" });
  }
};

module.exports = { getScoutingReport };
