const { fetchFromMlbApi } = require("./mlbClient");

const LEADERS_URL = "https://statsapi.mlb.com/api/v1/stats/leaders";
const PEOPLE_URL  = "https://statsapi.mlb.com/api/v1/people";
const TEAMS_URL   = "https://statsapi.mlb.com/api/v1/teams";
const SEASON      = new Date().getFullYear().toString();

const SPORT_IDS   = [11, 12]; // AAA=11, AA=12
const SPORT_LABEL = { 11: "Triple-A", 12: "Double-A" };

const HITTER_CATEGORIES = [
  "onBasePlusSlugging",
  "homeRuns",
  "stolenBases",
  "battingAverage",
  "runsBattedIn",
];

const PITCHER_CATEGORIES = [
  "earnedRunAverage",
  "walksAndHitsPerInningPitched",
  "strikeouts",
  "wins",
  "inningsPitched",
];

const HITTER_CAT_KEY = {
  onBasePlusSlugging: "ops",
  homeRuns:           "homeRuns",
  stolenBases:        "stolenBases",
  battingAverage:     "avg",
  runsBattedIn:       "rbi",
};

const PITCHER_CAT_KEY = {
  earnedRunAverage:             "era",
  walksAndHitsPerInningPitched: "whip",
  strikeouts:                   "strikeouts",
  wins:                         "wins",
  inningsPitched:               "innings",
};

const HEADSHOT = (id) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`;

// ── キャッシュ ─────────────────────────────────────────────────────────────

let cache     = null;
let cacheTime = 0;
const TTL_MS  = 24 * 60 * 60 * 1000;

const teamCache = {};

// ── ヘルパー ───────────────────────────────────────────────────────────────

const toNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

const getTeamMeta = async (teamId) => {
  if (teamCache[teamId]) return teamCache[teamId];
  try {
    const data = await fetchFromMlbApi(`${TEAMS_URL}/${teamId}`);
    const t    = data.teams?.[0] || {};
    const meta = {
      parentOrgName: t.parentOrgName || "",
      parentOrgId:   t.parentOrgId   || null,
      level:         t.sport?.name   || "",
    };
    teamCache[teamId] = meta;
    return meta;
  } catch {
    return { parentOrgName: "", parentOrgId: null, level: "" };
  }
};

// sportId × カテゴリでリーダーを取得し playerMap に集約する
const fetchLeaders = async (categories, catKey, defaultStats) => {
  const playerMap = {};

  for (const sportId of SPORT_IDS) {
    const url = `${LEADERS_URL}?sportId=${sportId}&leaderCategories=${categories.join(",")}&season=${SEASON}&limit=60`;
    let data;
    try {
      data = await fetchFromMlbApi(url);
    } catch {
      continue;
    }

    for (const cat of data.leagueLeaders || []) {
      const statKey = catKey[cat.leaderCategory];
      if (!statKey) continue;

      for (const item of cat.leaders || []) {
        const id = item.person?.id;
        if (!id) continue;

        if (!playerMap[id]) {
          playerMap[id] = {
            playerId: id,
            fullName: item.person.fullName || "",
            teamId:   item.team?.id   || null,
            teamName: item.team?.name || "",
            sportId,
            ...defaultStats,
          };
        }

        playerMap[id][statKey] = toNum(item.value);
        if (sportId < playerMap[id].sportId) playerMap[id].sportId = sportId;
      }
    }
  }

  return Object.values(playerMap);
};

// age + position をバッチ取得して Map で返す
const fetchPeopleMap = async (players) => {
  const ids = players.map((p) => p.playerId);
  const map = {};
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50).join(",");
    try {
      const data = await fetchFromMlbApi(`${PEOPLE_URL}?personIds=${chunk}`);
      for (const person of data.people || []) {
        map[person.id] = {
          age:      person.currentAge || 0,
          position: person.primaryPosition?.abbreviation || "",
        };
      }
    } catch { /* スキップ */ }
  }
  return map;
};

// raw playerMap エントリを表示用オブジェクトへ変換する
const buildProspect = (p, peopleMap) => {
  const meta  = peopleMap[p.playerId] || {};
  const tMeta = p.teamId ? teamCache[p.teamId] || {} : {};
  return {
    playerId:    p.playerId,
    fullName:    p.fullName,
    level:       tMeta.level || SPORT_LABEL[p.sportId] || "MiLB",
    team:        p.teamName,
    teamId:      p.teamId,
    parentOrg:   tMeta.parentOrgName || "",
    parentOrgId: tMeta.parentOrgId   || null,
    age:         meta.age      || 0,
    position:    meta.position || "",
    imageUrl:    HEADSHOT(p.playerId),
    // 野手スタッツ
    ops:         p.ops         ?? 0,
    homeRuns:    p.homeRuns    ?? 0,
    stolenBases: p.stolenBases ?? 0,
    avg:         p.avg         ?? 0,
    rbi:         p.rbi         ?? 0,
    // 投手スタッツ
    era:         p.era         ?? 0,
    whip:        p.whip        ?? 0,
    strikeouts:  p.strikeouts  ?? 0,
    wins:        p.wins        ?? 0,
    innings:     p.innings     ?? 0,
  };
};

// ── メイン取得関数 ─────────────────────────────────────────────────────────

const fetchProspects = async () => {
  if (cache && Date.now() - cacheTime < TTL_MS) return cache;

  const [hitterRaw, pitcherRaw] = await Promise.all([
    fetchLeaders(HITTER_CATEGORIES,  HITTER_CAT_KEY,  { ops:0, homeRuns:0, stolenBases:0, avg:0, rbi:0 }),
    fetchLeaders(PITCHER_CATEGORIES, PITCHER_CAT_KEY, { era:0, whip:0, strikeouts:0, wins:0, innings:0 }),
  ]);

  // age + position を全選手まとめてバッチ取得する
  const allPlayers = [...hitterRaw, ...pitcherRaw];
  const peopleMap  = await fetchPeopleMap(allPlayers);

  // チームメタを並列取得する
  const uniqueTeamIds = [...new Set(allPlayers.map((p) => p.teamId).filter(Boolean))];
  await Promise.all(uniqueTeamIds.map(getTeamMeta));

  const hitters  = hitterRaw.map((p) => buildProspect(p, peopleMap))
    .sort((a, b) => b.ops - a.ops);

  // 投手は ERA 昇順（低いほど良い）、ただし ERA=0 は除外
  const pitchers = pitcherRaw.map((p) => buildProspect(p, peopleMap))
    .filter((p) => p.era > 0)
    .sort((a, b) => a.era - b.era);

  cache     = { hitters, pitchers };
  cacheTime = Date.now();
  return cache;
};

module.exports = { fetchProspects };
