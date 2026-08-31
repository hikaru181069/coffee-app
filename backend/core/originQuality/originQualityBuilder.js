/**
 * 産地の品質スコア（CQI参照データ）を組み立てる純粋関数。
 *
 * docs/features.md「Origin Quality」参照。DB・HTTPに依存しない
 * （graphBuilder.js / discoverBuilder.js と同じ方針）。
 *
 * Discover（core/discover/discoverBuilder.js）は「次に何を試すべきか」
 * という提案を作るのに対し、こちらは「この産地自体の特徴（品質スコア）は
 * 何か」という描写的な情報を返すだけで、提案（まだ試していない他産地への
 * リンク）は一切生成しない。同じCQIデータを別の問いのために使う、
 * Insight/Statsと同じ関係。
 */

/**
 * 指定した産地の、精製方法ごとの品質スコア一覧を返す。
 *
 * @param {{ entries: Array<{ originName: string, processName: string, avgQualityScore: number, sampleSize: number }> }} cqiDataset
 * @param {string} originName
 * @returns {Array<{ processLabel: string, avgQualityScore: number, sampleSize: number }>} スコアの高い順
 */
export const getQualityScoresForOrigin = (cqiDataset, originName) =>
  (cqiDataset.entries ?? [])
    .filter((entry) => entry.originName === originName)
    .map((entry) => ({
      processLabel: entry.processName,
      avgQualityScore: entry.avgQualityScore,
      sampleSize: entry.sampleSize,
    }))
    .sort((a, b) => b.avgQualityScore - a.avgQualityScore);

/**
 * CQIデータに登場する全産地について、精製方法をまたいだ平均品質スコアを
 * 産地ごとに1つ返す（World Mapの色分け用。1産地1色にするための単純平均。
 * サンプル数による重み付けは、CQIデータ自体が目安値であるため過剰な精度と
 * 判断し行わない）。
 *
 * @param {{ entries: Array }} cqiDataset
 * @returns {Array<{ originName: string, avgQualityScore: number }>} スコアの高い順
 */
export const getQualityScoresForAllOrigins = (cqiDataset) => {
  const scoresByOrigin = new Map();

  for (const entry of cqiDataset.entries ?? []) {
    const scores = scoresByOrigin.get(entry.originName) ?? [];
    scores.push(entry.avgQualityScore);
    scoresByOrigin.set(entry.originName, scores);
  }

  return [...scoresByOrigin.entries()]
    .map(([originName, scores]) => ({
      originName,
      avgQualityScore: scores.reduce((sum, score) => sum + score, 0) / scores.length,
    }))
    .sort((a, b) => b.avgQualityScore - a.avgQualityScore);
};
