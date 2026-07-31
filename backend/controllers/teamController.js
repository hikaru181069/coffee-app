// チームコントローラー
// 1球団分の情報を3系統で返す（Team ページ用）:
//   1. team     — 基本情報（名前・本拠地・地区）＋ 順位/勝敗
//   2. schedule — 直近〜今後の試合
//   3. leaders  — チーム内の打撃/投球リーダー
//
// すべて MLB Stats API をプロキシし、フロントで使いやすい形に整形する。
// リーグ全体を返す leagueController と対になる「単一チーム版」。

const { fetchFromMlbApi } = require("../services/mlb/mlbClient");

// チームリーダーで表示するカテゴリ。
// MLB API は同じ leaderCategory を statGroup(hitting/pitching/catching)ごとに
// 重複して返すため、欲しい statGroup を明示してフィルタする。
const LEADER_CATEGORIES = [
  { category: "battingAverage", statGroup: "hitting", label: "AVG" },
  { category: "homeRuns", statGroup: "hitting", label: "HR" },
  { category: "runsBattedIn", statGroup: "hitting", label: "RBI" },
  { category: "wins", statGroup: "pitching", label: "Wins" },
  { category: "earnedRunAverage", statGroup: "pitching", label: "ERA" },
  { category: "strikeouts", statGroup: "pitching", label: "SO" },
];

// YYYY-MM-DD 文字列に変換
const toDateString = (date) => date.toISOString().slice(0, 10);

/**
 * GET /api/teams/:teamId?season=YYYY
 * チームの基本情報 + 今季の順位/勝敗を返す
 */
const getTeam = async (req, res) => {
  const { teamId } = req.params;
  const season = req.query.season || new Date().getFullYear();

  try {
    const teamUrl = `https://statsapi.mlb.com/api/v1/teams/${teamId}?season=${season}`;
    const teamData = await fetchFromMlbApi(teamUrl, "Failed to fetch team");
    const team = (teamData.teams || [])[0];

    if (!team) {
      return res.status(404).json({ message: "Team not found." });
    }

    // 順位・勝敗は standings から該当チームを抜き出す。
    // 取得に失敗しても基本情報は返したいので、record は任意（null許容）にする。
    let record = null;
    try {
      const standingsUrl =
        `https://statsapi.mlb.com/api/v1/standings` +
        `?leagueId=103,104&season=${season}&standingsTypes=regularSeason`;
      const standings = await fetchFromMlbApi(standingsUrl, "Failed to fetch standings");

      for (const rec of standings.records || []) {
        const teamRecord = (rec.teamRecords || []).find(
          (t) => t.team?.id === Number(teamId),
        );
        if (teamRecord) {
          const lastTen = (teamRecord.records?.splitRecords || []).find(
            (r) => r.type === "lastTen",
          );
          record = {
            wins: teamRecord.wins,
            losses: teamRecord.losses,
            pct: teamRecord.winningPercentage,
            gamesBack: teamRecord.gamesBack,
            divisionRank: teamRecord.divisionRank,
            leagueRank: teamRecord.leagueRank,
            streak: teamRecord.streak?.streakCode || "-",
            lastTen: lastTen ? `${lastTen.wins}-${lastTen.losses}` : "-",
          };
          break;
        }
      }
    } catch (recordError) {
      console.error("Team record error:", recordError.message);
    }

    return res.json({
      id: team.id,
      name: team.name,
      teamName: team.teamName,
      abbreviation: team.abbreviation,
      locationName: team.locationName,
      firstYearOfPlay: team.firstYearOfPlay,
      league: team.league?.name,
      division: team.division?.name,
      venue: team.venue?.name,
      record,
    });
  } catch (error) {
    console.error("Team error:", error.message);
    return res.status(500).json({ message: "Failed to fetch team." });
  }
};

/**
 * GET /api/teams/:teamId/schedule
 * 直近〜今後の試合を返す（デフォルト: 今日の前後10日）
 */
