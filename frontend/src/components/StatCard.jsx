/**
 * ラベル+数値だけの最小単位のカード。
 *
 * もともとStatsページ専用（features/stats/components/）に置いていたが、
 * 2026-08、EntityDetailPage.jsxでも同じ形のカード（記録数・平均評価・
 * 最後に飲んだ日）が必要になり、複数機能で共有するUIとして
 * components/へ移した（CLAUDE.md「components: 複数機能で共有するUI」）。
 *
 * 2026-08、「カードの空白が気になる」という指摘を受けた。ラベルと数値
 * だけでは内容量が少なく、カードがgridで幅いっぱいに広がるほど余白が
 * 目立っていた。まずRecordDetailPage.jsxのCoffee Detailsタイルと同じく
 * 色付きの円形アイコンバッジを添えたが、それでも広い画面では「大きな
 * 箱に小さな塊」の余白が残るという指摘を再度受けた。中央寄せ（余白の
 * 量自体は変わらず配置が変わるだけ）ではなく、RecordDetailPage.jsxの
 * Coffee Detailsで採用したのと同じ「grid の均等割りをやめ、flex-wrap で
 * 中身の分だけ幅を取る」方式に変更した（呼び出し側のOverviewStats.jsx・
 * CollectionStats.jsx・EntityDetailPage.jsxを参照）。min-wは、極端に
 * 狭い幅で折り返して不格好にならないための下限。
 */
function StatCard({ label, value, icon: Icon, iconColorClass, iconBgClass }) {
  return (
    <div className="min-w-44 rounded-2xl border border-surface-2 bg-raised p-4 shadow-elevated">
      <div className="flex items-center gap-3">
        {Icon && (
          <span
            className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${iconBgClass}`}
          >
            <Icon size={16} aria-hidden="true" className={iconColorClass} strokeWidth={1.75} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-xs text-text-tertiary">{label}</p>
          <p className="mt-0.5 font-mono text-xl font-semibold text-text">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default StatCard;
