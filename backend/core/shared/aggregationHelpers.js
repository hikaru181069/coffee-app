/**
 * core/*Builder.js（DB・HTTPに依存しない純粋関数群）で共通して使う、
 * 小さな集計ヘルパー。
 *
 * 2026-08、設計レビューで、同じ実装がinsightBuilder.js・statsBuilder.js・
 * entityDetailBuilder.js・diagnosisBuilder.js・discoverBuilder.jsに
 * 個別に散らばっていることが分かったため、ここへ集約した。
 * 「builderごとに独立した純粋関数」という既存方針（各builderがDB/HTTPは
 * もちろん、互いにも依存しない）は変えず、あくまで同一ロジックの
 * コピーを1か所にまとめるだけに留めている。
 */

/** 数値配列の平均。空配列はnull（0で割ることを避ける） */
export const average = (numbers) =>
  numbers.length === 0 ? null : numbers.reduce((sum, n) => sum + n, 0) / numbers.length;

/** 小数第2位を四捨五入して第1位までにする。nullはそのままnull */
export const roundTo1 = (value) => (value == null ? null : Math.round(value * 10) / 10);

/**
 * 候補（count を持つオブジェクト）の中から最も多いものを1つ選ぶ。
 * 最多のものがminCount未満、または同率首位のときは1つに絞れないため
 * 断定せずnullを返す（docs/product-principles.md「偶然の一致を断定
 * しない」）。
 *
 * 「対象データが十分に集まっているか」を候補プール全体の件数（最多の
 * ものの件数ではなく）で判定したい場合（diagnosisBuilder.jsの
 * summarizeDominantRef等）は、minCountに頼らず呼び出し側で別途
 * チェックする。
 *
 * @param {Array<{count: number}>} candidates
 * @param {number} [minCount=0]
 */
export const pickTop = (candidates, minCount = 0) => {
  const sorted = [...candidates].sort((a, b) => b.count - a.count);
  const top = sorted[0];
  if (!top || top.count < minCount) return null;
  if (sorted[1]?.count === top.count) return null;
  return top;
};
