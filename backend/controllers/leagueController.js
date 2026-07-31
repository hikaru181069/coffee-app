// リーグコントローラー
// 30球団の試合成績を2系統で返す:
//   1. 順位表 (standings) — 各球団の W-L・勝率・ゲーム差
//   2. 試合結果 (scores)  — 特定日の全試合スコア
//
// どちらも MLB Stats API をプロキシし、フロントで使いやすい形に整形する。

const { fetchFromMlbApi } = require("../services/mlb/mlbClient");

// division ID → リーグ/地区名のマッピング
// MLB Stats API の固定 ID（変わらない）
const DIVISION_MAP = {
  200: { league: "National League", division: "West" },
  201: { league: "American League", division: "East" },
  202: { league: "American League", division: "Central" },
  203: { league: "American League", division: "West" },
  204: { league: "National League", division: "East" },
  205: { league: "National League", division: "Central" },
};

/**
 * GET /api/league/standings?season=YYYY
 * リーグ → 地区 → 球団の順位表を返す
 */
const getStandings = async (req, res) => {
  const season = req.query.season || new Date().getFullYear();

  try {
    // leagueId 103=AL, 104=NL
    const url =
      `https://statsapi.mlb.com/api/v1/standings` +
      `?leagueId=103,104&season=${season}&standingsTypes=regularSeason`;

    const data = await fetchFromMlbApi(url, "Failed to fetch standings");

    // 各 division record を整形
    const divisions = (data.records || []).map((rec) => {
      const divInfo = DIVISION_MAP[rec.division?.id] || {
        league: "Unknown",
        division: "",
      };

      const teams = (rec.teamRecords || []).map((t) => {
        const lastTen = (t.records?.splitRecords || []).find(
          (r) => r.type === "lastTen",
        );
        return {
          teamId: t.team?.id,
          teamName: t.team?.name,
          wins: t.wins,
          losses: t.losses,
          pct: t.winningPercentage,
          gamesBack: t.gamesBack,
          divisionRank: t.divisionRank,
          streak: t.streak?.streakCode || "-",
          lastTen: lastTen ? `${lastTen.wins}-${lastTen.losses}` : "-",
        };
      });

      return {
        divisionId: rec.division?.id,
        league: divInfo.league,
        division: divInfo.division,
        teams,
      };
    });

    return res.json({ season: Number(season), divisions });
  } catch (error) {
    console.error("Standings error:", error.message);
    return res.status(500).json({ message: "Failed to fetch standings." });
  }
};

/**
 * GET /api/league/wildcard?season=YYYY
 * AL/NL それぞれのワイルドカード順位を返す
 */
const getWildCard = async (req, res) => {
  const season = req.query.season || new Date().getFullYear();
  try {
    const url =
      `https://statsapi.mlb.com/api/v1/standings` +
      `?leagueId=103,104&season=${season}&standingsTypes=wildCard`;
    const data = await fetchFromMlbApi(url, "Failed to fetch wild card");

    // wildCard standings は division ではなくリーグ単位でグループ化される
    // leagueId 103=AL, 104=NL（league.name は wild card では返らないことがある）
    const LEAGUE_ID_MAP = { 103: "American League", 104: "National League" };
    const leagues = {};
    for (const rec of data.records || []) {
      const leagueName = rec.league?.name || LEAGUE_ID_MAP[rec.league?.id] || "Unknown";
      if (!leagues[leagueName]) leagues[leagueName] = [];
      for (const t of rec.teamRecords || []) {
        const lastTen = (t.records?.splitRecords || []).find((r) => r.type === "lastTen");
        leagues[leagueName].push({
          teamId: t.team?.id,
          teamName: t.team?.name,
          wins: t.wins,
          losses: t.losses,
          pct: t.winningPercentage,
          wildCardGamesBack: t.wildCardGamesBack || t.gamesBack,
          wildCardRank: t.wildCardRank,
          divisionRank: t.divisionRank,
          streak: t.streak?.streakCode || "-",
          lastTen: lastTen ? `${lastTen.wins}-${lastTen.losses}` : "-",
          isWildCardLeader: t.wildCardLeader ?? false,
          eliminationNumber: t.eliminationNumber || "-",
        });
      }
    }
    // 各リーグをワイルドカード順位でソート
    const result = Object.entries(leagues).map(([league, teams]) => ({
      league,
      teams: teams.sort((a, b) => Number(a.wildCardRank) - Number(b.wildCardRank)),
    }));

    return res.json({ season: Number(season), leagues: result });
  } catch (error) {
    console.error("Wild card error:", error.message);
    return res.status(500).json({ message: "Failed to fetch wild card standings." });
  }
};

/**
 * GET /api/league/scores?date=YYYY-MM-DD
 * 指定日の全試合スコアを返す
 */
const getScores = async (req, res) => {
  // date 未指定なら今日
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  try {
    const url =
      `https://statsapi.mlb.com/api/v1/schedule` +
      `?sportId=1&date=${date}`;

    const data = await fetchFromMlbApi(url, "Failed to fetch scores");

    const dateEntry = (data.dates || [])[0];
    const games = (dateEntry?.games || []).map((g) => {
      const away = g.teams?.away || {};
      const home = g.teams?.home || {};
      return {
        gamePk: g.gamePk,
        status: g.status?.detailedState,
        abstractState: g.status?.abstractGameState, // Preview / Live / Final
        startTime: g.gameDate,
        away: {
          teamId: away.team?.id,
          teamName: away.team?.name,
          score: away.score ?? null,
          isWinner: away.isWinner ?? false,
        },
        home: {
          teamId: home.team?.id,
          teamName: home.team?.name,
          score: home.score ?? null,
          isWinner: home.isWinner ?? false,
        },
      };
    });

    return res.json({ date, totalGames: games.length, games });
  } catch (error) {
    console.error("Scores error:", error.message);
    return res.status(500).json({ message: "Failed to fetch scores." });
  }
};

module.exports = { getStandings, getScores, getWildCard };
