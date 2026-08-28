import { Calendar, Star } from "lucide-react";
import StatCard from "../../../components/StatCard";
import { getNodeVisual } from "../../graph/utils/nodeVisuals";

/**
 * 記録のペースを示す見出し数字（総記録数・平均評価・記録を始めてからの日数）。
 *
 * 「試した種類数」（産地・品種・精製方法・農園・カフェ・フレーバー）は
 * 別の問い（何を試したか）なのでCollectionStatsへ分けている。
 *
 * 2026-08、カードの空白を埋めるアイコンバッジを追加した
 * （CollectionStats.jsxと同じ意図）。記録数はGraphのrecordノードと
 * 同じ色（accent-moss）、平均評価は他画面の評価表示と同じ`warn`色、
 * 記録を始めてからの日数はどのノード種別にも該当しないため中立色にした。
 *
 * 2026-08、アイコンバッジを足しても広い画面ではまだ余白が目立つという
 * 指摘を再度受けた。`grid`の均等割りをやめ`flex flex-wrap`にし、
 * StatCard側の`min-w`だけで幅の下限を決める（中身に応じた幅になり、
 * 均等grid特有の「短い内容でも幅いっぱいに引き伸ばされる」余白が
 * 生まれない）。RecordDetailPage.jsxのCoffee Detailsタイルと同じ考え方。
 */
function OverviewStats({ overview, daysSinceStart, t }) {
  const record = getNodeVisual("record");

  return (
    <div className="flex flex-wrap gap-3">
      <StatCard
        label={t("stats.overview.recordCount")}
        value={overview.recordCount}
        icon={record.icon}
        iconColorClass={record.colorClass}
        iconBgClass={record.bgTintClass}
        flat
      />
      <StatCard
        label={t("stats.overview.avgRating")}
        value={overview.avgRating ?? "—"}
        icon={Star}
        iconColorClass="text-warn"
        iconBgClass="bg-warn/15"
        flat
      />
      <StatCard
        label={t("stats.overview.daysSinceStart")}
        value={daysSinceStart != null ? t("stats.overview.daysCount", { count: daysSinceStart }) : "—"}
        icon={Calendar}
        iconColorClass="text-text-tertiary"
        iconBgClass="bg-surface-2"
        flat
      />
    </div>
  );
}

export default OverviewStats;
