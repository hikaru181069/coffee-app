/**
 * 1枚の枠を細い区切り線で等分する「統計ストリップ」。
 *
 * StatCard.jsx（個別に枠+影が付き、隙間を空けて並ぶ）とは見た目が異なる、
 * ダッシュボード風レイアウト専用のKPI表示。2026-09、RecordDetailPage.jsx・
 * EntityDetailPage.jsxのダッシュボード化で、Artifactモックの承認を得た
 * 見た目（区切り線で分割された1枚の帯）を再現するために新設した。
 *
 * 区切り線は各セルの背景色（bg-raised）とストリップ自体の背景色
 * （bg-surface-2、境界線と同じ色）の1px gapで表現する（セルごとに
 * border-rightを引くより、端のセルだけ扱いを変えずに済む）。
 */
export function KpiStrip({ children }) {
  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-none border border-surface-2 bg-surface-2 shadow-elevated sm:grid-cols-4">
      {children}
    </div>
  );
}

export function KpiTile({ label, value, sub, icon: Icon, iconColorClass }) {
  return (
    <div className="flex flex-col gap-2 bg-raised p-4 sm:p-5">
      <span className="flex items-center gap-1.5 text-xs text-text-tertiary">
        {Icon && <Icon size={12} aria-hidden="true" className={iconColorClass} />}
        {label}
      </span>
      <span className="font-mono text-xl font-semibold text-text">{value}</span>
      {sub && <span className="truncate text-xs text-text-tertiary">{sub}</span>}
    </div>
  );
}
