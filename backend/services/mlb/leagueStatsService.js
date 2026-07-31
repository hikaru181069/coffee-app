const { fetchFromMlbApi }                                 = require("./mlbClient");
const { getOaaMap, getOaaPositionMap, getSprintSpeedMap, getArmStrengthMap, getCatcherFramingMap } = require("./baseballSavantService");

const MLB_STATS_URL  = "https://statsapi.mlb.com/api/v1/stats";
const CURRENT_SEASON = new Date().getFullYear().toString();

// ── キャッシュ ────────────────────────────────────────────────────────────

const CACHE_TTL = 24 * 60 * 60 * 1000;
let cache = null;
let cacheTime = null;

// ── 全野手スタッツ取得 ────────────────────────────────────────────────────
// リーダーボード方式（上位200名のカテゴリ別リスト）から
// playerPool=All 方式（全選手の全スタット一括取得）に変更。
// 旧方式の問題：HR上位だがOPS上位でない選手のopsが0になっていた。

async function fetchAllHitterStats() {
  const params = new URLSearchParams({
    stats:      "season",
    group:      "hitting",
    sportId:    "1",
    season:     CURRENT_SEASON,
    playerPool: "All",
    gameType:   "R",
    limit:      "2000",
  });

  const data = await fetchFromMlbApi(
    `${MLB_STATS_URL}?${params}`,
    "Failed to fetch all hitter stats",
  );

  const splits            = data.stats?.[0]?.splits ?? [];
  const oaaMap            = getOaaMap();
  const oaaPositionMap    = getOaaPositionMap();
  const sprintSpeedMap    = getSprintSpeedMap();
  const armStrengthMap    = getArmStrengthMap();
  const catcherFramingMap = getCatcherFramingMap();

  // 30+ AB: 投手打席・極端な限定出場を除外。類似選手プール用
  const players = splits
    .filter((s) => s.player?.id && (parseInt(s.stat?.atBats) || 0) >= 30)
    .map((s) => ({
      playerId:         s.player.id,
      name:             s.player.fullName || "",
      team:             s.team?.name     || "",
      position:         s.player.primaryPosition?.abbreviation || "",
      atBats:           parseInt(s.stat.atBats)           || 0,
      plateAppearances: parseInt(s.stat.plateAppearances) || 0,
      gamesPlayed:      parseInt(s.stat.gamesPlayed)      || 0,
      ops:              parseFloat(s.stat.ops)             || 0,
      homeRuns:         parseInt(s.stat.homeRuns)          || 0,
      stolenBases:      parseInt(s.stat.stolenBases)       || 0,
      avg:              parseFloat(s.stat.avg)             || 0,
      rbi:              parseInt(s.stat.rbi)               || 0,
      // OAAは捕手非対応のため、捕手はundefinedのまま(0扱いにしない)にして
      // FastAPI側でcatcherFramingにフォールバックできるようにする
      oaa:              oaaMap[s.player.id],
      sprintSpeed:      sprintSpeedMap[s.player.id]        ?? 0,
      armStrength:      armStrengthMap[s.player.id]        ?? 0,
      catcherFraming:   catcherFramingMap[s.player.id],
    }));

  // チームの最多試合数 ≈ 個人の最大 gamesPlayed から推定
  const maxGamesPlayed = players.reduce((m, p) => Math.max(m, p.gamesPlayed), 0);

  return { players, maxGamesPlayed };
}

// ── 全投手スタッツ取得 ────────────────────────────────────────────────────

async function fetchAllPitcherStats() {
  const params = new URLSearchParams({
    stats:      "season",
    group:      "pitching",
    sportId:    "1",
    season:     CURRENT_SEASON,
    playerPool: "All",
    gameType:   "R",
    limit:      "2000",
  });

  const data = await fetchFromMlbApi(
    `${MLB_STATS_URL}?${params}`,
    "Failed to fetch all pitcher stats",
  );

  const splits = data.stats?.[0]?.splits ?? [];

  // 投球回数が少ない選手（1試合だけ登板など）をフィルタリング
  const players = splits
    .filter((s) => s.player?.id && parseFloat(s.stat?.inningsPitched || 0) >= 10)
    .map((s) => ({
      playerId:    s.player.id,
      name:        s.player.fullName || "",
      team:        s.team?.name     || "",
      gamesPlayed: parseInt(s.stat.gamesPlayed)      || 0,
      gamesStarted: parseInt(s.stat.gamesStarted)    || 0,
      era:         parseFloat(s.stat.era)            || 0,
      whip:        parseFloat(s.stat.whip)           || 0,
      strikeouts:  parseInt(s.stat.strikeOuts)       || 0,
      walks:       parseInt(s.stat.baseOnBalls)      || 0,
      wins:        parseInt(s.stat.wins)             || 0,
      innings:     parseFloat(s.stat.inningsPitched) || 0,
    }));

  const maxGamesPlayed = players.reduce((m, p) => Math.max(m, p.gamesPlayed), 0);

  return { players, maxGamesPlayed };
}

