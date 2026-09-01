import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { geoNaturalEarth1, geoPath, geoGraticule10 } from "d3-geo";
import { feature } from "topojson-client";
import worldTopology from "world-atlas/countries-110m.json";
import { getOriginFillClass } from "../../coffee-records/utils/originAccent";
import { getQualityTierFillClass } from "../utils/qualityColor";

// d3-geoの他のグラフ・図（TasteRadarChart.jsx・RecordConnectionsDiagram.jsx）
// と違い、国境の形状データは自作が現実的ではないため、world-atlas
// （Natural Earthベースのtopojson）を採用した唯一の例外（2026-08、
// react-simple-mapsを検討したがReact 19未対応で導入できず、Reactに
// 依存しないd3-geo + topojson-clientの組み合わせへ変更した）。
// 投影法はNatural Earth（geoNaturalEarth1、d3-geo本体に標準搭載で
// 追加パッケージ不要）を使う。世界全体を歪みが少なく見せる、この種の
// 用途で定番の投影法。
//
// 2026-08、設計レビューでバンドルサイズが指摘され、50m解像度
// （756KB）から110m解像度（108KB）へ切り替えた。国単位のハイライト
// 表示にしか使っておらず、海岸線の精密さは不要なため（docs/features.md
// 「World Map」参照）。国自体の有無・ISO数値IDは解像度に関わらず同じ。

const WIDTH = 960;
const HEIGHT = 500;

const countriesGeoJson = feature(worldTopology, worldTopology.objects.countries);
const graticuleGeoJson = geoGraticule10();

/**
 * 訪れた産地を世界地図上でハイライトする。
 *
 * 国の形状（path）はvisitedByNumericIdと突き合わせるだけの表示専用。
 * 訪問済みの国だけクリック・キーボード操作可能にし、そのエンティティ
 * 詳細ページ（/entities/origin:xxx）へ遷移する（知識グラフをナビゲーション
 * にする既存方針。RecordCard・NodeDetailPanel等と同じ）。
 *
 * 塗り色は全産地で単一色にせず、Records・HomeのカードでもうRecordCard.jsx・
 * HomeRecordCard.jsxが使っている産地ごとのアクセントカラー
 * （originAccent.jsのgetOriginFillClass、産地名からのハッシュで決まる）を
 * そのまま使う。同じ産地なら常にカードと地図で同じ色になる（2026-08、
 * 「国のラベルカラーを地図にも適用したい」という要望を受けて対応）。
 * ホバー時のフィードバックは、産地ごとに色が違うため単純な透明度変更が
 * 使えず（Tailwindの動的クラス生成の制約でopacity付きバリアントを7色分
 * 用意する必要が生じる）、色に依存しないstrokeWidthの変化だけにしている。
 *
 * ホバー時は、TasteRadarChart.jsxのラベルと同じ「投影後の座標を%へ変換して
 * absoluteで重ねる」手法でツールチップを出す（SVG内へ直接文字を置くより
 * フォント・折り返しの制御がしやすいため）。
 *
 * 2026-08、産地フォーカス機能群の続きとして「品質スコアで色分け」モードを
 * 追加した（docs/features.md「Origin Quality」参照）。colorModeが
 * "quality"のときは、訪問済みかどうかに関わらずCQIデータのある産地
 * （qualityByNumericId）すべてに品質スコアの濃淡（qualityColor.js、
 * 産地アクセントカラーとは別の単色グラデーション）で色を付ける。ただし
 * クリック・キーボード操作できるのは引き続き訪問済みの産地だけ
 * （エンティティ詳細ページへ遷移できるのは自分の記録がある産地のみの
 * ため）。塗り色とクリック可否の判定基準が分かれる点に注意。
 */