const getTeamSchedule = async (req, res) => {
  const { teamId } = req.params;

  const today = new Date();
  const start = new Date(today);
  start.setDate(start.getDate() - 10);
  const end = new Date(today);
  end.setDate(end.getDate() + 10);

  const startDate = req.query.startDate || toDateString(start);
  const endDate = req.query.endDate || toDateString(end);

  try {
    const url =
      `https://statsapi.mlb.com/api/v1/schedule` +
      `?sportId=1&teamId=${teamId}&startDate=${startDate}&endDate=${endDate}`;

    const data = await fetchFromMlbApi(url, "Failed to fetch schedule");

    const games = [];
    for (const dateEntry of data.dates || []) {
      for (const g of dateEntry.games || []) {
        const away = g.teams?.away || {};
        const home = g.teams?.home || {};
        games.push({
          gamePk: g.gamePk,
          gameDate: g.gameDate,
          status: g.status?.detailedState,
          abstractState: g.status?.abstractGameState, // Preview / Live / Final
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
        });
      }
    }

    return res.json({ teamId: Number(teamId), startDate, endDate, games });
  } catch (error) {
    console.error("Team schedule error:", error.message);
    return res.status(500).json({ message: "Failed to fetch team schedule." });
  }
};

/**
 * GET /api/teams/:teamId/leaders?season=YYYY
 * チーム内の打撃/投球リーダーをカテゴリ別に返す
 */
const getTeamLeaders = async (req, res) => {
  const { teamId } = req.params;
  const season = req.query.season || new Date().getFullYear();

  try {
    const categories = LEADER_CATEGORIES.map((c) => c.category).join(",");
    const url =
      `https://statsapi.mlb.com/api/v1/teams/${teamId}/leaders` +
      `?leaderCategories=${categories}&season=${season}&leaderGameTypes=R&limit=3`;

    const data = await fetchFromMlbApi(url, "Failed to fetch leaders");
    const teamLeaders = data.teamLeaders || [];

    // 設定した順序・statGroup どおりに整形（重複カテゴリは statGroup で1つに絞る）
    const leaders = LEADER_CATEGORIES.map((c) => {
      const entry = teamLeaders.find(
        (tl) => tl.leaderCategory === c.category && tl.statGroup === c.statGroup,
      );
      const list = (entry?.leaders || []).map((l) => ({
        rank: l.rank,
        value: l.value,
        playerId: l.person?.id,
        playerName: l.person?.fullName,
      }));
      return { category: c.category, label: c.label, leaders: list };
    });

    return res.json({ teamId: Number(teamId), season: Number(season), leaders });
  } catch (error) {
    console.error("Team leaders error:", error.message);
    return res.status(500).json({ message: "Failed to fetch team leaders." });
  }
};

/**
 * GET /api/teams/:teamId/injuries
 * チームのIL（負傷者リスト）に登録されている選手を返す
 */
const getTeamInjuries = async (req, res) => {
  const { teamId } = req.params;
  const season = req.query.season || new Date().getFullYear();
  try {
    const url = `https://statsapi.mlb.com/api/v1/teams/${teamId}/roster?rosterType=40Man&season=${season}`;
    const data = await fetchFromMlbApi(url, "Failed to fetch roster");

    const injured = (data.roster || [])
      .filter((p) => {
        const desc = p.status?.description || "";
        return desc.includes("IL") || desc.includes("Injured") || desc.includes("Paternity") || desc.includes("Bereavement");
      })
      .map((p) => ({
        playerId: p.person?.id,
        playerName: p.person?.fullName,
        jerseyNumber: p.jerseyNumber,
        status: p.status?.description,
        position: p.position?.abbreviation,
      }));

    return res.json({ teamId: Number(teamId), season: Number(season), injured });
  } catch (error) {
    console.error("Team injuries error:", error.message);
    return res.status(500).json({ message: "Failed to fetch team injuries." });
  }
};

module.exports = { getTeam, getTeamSchedule, getTeamLeaders, getTeamInjuries };
