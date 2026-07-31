// 対戦成績コントローラー
//
// エンドポイント:
//   GET /api/matchup          → MLB Stats API vsPlayer で実際の対戦成績
//   GET /api/matchup/predict  → FastAPI でスタッツベースの予想成績を算出

const { fetchFromMlbApi } = require("../services/mlb/mlbClient");
const { fetchExternalPlayerFullDetails } = require("../services/mlb");
const { fetchLeagueStats } = require("../services/mlb/leagueStatsService");
const { fetchMatchupPredict } = require("../services/fastApiService");

const getMatchupStats = async (req, res) => {
  const { pitcherId, batterId } = req.query;

  if (!pitcherId || !batterId) {
    return res.status(400).json({ message: "pitcherId and batterId are required." });
  }

  try {
    // MLB Stats API: vsPlayer (投手視点で打者との通算成績を取得)
    const url =
      `https://statsapi.mlb.com/api/v1/people/${pitcherId}/stats` +
      `?stats=vsPlayer&group=pitching&opposingPlayerId=${batterId}`;

    const data = await fetchFromMlbApi(url, "Failed to fetch matchup stats");

    // vsPlayerTotal が通算集計（vsPlayer は年度別）
    const totalEntry = (data.stats || []).find(
      (s) => s.type?.displayName === "vsPlayerTotal"
    );
    const splits = totalEntry?.splits ?? [];

    if (splits.length === 0) {
      // 対戦なし
      return res.json({ hasData: false, stats: null });
    }

    const raw = splits[0].stat;

    // フロントで使いやすい形に整形
    const stats = {
      gamesPlayed:    raw.gamesPlayed      ?? 0,
      atBats:         raw.atBats           ?? 0,
      hits:           raw.hits             ?? 0,
      homeRuns:       raw.homeRuns         ?? 0,
      rbi:            raw.rbi              ?? 0,
      strikeOuts:     raw.strikeOuts       ?? 0,
      baseOnBalls:    raw.baseOnBalls      ?? 0,
      avg:            raw.avg              ?? ".---",
      obp:            raw.obp              ?? ".---",
      slg:            raw.slg              ?? ".---",
      ops:            raw.ops              ?? ".---",
      numberOfPitches: raw.numberOfPitches ?? 0,
    };

    return res.json({ hasData: true, stats });
  } catch (error) {
    console.error("Matchup stats error:", error.message);
    return res.status(500).json({ message: "Failed to fetch matchup stats." });
  }
};

// GET /api/matchup/predict?pitcherId=X&batterId=Y
// FastAPI でスタッツベースの予想成績を算出して返す
const getMatchupPrediction = async (req, res) => {
  const { pitcherId, batterId } = req.query;

  if (!pitcherId || !batterId) {
    return res.status(400).json({ message: "pitcherId and batterId are required." });
  }

  try {
    const [pitcherData, batterData, leagueStats] = await Promise.all([
      fetchExternalPlayerFullDetails(parseInt(pitcherId)),
      fetchExternalPlayerFullDetails(parseInt(batterId)),
      fetchLeagueStats(),
    ]);

    if (!pitcherData || !batterData) {
      return res.status(404).json({ message: "One or both players not found." });
    }

    const ps = pitcherData.currentSeasonStats?.pitcherStats || {};
    const bs = batterData.currentSeasonStats?.hitterStats   || {};

    const payload = {
      pitcher: {
        playerId:   parseInt(pitcherId),
        name:       pitcherData.fullName || pitcherData.name || "",
        era:        parseFloat(ps.era)            || 0,
        whip:       parseFloat(ps.whip)           || 0,
        strikeouts: parseInt(ps.strikeouts)        || 0,
        walks:      parseInt(ps.baseOnBalls)       || 0,
        wins:       parseInt(ps.wins)              || 0,
        innings:    parseFloat(ps.inningsPitched)  || 0,
      },
      batter: {
        playerId:    parseInt(batterId),
        name:        batterData.fullName || batterData.name || "",
        avg:         parseFloat(bs.battingAverage) || 0,
        ops:         parseFloat(bs.ops)            || 0,
        homeRuns:    parseInt(bs.homeRuns)          || 0,
        stolenBases: parseInt(bs.stolenBases)       || 0,
        rbi:         parseInt(bs.runsBattedIn)      || 0,
      },
      pitcherLeague: leagueStats.pitcher.distributions,
      batterLeague:  leagueStats.hitter.distributions,
    };

    const prediction = await fetchMatchupPredict(payload);

    if (!prediction) {
      return res.status(503).json({ message: "FastAPI prediction unavailable." });
    }

    res.json(prediction);
  } catch (error) {
    console.error("Matchup predict error:", error.message);
    res.status(500).json({ message: "Failed to fetch matchup prediction." });
  }
};

module.exports = { getMatchupStats, getMatchupPrediction };
