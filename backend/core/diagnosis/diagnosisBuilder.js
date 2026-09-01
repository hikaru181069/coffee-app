/**
 * 記録から「コーヒータイプ」を1つ判定するルールベースの純粋関数。
 *
 * docs/features.md「Coffee Diagnosis」参照。insightBuilder.jsと同じ方針で
 * DB・HTTPに依存しない。notesなどの自由記述は読まず、roastLevel.orderと
 * flavors[].categoryという構造化データの集計・条件分岐だけで主軸の
 * タイプ（type）を判定する（docs/product.md「MVP Before Intelligence」）。
 *
 * 2026-08、診断の「強化」（種類を増やす・入力信号を増やす・透明性を
 * 上げる）に対応した。主軸（焙煎度×フレーバーcategory）に精製方法や
 * 品種をさらに掛け合わせると組み合わせ数が爆発するため、typeの判定軸は
 * 焙煎度×category のままにし、精製方法・品種・6軸の味覚評価は
 * 「判定結果に付随する補足情報」として独立に算出する
 * （dominantProcess/dominantVariety/tasteProfile。docs/domain-model.md
 * 「Coffee Diagnosis での利用」参照）。
 *
 * serializeCoffeeRecords が返す record.roastLevel / record.flavors は
 * { id, name } までしか持たない（order・categoryはpopulateしてもserializer側で
 * 落とされる。coffeeRecordSerializer.js の serializeRef 参照）。そのため
 * order・categoryはservice層がマスターデータから作る索引（Map）を
 * 引数で受け取って引く。一方 record.process / record.varieties は
 * 名前がそのままserializeされているため、追加の索引は不要
 * （coffeeRecordSerializer.js参照）。
 */

import { pickTop } from "../shared/aggregationHelpers.js";

const THRESHOLDS = {
  minRoastSample: 3,
  minFlavorSample: 3,
  minProcessSample: 3,
  minVarietySample: 3,
  minTasteSample: 3,
};

// order(1〜5) → バケット。seeds/data/roastLevels.js の5段階と対応する
const ROAST_BUCKET_BY_ORDER = {
  1: "light",
  2: "light",
  3: "medium",
  4: "dark",
  5: "dark",
};

// 6軸の味覚評価。CoffeeRecord.jsのフィールド名と揃える
// （frontend/src/features/coffee-records/components/TasteRadarChart.jsxへ
// そのまま渡せるようにするため）
const TASTE_FIELDS = [
  "tasteSweetness",
  "tasteBitterness",
  "tasteAcidity",
  "tasteBody",
  "tasteAroma",
  "tasteAftertaste",
];

// 優先順位順（具体的な焙煎度×フレーバーの組み合わせを先に、焙煎度だけの
// 一般則を後に）。ARCHETYPESを先頭から走査し、最初に一致した行を採用する。
// insightBuilder.jsの別立てPRIORITY配列と違い、ここでは配列の並び順自体が
// 優先順位を兼ねる。
//
// 2026-08、焙煎度3種×category6種の組み合わせ全18種（元は5種のみ具体名が
// あり、残り13種は焙煎度だけの一般則に落ちていた）＋category不明時の
// 一般則3種、計21種へ拡張した。
const ARCHETYPES = [
  { roastBucket: "light", category: "fruity", type: "lightFruity" },
  { roastBucket: "light", category: "floral", type: "lightFloral" },
  { roastBucket: "light", category: "sweet", type: "lightSweet" },
  { roastBucket: "light", category: "nutty", type: "lightNutty" },
  { roastBucket: "light", category: "spicy", type: "lightSpicy" },
  { roastBucket: "light", category: "other", type: "lightOther" },
  { roastBucket: "medium", category: "fruity", type: "mediumFruity" },
  { roastBucket: "medium", category: "floral", type: "mediumFloral" },
  { roastBucket: "medium", category: "nutty", type: "mediumNutty" },
  { roastBucket: "medium", category: "sweet", type: "mediumSweet" },
  { roastBucket: "medium", category: "spicy", type: "mediumSpicy" },
  { roastBucket: "medium", category: "other", type: "mediumOther" },
  { roastBucket: "dark", category: "fruity", type: "darkFruity" },
  { roastBucket: "dark", category: "floral", type: "darkFloral" },
  { roastBucket: "dark", category: "nutty", type: "darkNutty" },
  { roastBucket: "dark", category: "sweet", type: "darkSweet" },
  { roastBucket: "dark", category: "spicy", type: "darkSpicy" },
  { roastBucket: "dark", category: "other", type: "darkOther" },
  { roastBucket: "light", category: null, type: "light" },
  { roastBucket: "dark", category: null, type: "dark" },
  { roastBucket: "medium", category: null, type: "medium" },
];

const countBy = (values) => {
  const counts = new Map();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return counts;
};

/** 登場回数トップのキーを返す。同率首位のときは断定せず null を返す */
const findTopKey = (counts) => {
  const candidates = [...counts.entries()].map(([key, count]) => ({ key, count }));
  const top = pickTop(candidates);
  return top ? top.key : null;
};

