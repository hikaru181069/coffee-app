// 2選手の統計的優劣分析コントローラー
//
// データの流れ:
//   GET /api/compare/analyze?p1=660271&p2=592450
//     → 両選手の詳細スタッツを取得
//     → リーグ分布を取得（leagueStatsService キャッシュ済み）
//     → FastAPI /compare/analyze でパーセンタイル比較・優劣判定
//     → フロントに返す

const { fetchExternalPlayerFullDetails } = require("../services/mlb");
const { fetchLeagueStats } = require("../services/mlb/leagueStatsService");
const { fetchCompareAnalyze } = require("../services/fastApiService");

// Express の hitterStats → FastAPI の ComparePlayerStats 形式に変換
const toHitterPayload = (playerData) => {
  const s = playerData.currentSeasonStats?.hitterStats || {};
  return {
    playerId:    playerData.mlbPlayerId || playerData.id,
    name:        playerData.fullName || playerData.name || "",
    playerType:  "hitter",
    ops:         parseFloat(s.ops)            || 0,
    homeRuns:    parseInt(s.homeRuns)          || 0,
    stolenBases: parseInt(s.stolenBases)       || 0,
    avg:         parseFloat(s.battingAverage)  || 0,
    rbi:         parseInt(s.runsBattedIn)      || 0,
  };
};

// Express の pitcherStats → FastAPI の ComparePlayerStats 形式に変換
const toPitcherPayload = (playerData) => {
  const s = playerData.currentSeasonStats?.pitcherStats || {};
  return {
    playerId:   playerData.mlbPlayerId || playerData.id,
    name:       playerData.fullName || playerData.name || "",
    playerType: "pitcher",
    era:        parseFloat(s.era)            || 0,
    whip:       parseFloat(s.whip)           || 0,
    strikeouts: parseInt(s.strikeouts)        || 0,
    walks:      parseInt(s.baseOnBalls)       || 0,
    wins:       parseInt(s.wins)              || 0,
    innings:    parseFloat(s.inningsPitched)  || 0,
  };
};

const getCompareAnalysis = async (req, res) => {
  const { p1, p2 } = req.query;

  if (!p1 || !p2) {
    return res.status(400).json({ message: "p1 and p2 player IDs are required." });
  }

  try {
    // 両選手 + リーグ統計を並列取得
    const [player1Data, player2Data, leagueStats] = await Promise.all([
      fetchExternalPlayerFullDetails(parseInt(p1)),
      fetchExternalPlayerFullDetails(parseInt(p2)),
      fetchLeagueStats(),
    ]);

    if (!player1Data || !player2Data) {
      return res.status(404).json({ message: "One or both players not found." });
    }

    const isPitcher = player1Data.playerType === "pitcher";

    const payload = {
      player1: isPitcher ? toPitcherPayload(player1Data) : toHitterPayload(player1Data),
      player2: isPitcher ? toPitcherPayload(player2Data) : toHitterPayload(player2Data),
      hitterDistribution:  leagueStats.hitter.distributions,
      pitcherDistribution: leagueStats.pitcher.distributions,
    };

    const analysis = await fetchCompareAnalyze(payload);

    if (!analysis) {
      return res.status(503).json({ message: "FastAPI analysis unavailable." });
    }

    res.json(analysis);
  } catch (error) {
    console.error("Compare analysis error:", error.message);
    res.status(500).json({ message: "Failed to fetch compare analysis." });
  }
};

module.exports = { getCompareAnalysis };
