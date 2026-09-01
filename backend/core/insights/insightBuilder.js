/**
 * 記録データからルールベースでInsight（傾向）を検出する純粋関数。
 *
 * docs/insights.md 参照。graphBuilder.js と同じ方針でDB・HTTPに依存しない。
 * 入力は services/coffee/coffeeRecordSerializer.js が返す形と同じ配列。
 *
 * 「自然言語による味覚分析」（docs/mvp.md Out of Scope）とは異なり、
 * notes などの自由記述は一切読まない。産地・精製方法・フレーバー・評価・
 * 記録タイプ・日付という構造化データの集計・閾値判定だけで組み立てる
 * （docs/product-principles.md「MVP Before Intelligence」参照）。
 *
 * データが少ないうちに断定的な一文を出すと、統計的に意味の無い偶然を
 * 「傾向」と誤って伝えてしまう。種類ごとに最低件数・評価差などの閾値を
 * 設け、満たすものが無ければ何も返さない（0件のときに無理に何か
 * 表示しようとしない）。
 */

import { average, roundTo1, pickTop } from "../shared/aggregationHelpers.js";

// 閾値。件数や評価差の基準に「絶対の正解」は無いため、ここへ集約して
// 将来チューニングしやすくしている
const THRESHOLDS = {
  minOriginCount: 3,
  minFlavorCount: 3,
  minProcessRatingSample: 2,
  minComboSample: 2,
  highRating: 4.0,
  minHomeCafeSample: 2,
  minHomeCafeRatingDiff: 1.0,
  minTrendRecentCount: 2,
  minTrendShareIncrease: 0.4,
};

// 優先度順（具体的・説得力があると考えられる順）。
// 上から順に条件を満たすものを探し、見つかった時点でそれを採用する
const PRIORITY = [
  "topCombination",
  "risingTrend",
  "homeVsCafeDiff",
  "topProcessRating",
  "topFlavor",
  "topOrigin",
];

const ratingsOf = (records) => records.map((record) => record.rating).filter((rating) => rating != null);

/** 単数の参照（origin/process）でグループ化する */
const groupBySingleRef = (records, getRef) => {
  const groups = new Map();
  for (const record of records) {
    const ref = getRef(record);
    if (!ref) continue;
    if (!groups.has(ref.id)) groups.set(ref.id, { label: ref.name, records: [] });
    groups.get(ref.id).records.push(record);
  }
  return groups;
};

/** 複数の参照（flavors）でグループ化する */
const groupByMultiRef = (records, getRefs) => {
  const groups = new Map();
  for (const record of records) {
    for (const ref of getRefs(record) ?? []) {
      if (!groups.has(ref.id)) groups.set(ref.id, { label: ref.name, records: [] });
      groups.get(ref.id).records.push(record);
    }
  }
  return groups;
};

/** 最も多く登場する産地（3件以上、同率首位のときは断定しない） */
const findTopOrigin = (records) => {
  const candidates = [...groupBySingleRef(records, (record) => record.origin).values()].map(
    (group) => ({ label: group.label, count: group.records.length }),
  );
  const top = pickTop(candidates, THRESHOLDS.minOriginCount);
  if (!top) return null;

  return { type: "topOrigin", label: top.label, count: top.count };
};

/** よく選ぶフレーバー（3件以上、同率首位のときは断定しない） */
const findTopFlavor = (records) => {
  const candidates = [...groupByMultiRef(records, (record) => record.flavors).values()].map(
    (group) => ({ label: group.label, count: group.records.length }),
  );
  const top = pickTop(candidates, THRESHOLDS.minFlavorCount);
  if (!top) return null;

  return { type: "topFlavor", label: top.label, count: top.count };
};

/** 高評価が多い精製方法（2件以上・平均4.0以上のうち最高） */
const findTopProcessRating = (records) => {
  const groups = groupBySingleRef(records, (record) => record.process);

  const candidates = [...groups.values()]
    .map((group) => ({ label: group.label, ratings: ratingsOf(group.records) }))
    .filter((candidate) => candidate.ratings.length >= THRESHOLDS.minProcessRatingSample)
    .map((candidate) => ({
      label: candidate.label,
      avgRating: average(candidate.ratings),
      count: candidate.ratings.length,
    }))
    .filter((candidate) => candidate.avgRating >= THRESHOLDS.highRating)
    .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count);

  const top = candidates[0];
  if (!top) return null;

  return { type: "topProcessRating", label: top.label, avgRating: roundTo1(top.avgRating), count: top.count };
};

