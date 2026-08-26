/**
 * 記録から「コーヒータイプ」を1つ判定するルールベースの純粋関数。
 *
 * docs/features.md「Coffee Diagnosis」参照。insightBuilder.jsと同じ方針で
 * DB・HTTPに依存しない。notesなどの自由記述は読まず、roastLevel.orderと
 * flavors[].categoryという構造化データの集計・条件分岐だけで判定する
 * （docs/product.md「MVP Before Intelligence」）。
 *
 * serializeCoffeeRecords が返す record.roastLevel / record.flavors は
 * { id, name } までしか持たない（order・categoryはpopulateしてもserializer側で
 * 落とされる。coffeeRecordSerializer.js の serializeRef 参照）。そのため
 * order・categoryはservice層がマスターデータから作る索引（Map）を
 * 引数で受け取って引く。
 */

const THRESHOLDS = {
  minRoastSample: 3,
  minFlavorSample: 3,
};

// order(1〜5) → バケット。seeds/data/roastLevels.js の5段階と対応する
const ROAST_BUCKET_BY_ORDER = {
  1: "light",
  2: "light",
  3: "medium",
  4: "dark",
  5: "dark",
};

// 優先順位順（具体的な焙煎度×フレーバーの組み合わせを先に、焙煎度だけの
// 一般則を後に）。ARCHETYPESを先頭から走査し、最初に一致した行を採用する。
// insightBuilder.jsの別立てPRIORITY配列と違い、ここでは配列の並び順自体が
// 優先順位を兼ねる
const ARCHETYPES = [
  { roastBucket: "light", category: "fruity", type: "lightFruity" },
  { roastBucket: "light", category: "floral", type: "lightFloral" },
  { roastBucket: "dark", category: "nutty", type: "darkNutty" },
  { roastBucket: "dark", category: "sweet", type: "darkSweet" },
  { roastBucket: "medium", category: "spicy", type: "mediumSpicy" },
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
  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted[0];
  if (!top) return null;
  if (sorted[1]?.[1] === top[1]) return null;
  return top[0];
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
 * フレーバーのcategoryを集計し、首位categoryを求める。
 *
 * 焙煎度と違い、件数不足・同率首位のときも診断全体をnullにはしない
 * （呼び出し側でnullを「categoryは問わない」として扱う）。categoryは
 * 「わかれば絞り込みに使う」補助的な軸で、焙煎度ほど判定の根拠として
 * 強くないと判断したため。ARCHETYPESのcategory: nullの行が、その場合の
 * 一般則としてのフォールバックになる
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

  return findTopKey(countBy(categories));
};

/**
 * 記録から「コーヒータイプ」を1つ判定する。
 *
 * @param {Array} records serializeCoffeeRecordsが返す形と同じ配列
 * @param {Map<string, number>} roastOrderById RoastLevelの_id文字列 → order(1〜5)
 * @param {Map<string, string>} flavorCategoryById Flavorの_id文字列 → category
 * @returns {{ archetype: null | { type: string, sampleSize: number } }}
 */
export const buildArchetype = (records, roastOrderById, flavorCategoryById) => {
  const roastSummary = summarizeRoastBucket(records, roastOrderById);
  if (!roastSummary) return { archetype: null };

  const topCategory = summarizeFlavorCategory(records, flavorCategoryById);

  const matched = ARCHETYPES.find(
    (archetype) =>
      archetype.roastBucket === roastSummary.topBucket &&
      (archetype.category === null || archetype.category === topCategory),
  );
  if (!matched) return { archetype: null };

  return { archetype: { type: matched.type, sampleSize: roastSummary.sampleSize } };
};
