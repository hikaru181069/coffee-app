const { buildPlayerSearchUrl } = require("./mlbUrlBuilder");
const { fetchFromMlbApi } = require("./mlbClient");
const {
  formatExternalPlayer,
  formatExternalStats,
} = require("./playerFormatter");
const {
  fetchExternalPlayerDetails,
  fetchExternalPlayerStats,
} = require("./playerStatsService");

// 通常の検索: 1件ずつ詳細情報とシーズン統計を取得するため重い処理
// SearchPage の「Search」ボタン押下時に呼ばれる
const fetchExternalPlayers = async (searchText) => {
  const data = await fetchFromMlbApi(
    buildPlayerSearchUrl(searchText),
    "Failed to fetch players from MLB API",
  );

  return Promise.all(
    (data.people || []).map(async (searchResultPlayer) => {
      const detailedPlayer =
        (await fetchExternalPlayerDetails(searchResultPlayer.id)) ||
        searchResultPlayer;
      const player = formatExternalPlayer(detailedPlayer);
      const seasonStats = await fetchExternalPlayerStats({
        playerId: player.mlbPlayerId,
      });
      const formattedSeasonStats = formatExternalStats(seasonStats);

      return {
        ...player,
        ...formattedSeasonStats,
        currentSeasonStats: formattedSeasonStats,
      };
    }),
  );
};

// [Suggestions] 候補表示用の軽量検索
// fetchExternalPlayers との違い: 詳細情報・統計を取得しないため高速
// 入力中に debounce で呼ばれるため、レスポンスの速さを優先している
// 返すのは id / name / position / team のみ（表示に必要な最小限）
// 最大7件に絞ることでUIのドロップダウンが長くなりすぎないようにしている
const fetchPlayerSuggestions = async (searchText) => {
  const data = await fetchFromMlbApi(
    buildPlayerSearchUrl(searchText), // fetchExternalPlayers と同じエンドポイントを使用
    "Failed to fetch player suggestions",
  );

  // slice(0, 7): MLB API は最大25件返すが、候補表示は7件で十分
  return (data.people || []).slice(0, 7).map((p) => ({
    id: p.id,
    name: p.fullName,
    position: p.primaryPosition?.abbreviation || "", // 例: "SP", "OF", "1B"
    team: p.currentTeam?.name || "",                 // 例: "Los Angeles Dodgers"
  }));
};

module.exports = {
  fetchExternalPlayers,
  fetchPlayerSuggestions, // [Suggestions] 候補表示用
};
