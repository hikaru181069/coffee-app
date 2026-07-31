const {
  fetchExternalPlayerFullDetails,
  fetchExternalPlayersByTeam,
  fetchExternalPlayers,
  fetchPlayerSuggestions,
  getPlayerBios,
  getPlayerProfiles,
} = require("../services/mlb");
const { fetchFromMlbApi } = require("../services/mlb/mlbClient");
const { fetchPopularPlayers } = require("../services/mlb/leagueStatsService");

const searchExternalPlayers = async (req, res) => {
  try {
    const searchText = req.query.q || "";

    if (!searchText.trim()) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const players = await fetchExternalPlayers(searchText);

    res.json(players);
  } catch (error) {
    console.error("External player search error:", error.message);
    res.status(500).json({ message: "Failed to search external players" });
  }
};

const getExternalPlayerById = async (req, res) => {
  try {
    const player = await fetchExternalPlayerFullDetails(req.params.playerId);

    res.json(player);
  } catch (error) {
    console.error("External player detail error:", error.message);
    res.status(500).json({ message: "Failed to fetch external player" });
  }
};

const getExternalPlayersByTeam = async (req, res) => {
  try {
    const players = await fetchExternalPlayersByTeam(req.params.teamId);

    res.json(players);
  } catch (error) {
    console.error("External team players error:", error.message);
    res.status(500).json({ message: "Failed to fetch team players" });
  }
};

// [Suggestions] 入力中の候補を返すハンドラー
// GET /api/external/players/suggestions?q=<searchText>
// searchExternalPlayers との違い: 統計・詳細を取得しない軽量レスポンス
// 2文字未満は空配列を返す（MLB API が結果を返さないため、エラーにしない）
const getPlayerSuggestions = async (req, res) => {
  try {
    const searchText = req.query.q || "";

    // バリデーション: 空または1文字の場合はエラーにせず空配列を返す
    // フロントエンド側でも同じ制限をかけているが、APIとしても安全に処理する
    if (!searchText.trim() || searchText.trim().length < 2) {
      return res.json([]);
    }

    const suggestions = await fetchPlayerSuggestions(searchText);
    res.json(suggestions);
  } catch (error) {
    console.error("Player suggestions error:", error.message);
    res.status(500).json({ message: "Failed to fetch suggestions" });
  }
};

/**
 * GET /api/external/players/:playerId/year-by-year
 * 選手の年度別成績（打撃・投球）を返す
 */
const getPlayerYearByYear = async (req, res) => {
  const { playerId } = req.params;
  try {
    const [hitting, pitching] = await Promise.all([
      fetchFromMlbApi(
        `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=yearByYear&group=hitting`
      ).catch(() => null),
      fetchFromMlbApi(
        `https://statsapi.mlb.com/api/v1/people/${playerId}/stats?stats=yearByYear&group=pitching`
      ).catch(() => null),
    ]);

    const formatSplits = (data) =>
      (data?.stats?.[0]?.splits || [])
        .filter((s) => s.season && s.team)
        .map((s) => ({ season: s.season, teamName: s.team?.name, teamId: s.team?.id, stat: s.stat }));

    return res.json({
      playerId: Number(playerId),
      hitting: formatSplits(hitting),
      pitching: formatSplits(pitching),
    });
  } catch (error) {
    console.error("Year-by-year error:", error.message);
    return res.status(500).json({ message: "Failed to fetch year-by-year stats." });
  }
};

const getOnboardingPlayers = async (req, res) => {
  try {
    const players = await fetchPopularPlayers();
    res.json(players);
  } catch (error) {
    console.error("Onboarding players error:", error.message);
    res.status(500).json({ message: "Failed to fetch onboarding players" });
  }
};

// 選手カード用の1行紹介文をまとめて取得する。?ids=1,2,3 形式のカンマ区切り。
const getPlayerBiosHandler = async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.status(400).json({ message: "ids query parameter is required" });
    }

    const bios = await getPlayerBios(ids);
    res.json(bios);
  } catch (error) {
    console.error("Player bios error:", error.message);
    res.status(500).json({ message: "Failed to fetch player bios" });
  }
};

// Home Heroのスカウトレポート用。年齢・身長体重・利き手・出身地などをまとめて取得する。
const getPlayerProfilesHandler = async (req, res) => {
  try {
    const ids = String(req.query.ids || "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean);

    if (ids.length === 0) {
      return res.status(400).json({ message: "ids query parameter is required" });
    }

    const profiles = await getPlayerProfiles(ids);
    res.json(profiles);
  } catch (error) {
    console.error("Player profiles error:", error.message);
    res.status(500).json({ message: "Failed to fetch player profiles" });
  }
};

module.exports = {
  getExternalPlayersByTeam,
  searchExternalPlayers,
  getExternalPlayerById,
  getPlayerSuggestions,
  getPlayerYearByYear,
  getOnboardingPlayers,
  getPlayerBiosHandler,
  getPlayerProfilesHandler,
};