/** 評価の高い産地×精製方法の組み合わせ（2件以上・平均4.0以上のうち最高） */
const findTopCombination = (records) => {
  const groups = new Map();
  for (const record of records) {
    if (!record.origin || !record.process || record.rating == null) continue;
    const key = `${record.origin.id}::${record.process.id}`;
    if (!groups.has(key)) {
      groups.set(key, { origin: record.origin.name, process: record.process.name, ratings: [] });
    }
    groups.get(key).ratings.push(record.rating);
  }

  const candidates = [...groups.values()]
    .filter((group) => group.ratings.length >= THRESHOLDS.minComboSample)
    .map((group) => ({
      origin: group.origin,
      process: group.process,
      avgRating: average(group.ratings),
      count: group.ratings.length,
    }))
    .filter((candidate) => candidate.avgRating >= THRESHOLDS.highRating)
    .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count);

  const top = candidates[0];
  if (!top) return null;

  return {
    type: "topCombination",
    attributes: [
      { attrType: "origin", label: top.origin },
      { attrType: "process", label: top.process },
    ],
    avgRating: roundTo1(top.avgRating),
    count: top.count,
  };
};

/** 自宅とカフェでの評価の違い（各2件以上・差1.0以上） */
const findHomeVsCafeDiff = (records) => {
  const homeRatings = ratingsOf(records.filter((record) => record.recordType === "home"));
  const cafeRatings = ratingsOf(records.filter((record) => record.recordType === "cafe"));

  if (homeRatings.length < THRESHOLDS.minHomeCafeSample || cafeRatings.length < THRESHOLDS.minHomeCafeSample) {
    return null;
  }

  const homeAvg = average(homeRatings);
  const cafeAvg = average(cafeRatings);
  const diff = cafeAvg - homeAvg;
  if (Math.abs(diff) < THRESHOLDS.minHomeCafeRatingDiff) return null;

  return {
    type: "homeVsCafeDiff",
    higherType: diff > 0 ? "cafe" : "home",
    homeAvg: roundTo1(homeAvg),
    cafeAvg: roundTo1(cafeAvg),
    homeCount: homeRatings.length,
    cafeCount: cafeRatings.length,
  };
};

const getOriginRefs = (record) => (record.origin ? [record.origin] : []);
const getFlavorRefs = (record) => record.flavors ?? [];

/** 集団内での各参照（産地 or フレーバー）の登場回数を数える */
const countRefs = (group, getRefs) => {
  const counts = new Map();
  for (const record of group) {
    for (const ref of getRefs(record)) {
      const entry = counts.get(ref.id) ?? { label: ref.name, count: 0 };
      entry.count += 1;
      counts.set(ref.id, entry);
    }
  }
  return counts;
};

/**
 * 最近増えている傾向。consumedAt昇順に並べ、直近側（末尾から1/3、
 * 最低2件）とそれ以前を比較する。産地・フレーバーのどちらかで、
 * 直近側での登場割合が明確に増えているものを探す
 */
const findRisingTrend = (records) => {
  const dated = [...records]
    .filter((record) => record.consumedAt)
    .sort((a, b) => new Date(a.consumedAt) - new Date(b.consumedAt));

  const recentSize = Math.max(2, Math.ceil(dated.length / 3));
  if (dated.length < recentSize + THRESHOLDS.minTrendRecentCount) return null;

  const recent = dated.slice(-recentSize);
  const earlier = dated.slice(0, -recentSize);
  if (earlier.length === 0) return null;

  const candidates = [];
  for (const getRefs of [getOriginRefs, getFlavorRefs]) {
    const recentCounts = countRefs(recent, getRefs);
    const earlierCounts = countRefs(earlier, getRefs);

    for (const [id, { label, count: recentCount }] of recentCounts) {
      if (recentCount < THRESHOLDS.minTrendRecentCount) continue;
      const earlierCount = earlierCounts.get(id)?.count ?? 0;
      const shareIncrease = recentCount / recent.length - earlierCount / earlier.length;
      if (shareIncrease >= THRESHOLDS.minTrendShareIncrease) {
        candidates.push({ label, recentCount, earlierCount, shareIncrease });
      }
    }
  }

  candidates.sort((a, b) => b.shareIncrease - a.shareIncrease);
  const top = candidates[0];
  if (!top) return null;

  return { type: "risingTrend", label: top.label, recentCount: top.recentCount, earlierCount: top.earlierCount };
};

const FINDERS = {
  topCombination: findTopCombination,
  risingTrend: findRisingTrend,
  homeVsCafeDiff: findHomeVsCafeDiff,
  topProcessRating: findTopProcessRating,
  topFlavor: findTopFlavor,
  topOrigin: findTopOrigin,
};

/**
 * 記録からInsightの一覧を生成する。PRIORITY順に並んだ配列を返し、
 * 条件を満たすものが1つも無ければ空配列を返す。
 *
 * @param {Array} records serializeCoffeeRecordsが返す形と同じ配列
 * @returns {{ insights: Array }}
 */
export const buildInsights = (records) => {
  const insights = PRIORITY.map((type) => FINDERS[type](records)).filter(Boolean);
  return { insights };
};
