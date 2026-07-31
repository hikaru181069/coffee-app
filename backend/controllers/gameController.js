// 試合コントローラー
// 1試合分の詳細（メタ情報・イニングスコア・ボックススコア）を返す。
// League / Team / Home のスコアカードから gamePk で遷移してくる試合詳細ページ用。
//
// 3つの MLB Stats API をまとめて取得し、フロントで使いやすい形に整形する:
//   schedule?gamePks=  → ステータス・日時・球場・チーム/スコア
//   game/:id/linescore → イニングごとの得点・R/H/E 合計
//   game/:id/boxscore  → 両軍の打者/投手スタッツ

const { fetchFromMlbApi } = require("../services/mlb/mlbClient");

const toNumber = (value) => {
  const n = Number(value);
  return Number.isNaN(n) ? 0 : n;
};

// boxscore の1チーム分から打者一覧を整形する
const formatBatters = (teamBox) => {
  const players = teamBox.players || {};
  return (teamBox.battingOrder || []).map((id) => {
    const p = players[`ID${id}`] || {};
    const batting = p.stats?.batting || {};
    return {
      name: p.person?.fullName || "—",
      position: p.position?.abbreviation || "",
      ab: toNumber(batting.atBats),
      r: toNumber(batting.runs),
      h: toNumber(batting.hits),
      hr: toNumber(batting.homeRuns),
      rbi: toNumber(batting.rbi),
      bb: toNumber(batting.baseOnBalls),
      k: toNumber(batting.strikeOuts),
    };
  });
};

// boxscore の1チーム分から投手一覧を整形する
const formatPitchers = (teamBox) => {
  const players = teamBox.players || {};
  return (teamBox.pitchers || []).map((id) => {
    const p = players[`ID${id}`] || {};
    const pitching = p.stats?.pitching || {};
    return {
      name: p.person?.fullName || "—",
      ip: pitching.inningsPitched ?? "0.0",
      h: toNumber(pitching.hits),
      r: toNumber(pitching.runs),
      er: toNumber(pitching.earnedRuns),
      bb: toNumber(pitching.baseOnBalls),
      k: toNumber(pitching.strikeOuts),
    };
  });
};

/**
 * GET /api/games/:gamePk
 * 1試合の詳細をまとめて返す
 */
const getGame = async (req, res) => {
  const { gamePk } = req.params;

  try {
    const [schedule, linescore, boxscore] = await Promise.all([
      fetchFromMlbApi(
        `https://statsapi.mlb.com/api/v1/schedule?gamePks=${gamePk}`,
        "Failed to fetch game schedule",
      ),
      fetchFromMlbApi(
        `https://statsapi.mlb.com/api/v1/game/${gamePk}/linescore`,
        "Failed to fetch linescore",
      ),
      fetchFromMlbApi(
        `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`,
        "Failed to fetch boxscore",
      ),
    ]);

    const game = schedule.dates?.[0]?.games?.[0];
    if (!game) {
      return res.status(404).json({ message: "Game not found." });
    }

    // チームのメタ（schedule からスコア・勝敗、linescore から R/H/E）
    const buildTeamMeta = (side) => {
      const g = game.teams?.[side] || {};
      const ls = linescore.teams?.[side] || {};
      return {
        teamId: g.team?.id,
        teamName: g.team?.name,
        runs: ls.runs ?? g.score ?? null,
        hits: ls.hits ?? null,
        errors: ls.errors ?? null,
        isWinner: g.isWinner ?? false,
      };
    };

    const innings = (linescore.innings || []).map((inn) => ({
      num: inn.num,
      away: inn.away?.runs ?? null,
      home: inn.home?.runs ?? null,
    }));

    return res.json({
      gamePk: Number(gamePk),
      status: game.status?.detailedState,
      abstractState: game.status?.abstractGameState, // Preview / Live / Final
      gameDate: game.gameDate,
      venue: game.venue?.name || null,
      away: buildTeamMeta("away"),
      home: buildTeamMeta("home"),
      innings,
      boxscore: {
        away: {
          batters: formatBatters(boxscore.teams?.away || {}),
          pitchers: formatPitchers(boxscore.teams?.away || {}),
        },
        home: {
          batters: formatBatters(boxscore.teams?.home || {}),
          pitchers: formatPitchers(boxscore.teams?.home || {}),
        },
      },
    });
  } catch (error) {
    console.error("Game detail error:", error.message);
    return res.status(500).json({ message: "Failed to fetch game detail." });
  }
};


/**
 * GET /api/games/:gamePk/plays
 * 試合のプレイバイプレイ（重要プレーのみ抽出）を返す
 */
const getGamePlays = async (req, res) => {
  const { gamePk } = req.params;
  try {
    const data = await fetchFromMlbApi(
      `https://statsapi.mlb.com/api/v1/game/${gamePk}/playByPlay`,
      "Failed to fetch play-by-play"
    );
    const allPlays = data.allPlays || [];
    const plays = allPlays
      .filter((p) => {
        const event = p.result?.event || "";
        return p.about?.isScoringPlay ||
          ["Home Run","Triple","Double","Strikeout","Walk","Hit By Pitch"].includes(event);
      })
      .map((p) => ({
        inning:        p.about?.inning,
        halfInning:    p.about?.halfInning,
        event:         p.result?.event,
        description:   p.result?.description,
        isScoringPlay: p.about?.isScoringPlay ?? false,
        awayScore:     p.result?.awayScore,
        homeScore:     p.result?.homeScore,
        batter:        p.matchup?.batter?.fullName,
        pitcher:       p.matchup?.pitcher?.fullName,
      }));
    return res.json({ gamePk: Number(gamePk), plays });
  } catch (error) {
    console.error("Play-by-play error:", error.message);
    return res.status(500).json({ message: "Failed to fetch play-by-play." });
  }
};


/**
 * GET /api/games/:gamePk/highlights
 * 試合のハイライト動画（mp4 + サムネ）を返す
 */
const getGameHighlights = async (req, res) => {
  const { gamePk } = req.params;
  try {
    const data = await fetchFromMlbApi(
      `https://statsapi.mlb.com/api/v1/game/${gamePk}/content`,
      'Failed to fetch highlights'
    );
    const items = data.highlights?.highlights?.items || [];

    const highlights = items
      .map((h) => {
        // 直接再生できる mp4 を優先（mp4Avc → highBit）
        const playbacks = h.playbacks || [];
        const mp4 =
          playbacks.find((p) => p.name === 'mp4Avc') ||
          playbacks.find((p) => (p.url || '').endsWith('.mp4'));
        if (!mp4) return null;

        // サムネは幅480px以上で最小のものを選ぶ
        const cuts = (h.image?.cuts || []).slice().sort((a, b) => a.width - b.width);
        const thumb = cuts.find((c) => c.width >= 480) || cuts[cuts.length - 1];

        return {
          id: h.id,
          headline: h.headline || h.title,
          description: h.description || '',
          duration: h.duration || '',
          date: h.date || null,
          videoUrl: mp4.url,
          thumbnail: thumb?.src || null,
        };
      })
      .filter(Boolean);

    return res.json({ gamePk: Number(gamePk), highlights });
  } catch (error) {
    console.error('Highlights error:', error.message);
    return res.status(500).json({ message: 'Failed to fetch highlights.' });
  }
};

module.exports = { getGame, getGamePlays, getGameHighlights };
