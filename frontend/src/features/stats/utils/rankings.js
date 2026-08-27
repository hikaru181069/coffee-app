/**
 * 同率順位（1224形式の競技ランキング）を計算する。
 *
 * itemsはbackendのtopN（countの降順）で既に並んでいる前提。
 * 同じcountが続く間は同じ順位を割り当て、countが変わった時点で
 * 「その時点のインデックス+1」を新しい順位にする（例: count [4,4,4,3,2]
 * → 順位 [1,1,1,4,5]）。単純な`index + 1`だと、countが同じ項目が
 * 複数あっても1,2,3と別順位に見えてしまう不具合があった（Stats画面の
 * ランキングで実際に指摘を受けた: フレーバーのBerry/Floral/Citrusが
 * すべて4件なのに1位・2位・3位に分かれて見えていた）。
 *
 * DB/HTTP非依存の純粋関数（features/graph/utils/と同じ方針）。
 */
export const computeRanks = (items) => {
  const ranks = [];
  items.forEach((item, index) => {
    const tiesWithPrevious = index > 0 && item.count === items[index - 1].count;
    ranks.push(tiesWithPrevious ? ranks[index - 1] : index + 1);
  });
  return ranks;
};
