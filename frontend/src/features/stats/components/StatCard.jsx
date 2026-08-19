/** ラベル+数値だけの最小単位のカード。OverviewStats/CollectionStatsで共有する */
function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-surface-2 bg-raised p-4 shadow-elevated">
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-text">{value}</p>
    </div>
  );
}

export default StatCard;
