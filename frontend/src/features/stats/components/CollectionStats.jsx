import StatCard from "../../../components/StatCard";
import { getNodeVisual } from "../../graph/utils/nodeVisuals";

/**
 * これまでに試した産地・品種・精製方法・農園・カフェ・フレーバーの
 * 「種類数」。記録の頻度（OverviewStats）とは別の問い（何を試したか）
 * なので、独立したセクションにしている。
 *
 * 2026-08、カードの空白を埋めるアイコンバッジに、新しい色を増やさず
 * Graphの`nodeVisuals.js`をそのまま再利用した。ここの6種別（産地・品種・
 * 精製方法・農園・カフェ・フレーバー）はnodeVisuals.jsのorigin/variety/
 * process/farm/cafe/flavorとちょうど1対1で対応するため、RecordDetailPage.jsx
 * のCoffee Detailsタイルと同じ意匠になる。
 *
 * 2026-08、それでも広い画面では余白が目立つという指摘を受け、`grid`の
 * 均等割りから`flex flex-wrap`（中身に応じた幅、StatCard側のmin-wが
 * 下限）へ変更した。OverviewStats.jsxと同じ理由。
 */
function CollectionStats({ collection, t }) {
  const origin = getNodeVisual("origin");
  const variety = getNodeVisual("variety");
  const process = getNodeVisual("process");
  const farm = getNodeVisual("farm");
  const cafe = getNodeVisual("cafe");
  const flavor = getNodeVisual("flavor");

  return (
    <div className="flex flex-wrap gap-3">
      <StatCard
        label={t("stats.collection.originCount")}
        value={collection.originCount}
        icon={origin.icon}
        iconColorClass={origin.colorClass}
        iconBgClass={origin.bgTintClass}
      />
      <StatCard
        label={t("stats.collection.varietyCount")}
        value={collection.varietyCount}
        icon={variety.icon}
        iconColorClass={variety.colorClass}
        iconBgClass={variety.bgTintClass}
      />
      <StatCard
        label={t("stats.collection.processCount")}
        value={collection.processCount}
        icon={process.icon}
        iconColorClass={process.colorClass}
        iconBgClass={process.bgTintClass}
      />
      <StatCard
        label={t("stats.collection.farmCount")}
        value={collection.farmCount}
        icon={farm.icon}
        iconColorClass={farm.colorClass}
        iconBgClass={farm.bgTintClass}
      />
      <StatCard
        label={t("stats.collection.cafeCount")}
        value={collection.cafeCount}
        icon={cafe.icon}
        iconColorClass={cafe.colorClass}
        iconBgClass={cafe.bgTintClass}
      />
      <StatCard
        label={t("stats.collection.flavorCount")}
        value={collection.flavorCount}
        icon={flavor.icon}
        iconColorClass={flavor.colorClass}
        iconBgClass={flavor.bgTintClass}
      />
    </div>
  );
}

export default CollectionStats;
