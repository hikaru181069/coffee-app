const { fetchFromMlbApi } = require("./mlbClient");

// 生年月日・出身校・ドラフト年・身長体重・利き手など、選手ごとに変わらない
// 静的な事実。一度取得したらプロセス生存中はキャッシュしっぱなしでよい(TTL不要)。
const profileCache = {};

/**
 * MLB Stats API の構造化データ(出身校・ドラフト年・デビュー年など)から
 * カード1行に収まる紹介文を組み立てる。
 * 大学 > 高校 > ドラフト年 > 出身国(海外の場合) の優先順で「一番特徴的な事実」を選び、
 * MLBデビュー年があれば付け足す。該当データが無い選手はnullを返す。
 */
const buildBioLine = (person) => {
  const college = person.education?.colleges?.[0]?.name;
  const highschool = person.education?.highschools?.[0];
  const draftYear = person.draftYear;
  const debutYear = person.mlbDebutDate?.slice(0, 4);
  const birthCountry = person.birthCountry;

  let primary = null;
  if (college) {
    primary = college;
  } else if (highschool?.name) {
    primary = highschool.state ? `${highschool.name}, ${highschool.state}` : highschool.name;
  } else if (draftYear) {
    primary = `Drafted ${draftYear}`;
  } else if (birthCountry && birthCountry !== "USA") {
    primary = `Born in ${birthCountry}`;
  }

  const parts = [primary, debutYear ? `MLB debut ${debutYear}` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
};

const buildProfile = (person) => ({
  bioLine: buildBioLine(person),
  age: person.currentAge ?? null,
  height: person.height ?? null,
  weight: person.weight ?? null,
  number: person.primaryNumber ?? null,
  batSide: person.batSide?.code ?? null,
  pitchHand: person.pitchHand?.code ?? null,
  birthCity: person.birthCity ?? null,
  birthStateProvince: person.birthStateProvince ?? null,
  birthCountry: person.birthCountry ?? null,
  mlbDebutDate: person.mlbDebutDate ?? null,
});

const ensureProfiles = async (playerIds) => {
  const ids = [...new Set(playerIds.map(Number))].filter(Boolean);
  const uncachedIds = ids.filter((id) => !(id in profileCache));

  const chunks = [];
  for (let i = 0; i < uncachedIds.length; i += 50) {
    chunks.push(uncachedIds.slice(i, i + 50));
  }

  await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const data = await fetchFromMlbApi(
          `https://statsapi.mlb.com/api/v1/people?personIds=${chunk.join(",")}&hydrate=education`,
          "Failed to fetch player bios",
        );
        for (const person of data.people || []) {
          profileCache[person.id] = buildProfile(person);
        }
      } catch {
        // 失敗した分はキャッシュに残さず、次回呼び出し時にまた取得を試みる
      }
    }),
  );

  return ids;
};

/**
 * 複数選手の紹介文(1行)だけを一括取得する。PlayerCard等の軽量表示用。
 * @returns {Promise<Record<number, string|null>>}
 */
const getPlayerBios = async (playerIds) => {
  const ids = await ensureProfiles(playerIds);
  const result = {};
  for (const id of ids) result[id] = profileCache[id]?.bioLine ?? null;
  return result;
};

/**
 * 複数選手の構造化プロフィール(年齢・身長体重・利き手・背番号・出身地など)を
 * 一括取得する。Home Heroのスカウトレポート表示用。
 * @returns {Promise<Record<number, object|null>>}
 */
const getPlayerProfiles = async (playerIds) => {
  const ids = await ensureProfiles(playerIds);
  const result = {};
  for (const id of ids) result[id] = profileCache[id] ?? null;
  return result;
};

module.exports = { getPlayerBios, getPlayerProfiles };
