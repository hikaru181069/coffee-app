const { fetchLeagueStats } = require("./leagueStatsService");
const { fetchFromMlbApi } = require("./mlbClient");

const CACHE_TTL = 24 * 60 * 60 * 1000;
let cache = null;
let cacheTime = null;

const HEADSHOT = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

const PITCHER_POSITIONS = new Set(["SP", "RP", "P"]);

// leagueStats 全選手の position + age を一括取得してキャッシュする
const fetchAllPlayersWithPositions = async () => {
  if (cache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    return cache;
  }

  const leagueStats = await fetchLeagueStats();
  const hitterPlayers  = leagueStats.hitter.players;
  const pitcherPlayers = leagueStats.pitcher.players;
  const allIds = [...new Set([...hitterPlayers, ...pitcherPlayers].map((p) => p.playerId))];

  // 50件ずつバッチ取得
  const metaMap = {};
  const chunks = [];
  for (let i = 0; i < allIds.length; i += 50) chunks.push(allIds.slice(i, i + 50));

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const data = await fetchFromMlbApi(
          `https://statsapi.mlb.com/api/v1/people?personIds=${chunk.join(",")}`,
          "Failed to fetch position meta",
        );
        for (const person of data.people || []) {
          metaMap[person.id] = {
            position: person.primaryPosition?.abbreviation ?? "",
            age:      person.currentAge ?? 0,
            teamId:   person.currentTeam?.id ?? null,
          };
        }
      } catch { /* バッチ失敗は無視 */ }
    }),
  );

  const hitters = hitterPlayers.map((p) => ({
    mlbPlayerId: p.playerId,
    fullName:    p.name,
    team:        p.team,
    teamId:      metaMap[p.playerId]?.teamId ?? null,
    position:    metaMap[p.playerId]?.position ?? "",
    age:         metaMap[p.playerId]?.age ?? 0,
    playerType:  "hitter",
    imageUrl:    HEADSHOT(p.playerId),
    hitterStats: {
      ops:          p.ops,
      homeRuns:     p.homeRuns,
      stolenBases:  p.stolenBases,
      battingAverage: p.avg,
      rbis:         p.rbi,
    },
  }));

  const pitchers = pitcherPlayers.map((p) => ({
    mlbPlayerId: p.playerId,
    fullName:    p.name,
    team:        p.team,
    teamId:      metaMap[p.playerId]?.teamId ?? null,
    position:    metaMap[p.playerId]?.position ?? "",
    // MLB APIのprimaryPositionは投手だと常に"P"でSP/RPを区別しないため、
    // 登板数に占める先発回数の割合からSP/RPを判定する
    role:        p.gamesPlayed > 0 && p.gamesStarted / p.gamesPlayed >= 0.5 ? "SP" : "RP",
    age:         metaMap[p.playerId]?.age ?? 0,
    playerType:  "pitcher",
    imageUrl:    HEADSHOT(p.playerId),
    pitcherStats: {
      era:            p.era,
      whip:           p.whip,
      strikeouts:     p.strikeouts,
      wins:           p.wins,
      inningsPitched: p.innings,
    },
  }));

  cache = { hitters, pitchers };
  cacheTime = Date.now();
  return cache;
};

const fetchPlayersByPosition = async (position) => {
  const pos = position.toUpperCase();
  const { hitters, pitchers } = await fetchAllPlayersWithPositions();

  if (PITCHER_POSITIONS.has(pos)) {
    // "P" 単体で来た場合は先発・救援どちらも対象にする
    if (pos === "P") return pitchers;
    return pitchers.filter((p) => p.role === pos);
  }

  return hitters.filter((p) => p.position.toUpperCase() === pos);
};

module.exports = { fetchPlayersByPosition };