/** 焙煎度をバケット分けし、件数と首位バケットを求める */
const summarizeRoastBucket = (records, roastOrderById) => {
  const buckets = [];
  for (const record of records) {
    if (!record.roastLevel) continue;
    const order = roastOrderById.get(record.roastLevel.id);
    const bucket = ROAST_BUCKET_BY_ORDER[order];
    if (bucket) buckets.push(bucket);
  }

  if (buckets.length < THRESHOLDS.minRoastSample) return null;

  const topBucket = findTopKey(countBy(buckets));
  if (!topBucket) return null;

  return { topBucket, sampleSize: buckets.length };
};

/**
 * フレーバーのcategoryを集計し、首位categoryと一致件数を求める。
 *
 * 焙煎度と違い、件数不足・同率首位のときも診断全体をnullにはしない
 * （呼び出し側でnullを「categoryは問わない」として扱う）。categoryは
 * 「わかれば絞り込みに使う」補助的な軸で、焙煎度ほど判定の根拠として
 * 強くないと判断したため。ARCHETYPESのcategory: nullの行が、その場合の
 * 一般則としてのフォールバックになる。
 *
 * @returns {{ topCategory: string, sampleSize: number } | null}
 */
const summarizeFlavorCategory = (records, flavorCategoryById) => {
  const categories = [];
  for (const record of records) {
    for (const flavor of record.flavors ?? []) {
      const category = flavorCategoryById.get(flavor.id);
      if (category) categories.push(category);
    }
  }

  if (categories.length < THRESHOLDS.minFlavorSample) return null;

  const counts = countBy(categories);
  const topCategory = findTopKey(counts);
  if (!topCategory) return null;

  return { topCategory, sampleSize: counts.get(topCategory) };
};

/**
 * {id, name}参照の配列から、最も多く登場するものを求める。
 * 3件未満・同率首位ならnull（Discoverのdiscoverbuilder.js
 * findDominantProcessと同じ考え方）。
 *
 * @param {Array<{id: string, name: string}>} refs
 * @param {number} minSample
 * @returns {{ label: string, count: number } | null}
 */
const summarizeDominantRef = (refs, minSample) => {
  if (refs.length < minSample) return null;

  const counts = new Map();
  for (const ref of refs) {
    const entry = counts.get(ref.id) ?? { label: ref.name, count: 0 };
    entry.count += 1;
    counts.set(ref.id, entry);
  }

  return pickTop([...counts.values()]);
};

/** 全記録のprocessを集計する（record.processは{id,name}|null） */
const summarizeDominantProcess = (records) => {
  const refs = records.map((record) => record.process).filter((ref) => ref != null);
  return summarizeDominantRef(refs, THRESHOLDS.minProcessSample);
};

/** 全記録のvarietiesを集計する（record.varietiesは{id,name}[]） */
const summarizeDominantVariety = (records) => {
  const refs = records.flatMap((record) => record.varieties ?? []);
  return summarizeDominantRef(refs, THRESHOLDS.minVarietySample);
};

/**
 * 6軸の味覚評価の平均を、軸ごとに独立して求める。
 *
 * 軸ごとに値が入っている記録だけを対象にするため、記録によって
 * 入力済みの軸が違っていても軸単位で正しく平均できる。対象件数が
 * 閾値未満の軸はnull（TasteRadarChart.jsxが既にnullを「未評価」として
 * 描画できるため、フロント側の追加分岐は不要）。
 *
 * @returns {Record<typeof TASTE_FIELDS[number], number | null>}
 */
const computeTasteProfile = (records) => {
  const profile = {};
  for (const field of TASTE_FIELDS) {
    const values = records.map((record) => record[field]).filter((value) => value != null);
    profile[field] =
      values.length < THRESHOLDS.minTasteSample
        ? null
        : Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
  }
  return profile;
};

/**
 * 記録から「コーヒータイプ」を1つ判定する。
 *
 * @param {Array} records serializeCoffeeRecordsが返す形と同じ配列
 * @param {Map<string, number>} roastOrderById RoastLevelの_id文字列 → order(1〜5)
 * @param {Map<string, string>} flavorCategoryById Flavorの_id文字列 → category
 * @returns {{ archetype: null | {
 *   type: string,
 *   roastSampleSize: number,
 *   categorySampleSize: number | null,
 *   dominantProcess: { label: string, count: number } | null,
 *   dominantVariety: { label: string, count: number } | null,
 *   tasteProfile: Record<string, number | null>,
 * } }}
 */
export const buildArchetype = (records, roastOrderById, flavorCategoryById) => {
  const roastSummary = summarizeRoastBucket(records, roastOrderById);
  if (!roastSummary) return { archetype: null };

  const categorySummary = summarizeFlavorCategory(records, flavorCategoryById);
  const topCategory = categorySummary?.topCategory ?? null;

  const matched = ARCHETYPES.find(
    (archetype) =>
      archetype.roastBucket === roastSummary.topBucket &&
      (archetype.category === null || archetype.category === topCategory),
  );
  if (!matched) return { archetype: null };

  return {
    archetype: {
      type: matched.type,
      roastSampleSize: roastSummary.sampleSize,
      categorySampleSize: categorySummary?.sampleSize ?? null,
      dominantProcess: summarizeDominantProcess(records),
      dominantVariety: summarizeDominantVariety(records),
      tasteProfile: computeTasteProfile(records),
    },
  };
};
