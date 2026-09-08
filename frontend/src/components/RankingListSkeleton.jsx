/**
 * TopRankingList（アイコン+見出し+ランキング行）と同じ形のプレースホルダー。
 *
 * 2026-09、StatCardSkeleton.jsxと同じ理由でStats/Diagnosisの2箇所から
 * ここへ集約した（経緯はStatCardSkeleton.jsx参照）。
 */
function RankingListSkeleton() {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <div className="skeleton-block h-3.5 w-3.5 rounded-full" />
        <div className="skeleton-block h-3 w-16 rounded" />
      </div>
      <div className="flex flex-col gap-0.5">
        {Array.from({ length: 3 }, (_, row) => (
          <div key={row} className="flex items-center justify-between gap-2 px-2 py-1.5">
            <div className="skeleton-block h-3.5 w-32 rounded" />
            <div className="skeleton-block h-3.5 w-5 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default RankingListSkeleton;
