import { useTranslation } from "react-i18next";

/**
 * 世界地図の凡例。「色だけで状態を表現しない」（docs/design.md UI Rules）
 * ため、色に加えてラベルの文言でも状態を区別する（GraphLegend.jsxと
 * 同じ考え方）。
 *
 * 2026-08、訪問済みの塗り色を単一色から産地ごとのアクセントカラー
 * （originAccent.js）へ変更したため、「訪れた産地」の見本は単色の
 * スウォッチではなく、実際に色が産地ごとに異なることが伝わるよう
 * 3色の小さな点を並べたものにした。
 *
 * 2026-09、「品質スコアで色分け」モード（Origin Quality機能）は誤解を
 * 招く懸念から削除したため、凡例も訪問状況の1種類のみに戻している。
 */
function WorldMapLegend() {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-4 text-xs text-text-tertiary">
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="flex items-center -space-x-1">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-sky" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent-pink" />
          <span className="h-2.5 w-2.5 rounded-full bg-accent-yellow" />
        </span>
        {t("map.legendVisited")}
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-surface-2" />
        {t("map.legendUnvisited")}
      </span>
    </div>
  );
}

export default WorldMapLegend;