function WorldMap({ visitedByNumericId, colorMode = "visited", qualityByNumericId }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // world-atlasのtopojsonは、一部の国（海を挟んだ領土を持つ国等）が
  // 同じidで複数のfeatureに分かれている（実機で確認: オーストラリアの
  // idが2件重複していた）。country.idはReactのkeyやhover状態の識別には
  // 使わず、配列のindexを使うことで重複idによる「keyの重複警告」や
  // 「間違ったfeatureのツールチップが出る」不具合を避ける。visitedとの
  // 突き合わせ（産地かどうかの判定）だけはcountry.id（ISO数値コード）を使う
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const path = useMemo(() => {
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], countriesGeoJson);
    return geoPath(projection);
  }, []);

  const hoveredCountry = hoveredIndex !== null ? countriesGeoJson.features[hoveredIndex] : null;
  const hoveredVisited = hoveredCountry ? visitedByNumericId.get(hoveredCountry.id) : null;
  const hoveredQuality =
    hoveredCountry && colorMode === "quality" ? qualityByNumericId?.get(hoveredCountry.id) : null;
  const tooltipPoint = hoveredCountry ? path.centroid(hoveredCountry) : null;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="h-auto w-full"
        role="img"
        aria-label={t("map.ariaLabel")}
      >
        <path
          d={path(graticuleGeoJson)}
          className="fill-none stroke-surface-2"
          strokeWidth={0.5}
        />
        {countriesGeoJson.features.map((country, index) => {
          const visited = visitedByNumericId.get(country.id);
          const quality = colorMode === "quality" ? qualityByNumericId?.get(country.id) : null;
          const isHovered = hoveredIndex === index;

          // 塗り色: colorModeが"quality"なら品質スコアの濃淡、"visited"なら
          // 産地ごとのアクセントカラー。どちらも対象データが無ければ中立グレー
          const fillClass =
            colorMode === "quality"
              ? quality
                ? getQualityTierFillClass(quality.avgQualityScore)
                : "fill-surface-2"
              : visited
                ? getOriginFillClass(visited.label)
                : "fill-surface-2";

          // クリック・キーボード操作できるかは塗り色モードに関わらず常に
          // 「訪問済み（自分の記録がある）」で決まる。エンティティ詳細
          // ページへ遷移できるのは自分の記録がある産地のみのため
          if (!visited) {
            return (
              <path
                key={index}
                d={path(country)}
                className={`${fillClass} stroke-line/60`}
                strokeWidth={0.5}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex((current) => (current === index ? null : current))}
              />
            );
          }

          return (
            <path
              key={index}
              d={path(country)}
              role="link"
              tabIndex={0}
              aria-label={t("map.countryAriaLabel", { name: visited.label })}
              className={`cursor-pointer stroke-line/60 transition-colors duration-150 focus:outline-none ${fillClass}`}
              strokeWidth={isHovered ? 1 : 0.5}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex((current) => (current === index ? null : current))}
              onFocus={() => setHoveredIndex(index)}
              onBlur={() => setHoveredIndex((current) => (current === index ? null : current))}
              onClick={() => navigate(`/entities/${encodeURIComponent(visited.id)}`)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" && event.key !== " ") return;
                event.preventDefault();
                navigate(`/entities/${encodeURIComponent(visited.id)}`);
              }}
            />
          );
        })}
      </svg>

      {hoveredCountry && tooltipPoint && (
        <div
          role="tooltip"
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border border-surface-2 bg-raised px-2 py-1 text-xs text-text shadow-lg"
          style={{
            left: `${(tooltipPoint[0] / WIDTH) * 100}%`,
            top: `${(tooltipPoint[1] / HEIGHT) * 100 - 2}%`,
          }}
        >
          {hoveredQuality ? (
            <>
              <span className="font-medium">{hoveredQuality.originName}</span>
              <span className="ml-1.5 font-mono text-text-tertiary">
                {t("map.qualityScore", { score: hoveredQuality.avgQualityScore.toFixed(1) })}
              </span>
            </>
          ) : hoveredVisited ? (
            <>
              <span className="font-medium">{hoveredVisited.label}</span>
              <span className="ml-1.5 font-mono text-text-tertiary">
                {t("map.recordCount", { count: hoveredVisited.recordCount })}
              </span>
            </>
          ) : (
            <span className="text-text-tertiary">{hoveredCountry.properties.name}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default WorldMap;
