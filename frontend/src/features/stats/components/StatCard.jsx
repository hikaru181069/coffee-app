/** ラベル+数値だけの最小単位のカード。OverviewStats/CollectionStatsで共有する */
function StatCard({ label, value }) {
  return (
    <div className="rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4">
      <p className="text-xs text-ctp-subtext0">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-ctp-text">{value}</p>
    </div>
  );
}

export default StatCard;
