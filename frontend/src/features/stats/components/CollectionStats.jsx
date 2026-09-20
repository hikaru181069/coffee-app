import { useTranslation } from "react-i18next";
import { KpiTile } from "../../../components/KpiStrip";
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
 *
 * 2026-09、StatsPage.jsxのダッシュボード風の作り直しで、OverviewStats.jsx
 * と1本のKPIストリップ（`KpiStrip`/`KpiTile`）へ統合するため、個別に
 * 枠+影の付く`StatCard`から、区切り線で分割される`KpiTile`（裸の
 * フラグメント）へ変更した。呼び出し側がStatsPage.jsxの1箇所のみのため、
 * `OverviewStats.jsx`のような`variant`分岐は不要と判断した。
 */
function CollectionStats({ collection }) {
  const { t } = useTranslation();
  const origin = getNodeVisual("origin");
  const variety = getNodeVisual("variety");
  const process = getNodeVisual("process");
  const farm = getNodeVisual("farm");
  const cafe = getNodeVisual("cafe");
  const flavor = getNodeVisual("flavor");

  return [
    {
      label: t("stats.collection.originCount"),
      value: collection.originCount,
      icon: origin.icon,
      iconColorClass: origin.colorClass,
    },
    {
      label: t("stats.collection.varietyCount"),
      value: collection.varietyCount,
      icon: variety.icon,
      iconColorClass: variety.colorClass,
    },
    {
      label: t("stats.collection.processCount"),
      value: collection.processCount,
      icon: process.icon,
      iconColorClass: process.colorClass,
    },
    {
      label: t("stats.collection.farmCount"),
      value: collection.farmCount,
      icon: farm.icon,
      iconColorClass: farm.colorClass,
    },
    {
      label: t("stats.collection.cafeCount"),
      value: collection.cafeCount,
      icon: cafe.icon,
      iconColorClass: cafe.colorClass,
    },
    {
      label: t("stats.collection.flavorCount"),
      value: collection.flavorCount,
      icon: flavor.icon,
      iconColorClass: flavor.colorClass,
    },
  ].map((tile) => (
    <KpiTile key={tile.label} label={tile.label} value={tile.value} icon={tile.icon} iconColorClass={tile.iconColorClass} />
  ));
}

export default CollectionStats;