// ── 年齢・ポジションのバッチ取得（野手・投手共通ヘルパー） ─────────────────

const fetchPlayerMeta = async (playerIds) => {
  const ageMap = {};
  const positionMap = {};
  const chunks = [];
  for (let i = 0; i < playerIds.length; i += 50) {
    chunks.push(playerIds.slice(i, i + 50));
  }
  await Promise.all(
    chunks.map(async (chunk) => {
      const ids = chunk.join(",");
      try {
        const data = await fetchFromMlbApi(
          `https://statsapi.mlb.com/api/v1/people?personIds=${ids}`,
          "Failed to fetch player meta",
        );
        for (const person of data.people || []) {
          ageMap[person.id] = person.currentAge ?? 99;
          positionMap[person.id] = person.primaryPosition?.abbreviation ?? "";
        }
      } catch { /* バッチ取得失敗は黙って無視 */ }
    }),
  );
  return { ageMap, positionMap };
};

// ── 若手野手キャッシュ ─────────────────────────────────────────────────────

let youngPlayersCache = null;
let youngPlayersCacheTime = null;

const fetchYoungLeaguePlayers = async (maxAge = 26) => {
  if (youngPlayersCache && youngPlayersCacheTime && Date.now() - youngPlayersCacheTime < CACHE_TTL) {
    return youngPlayersCache.filter((p) => p.age <= maxAge);
  }

  const leagueStats = await fetchLeagueStats();
  const players = leagueStats.hitter.players;
  if (!players.length) return [];

  const { ageMap, positionMap } = await fetchPlayerMeta(players.map((p) => p.playerId));

  // 年齢が取得できた選手のみキャッシュに保存（年齢不明は除外）
  const oaaMap = getOaaMap();
  youngPlayersCache = players
    .filter((p) => (ageMap[p.playerId] ?? 99) < 99)
    .map((p) => ({
      playerId:    p.playerId,
      name:        p.name,
      team:        p.team,
      position:    positionMap[p.playerId] ?? "",
      age:         ageMap[p.playerId] ?? 0,
      ops:         p.ops,
      homeRuns:    p.homeRuns,
      stolenBases: p.stolenBases,
      avg:         p.avg,
      rbi:         p.rbi,
      oaa:         oaaMap[p.playerId] ?? 0,
    }));
  youngPlayersCacheTime = Date.now();
  return youngPlayersCache.filter((p) => p.age <= maxAge);
};

// ── 若手投手キャッシュ ─────────────────────────────────────────────────────

let youngPitchersCache = null;
let youngPitchersCacheTime = null;

const fetchYoungPitchers = async (maxAge = 26) => {
  if (youngPitchersCache && youngPitchersCacheTime && Date.now() - youngPitchersCacheTime < CACHE_TTL) {
    return youngPitchersCache.filter((p) => p.age <= maxAge);
  }

  const leagueStats = await fetchLeagueStats();
  const players = leagueStats.pitcher.players;
  if (!players.length) return [];

  const { ageMap, positionMap } = await fetchPlayerMeta(players.map((p) => p.playerId));

  youngPitchersCache = players
    .filter((p) => (ageMap[p.playerId] ?? 99) < 99)
    .map((p) => ({
      playerId:   p.playerId,
      name:       p.name,
      team:       p.team,
      position:   positionMap[p.playerId] ?? "",
      age:        ageMap[p.playerId] ?? 0,
      era:        p.era,
      whip:       p.whip,
      strikeouts: p.strikeouts,
      walks:      0,
      wins:       p.wins,
      innings:    p.innings,
    }));
  youngPitchersCacheTime = Date.now();
  return youngPitchersCache.filter((p) => p.age <= maxAge);
};

