/**
 * StatCard（アイコンバッジ+ラベル/値）と同じ形のプレースホルダー。
 * cardClass内にネストして使う想定のため影は持たない（StatCard.jsxの
 * flat propと同じ考え方）。
 *
 * 2026-09、Stats/Diagnosis/WorldMapの3つのスケルトンが同じJSXを
 * 独立にコピーしていたため、StatCard.jsx自身が辿った経緯
 * （複数機能で共有するUIとしてcomponents/へ昇格した）と同じ理由で
 * ここへ集約した。過去にスケルトンが実際のコンポーネントの見た目と
 * ずれてレイアウトが動く不具合が2度発生しており（StatsSkeleton.jsx・
 * DiagnosisSkeleton.jsxの旧コメント参照）、コピーが複数箇所にある限り
 * 同種の不具合が再発しうるための対応。
 */
function StatCardSkeleton() {
  return (
    <div className="min-w-44 rounded-2xl border border-surface-2 bg-raised p-4">
      <div className="flex items-center gap-3">
        <div className="skeleton-block h-9 w-9 flex-shrink-0 rounded-full" />
        <div className="flex flex-col gap-1.5">
          <div className="skeleton-block h-3 w-14 rounded" />
          <div className="skeleton-block h-5 w-8 rounded" />
        </div>
      </div>
    </div>
  );
}

export default StatCardSkeleton;
