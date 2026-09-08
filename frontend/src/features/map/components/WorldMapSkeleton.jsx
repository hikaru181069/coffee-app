import { useTranslation } from "react-i18next";
import { cardClass } from "../../coffee-records/components/formStyles";
import StatCardSkeleton from "../../../components/StatCardSkeleton";

/**
 * 読み込み中のWorld Mapページ。実際の構成
 * （訪れた産地数のStatCard→地図+凡例→「Visited origins」の
 * cardClassセクション）と同じ形の骨格を出す。
 *
 * 2026-08、以前はGraph画面の`GraphLoadingState`（ノード・エッジを模した
 * 円+線の骨格）をそのまま流用していたが、World Mapページの実際の構成
 * （地図・サマリー・産地一覧）と見た目が全く違っていたため、専用の
 * 骨格として作り直した（ローディングスケルトンのレビューで指摘）。
 * 地図本体は`WorldMap.jsx`のviewBox比率（960:500）に合わせた角丸の
 * 矩形のみとし、国境の形までは再現しない。
 */
function WorldMapSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")} className="flex flex-col gap-6">
      <div className={cardClass}>
        <div className="flex flex-wrap gap-3">
          <StatCardSkeleton />
        </div>
      </div>

      <div className={cardClass}>
        <div className="skeleton-block aspect-[960/500] w-full rounded-xl" />
        <div className="mt-4 flex items-center gap-4">
          <div className="skeleton-block h-3 w-40 rounded" />
          <div className="skeleton-block h-3 w-28 rounded" />
        </div>
      </div>

      <section className={cardClass}>
        <div className="skeleton-block h-4 w-32 rounded" />
        <div className="mt-4 flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="skeleton-block h-8 w-24 rounded-full" />
          ))}
        </div>
      </section>
    </div>
  );
}

export default WorldMapSkeleton;
