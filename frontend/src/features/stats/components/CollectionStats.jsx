import StatCard from "./StatCard";

/**
 * これまでに試した産地・品種・精製方法・農園・カフェ・フレーバーの
 * 「種類数」。記録の頻度（OverviewStats）とは別の問い（何を試したか）
 * なので、独立したセクションにしている。
 */
function CollectionStats({ collection, t }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <StatCard label={t("stats.collection.originCount")} value={collection.originCount} />
      <StatCard label={t("stats.collection.varietyCount")} value={collection.varietyCount} />
      <StatCard label={t("stats.collection.processCount")} value={collection.processCount} />
      <StatCard label={t("stats.collection.farmCount")} value={collection.farmCount} />
      <StatCard label={t("stats.collection.cafeCount")} value={collection.cafeCount} />
      <StatCard label={t("stats.collection.flavorCount")} value={collection.flavorCount} />
    </div>
  );
}

export default CollectionStats;