const fetchLeagueStats = async () => {
  if (cache && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    return cache;
  }

  const [hitter, pitcher] = await Promise.all([
    fetchAllHitterStats(),
    fetchAllPitcherStats(),
  ]);

  // 規定打席 = 3.1 × 最多試合数、規定投球回 = 1.0 × 最多試合数
  const maxGames     = Math.max(hitter.maxGamesPlayed, pitcher.maxGamesPlayed, 1);
  const qualifyingPA = Math.round(3.1 * maxGames);
  const qualifyingIP = maxGames;

  // 規定到達野手だけを分布に使う（規定未達はランク比較対象外）
  const oaaMap         = getOaaMap();
  const oaaPositionMap = getOaaPositionMap();

  const qualifiedHitters = hitter.players.filter(
    (p) => p.plateAppearances >= qualifyingPA,
  );
  // シーズン序盤で規定到達者が少ない場合は 30+ AB 全体にフォールバック
  const hitterRef = qualifiedHitters.length >= 30 ? qualifiedHitters : hitter.players;

  const oaaByPosition = {};
  for (const p of hitterRef) {
    if (oaaMap[p.playerId] !== undefined) {
      const pos = oaaPositionMap[p.playerId];
      if (pos) {
        if (!oaaByPosition[pos]) oaaByPosition[pos] = [];
        oaaByPosition[pos].push(p.oaa);
      }
    }
  }

  const hitterDistributions = {
    ops:            hitterRef.map((p) => p.ops).filter((v) => v > 0),
    homeRuns:       hitterRef.map((p) => p.homeRuns),
    stolenBases:    hitterRef.map((p) => p.stolenBases),
    avg:            hitterRef.map((p) => p.avg).filter((v) => v > 0),
    rbi:            hitterRef.map((p) => p.rbi),
    oaa:            hitterRef.filter((p) => oaaMap[p.playerId] !== undefined).map((p) => p.oaa),
    oaaByPosition,
    // Sprint/Arm は全選手の CSV 由来なので規定関係なし
    sprintSpeed:    hitter.players.map((p) => p.sprintSpeed).filter((v) => v > 0),
    armStrength:    hitter.players.map((p) => p.armStrength).filter((v) => v > 0),
  };

  // 規定投球回到達投手だけを分布に使う
  const qualifiedPitchers = pitcher.players.filter((p) => p.innings >= qualifyingIP);
  const pitcherRef = qualifiedPitchers.length >= 20 ? qualifiedPitchers : pitcher.players;

  const pitcherDistributions = {
    era:        pitcherRef.map((p) => p.era).filter((v) => v > 0),
    whip:       pitcherRef.map((p) => p.whip).filter((v) => v > 0),
    strikeouts: pitcherRef.map((p) => p.strikeouts),
    walks:      pitcherRef.map((p) => p.walks),
    wins:       pitcherRef.map((p) => p.wins),
    innings:    pitcherRef.map((p) => p.innings).filter((v) => v > 0),
  };

  cache = {
    hitter:  { players: hitter.players,  distributions: hitterDistributions  },
    pitcher: { players: pitcher.players, distributions: pitcherDistributions },
    qualifyingPA,
    qualifyingIP,
  };
  cacheTime = Date.now();

  return cache;
};

// ── オンボーディング用人気選手リスト ──────────────────────────────────────────
// リーグ上位野手 + 投手をまとめて返す。チーム選択なしで選手を発見できるようにする。

