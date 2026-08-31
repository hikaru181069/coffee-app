import { ALPHA2_TO_NUMERIC } from "./countryCodes";

/**
 * GET /api/origin-quality（CQIデータの全産地・countryCode付き）から、
 * world-atlasのtopojson id（ISO numeric）をキーにした品質スコアのMapを作る。
 *
 * visitedOrigins.jsのbuildVisitedByNumericIdと同じ考え方だが、こちらは
 * Graph APIのnodeメタデータではなく、origin-quality APIのレスポンスを
 * そのまま使う（産地の品質スコアはユーザーの記録に依存しない静的データの
 * ため、グラフ経由にする必要が無い）。
 *
 * countryCodeが無い産地や対応表に無い産地は除外する（地図上で色が
 * 付かないだけでエラーにはならない）。DB/HTTP非依存の純粋関数。
 *
 * @param {Array<{ originName: string, avgQualityScore: number, countryCode: string|null }>} origins
 * @returns {Map<string, { originName: string, avgQualityScore: number }>}
 */
export const buildQualityByNumericId = (origins) => {
  const map = new Map();

  for (const origin of origins) {
    const numericId = origin.countryCode ? ALPHA2_TO_NUMERIC[origin.countryCode] : null;
    if (!numericId) continue;

    map.set(numericId, {
      originName: origin.originName,
      avgQualityScore: origin.avgQualityScore,
    });
  }

  return map;
};