const fetchOnboardingPlayers = async ({ hitterLimit = 14, pitcherLimit = 6 } = {}) => {
  const leagueStats = await fetchLeagueStats();

  // 野手: OPS 上位から取得（既にリーダーボードデータなので上位順）
  const topHitters = leagueStats.hitter.players.slice(0, hitterLimit);
  // 投手: ERA 昇順でソート
  const topPitchers = [...leagueStats.pitcher.players]
    .filter((p) => p.era > 0)
    .sort((a, b) => a.era - b.era)
    .slice(0, pitcherLimit);

  // 野手の position + teamId をバッチ取得する
  const hitterIds = topHitters.map((p) => p.playerId);
  const metaMap = {};
  if (hitterIds.length > 0) {
    try {
      const data = await fetchFromMlbApi(
        `https://statsapi.mlb.com/api/v1/people?personIds=${hitterIds.join(",")}`,
        "Failed to fetch onboarding player meta",
      );
      for (const person of data.people || []) {
        metaMap[person.id] = {
          teamId:   person.currentTeam?.id   ?? null,
          position: person.primaryPosition?.abbreviation ?? "",
        };
      }
    } catch { /* メタ取得失敗はスキップ */ }
  }

  const HEADSHOT = (id) =>
    `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

  const hitters = topHitters.map((p) => ({
    mlbPlayerId: p.playerId,
    fullName:    p.name,
    teamName:    p.team,
    teamId:      metaMap[p.playerId]?.teamId   ?? null,
    position:    metaMap[p.playerId]?.position ?? "",
    playerType:  "hitter",
    imageUrl:    HEADSHOT(p.playerId),
    reason:      "League leader in OPS",
    currentSeasonStats: {
      hitterStats: { ops: p.ops, homeRuns: p.homeRuns, battingAverage: p.avg, rbis: p.rbi },
    },
  }));

  const pitchers = topPitchers.map((p) => ({
    mlbPlayerId: p.playerId,
    fullName:    p.name,
    teamName:    p.team,
    teamId:      null,
    position:    "P",
    playerType:  "pitcher",
    imageUrl:    HEADSHOT(p.playerId),
    reason:      "League leader in ERA",
    currentSeasonStats: {
      pitcherStats: { era: p.era, strikeouts: p.strikeouts, inningsPitched: p.innings },
    },
  }));

  return [...hitters, ...pitchers];
};

// ── オールスター選出選手リスト ────────────────────────────────────────────────
// ファン投票で選ばれたオールスターゲームのロースターを取得する。
// シーズン序盤(選出発表前)はロースターがまだ存在しないため、空配列を返す
// (呼び出し側の fetchPopularPlayers() がリーグ成績上位にフォールバックする)。

const fetchAllStarPlayers = async () => {
  const scheduleParams = new URLSearchParams({
    sportId:  "1",
    gameType: "A",
    season:   CURRENT_SEASON,
  });

  const schedule = await fetchFromMlbApi(
    `https://statsapi.mlb.com/api/v1/schedule?${scheduleParams}`,
    "Failed to fetch All-Star Game schedule",
  );

  const gamePk = schedule.dates?.[0]?.games?.[0]?.gamePk;
  if (!gamePk) return [];

  const boxscore = await fetchFromMlbApi(
    `https://statsapi.mlb.com/api/v1/game/${gamePk}/boxscore`,
    "Failed to fetch All-Star Game boxscore",
  );

  const awayPlayers = Object.values(boxscore.teams?.away?.players ?? {});
  const homePlayers = Object.values(boxscore.teams?.home?.players ?? {});
  const rosterEntries = [...awayPlayers, ...homePlayers].filter((p) => p.person?.id);

  if (rosterEntries.length === 0) return [];

  // position・所属チームをバッチ取得する(boxscoreのplayer情報はteam名を含まないため)
  const playerIds = rosterEntries.map((p) => p.person.id);
  const metaMap = {};
  try {
    const data = await fetchFromMlbApi(
      `https://statsapi.mlb.com/api/v1/people?personIds=${playerIds.join(",")}&hydrate=currentTeam`,
      "Failed to fetch All-Star player meta",
    );
    for (const person of data.people || []) {
      metaMap[person.id] = {
        teamId:   person.currentTeam?.id   ?? null,
        teamName: person.currentTeam?.name ?? "",
        position: person.primaryPosition?.abbreviation ?? "",
      };
    }
  } catch { /* メタ取得失敗はスキップ(team名/positionが空のまま表示される) */ }

  const HEADSHOT = (id) =>
    `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

  return rosterEntries.map((entry) => {
    const id = entry.person.id;
    const meta = metaMap[id] ?? {};
    const position = meta.position || entry.position?.abbreviation || "";
    return {
      mlbPlayerId: id,
      fullName:    entry.person.fullName,
      teamName:    meta.teamName || "",
      teamId:      meta.teamId ?? null,
      position,
      playerType:  position === "P" ? "pitcher" : "hitter",
      imageUrl:    HEADSHOT(id),
      reason:      `${CURRENT_SEASON} All-Star`,
    };
  });
};

// ── 人気選手リスト(オールスター優先、フォールバック付き) ───────────────────────
// ファン投票のオールスターの方が「人気選手」の実態に近いため優先する。
// シーズン序盤で選出前の場合は、既存のOPS/ERA上位リストにフォールバックする。
// この関数は OnboardingFavoritesPage(選手選択画面)とHome画面のPopular Players
// 両方から共通で使われる。

const fetchPopularPlayers = async () => {
  try {
    const allStars = await fetchAllStarPlayers();
    if (allStars.length > 0) return allStars;
  } catch (error) {
    console.error("All-Star roster fetch failed, falling back to league leaders:", error.message);
  }
  return fetchOnboardingPlayers();
};

module.exports = {
  fetchLeagueStats,
  fetchYoungLeaguePlayers,
  fetchYoungPitchers,
  fetchOnboardingPlayers,
  fetchAllStarPlayers,
  fetchPopularPlayers,
};
