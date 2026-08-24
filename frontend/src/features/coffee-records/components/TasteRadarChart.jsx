import { useTranslation } from "react-i18next";

import { TASTE_AXES } from "../utils/recordFormat";
import { buildTasteRadarLayout } from "../utils/tasteRadarLayout";

/**
 * 記録詳細ページの「味覚グラフ」セクション。甘み・苦み・酸味・コク・
 * 香り・後味の6軸を六角形のレーダーチャートで見せる。
 *
 * frontend/src/features/graph/components/RecordConnectionsDiagram.jsx と
 * 同じ構成（純粋関数のレイアウトユーティリティ + 装飾用SVG）。チャート
 * ライブラリは使わず、このアプリの他のグラフ・図と同じく自前のSVGで
 * 描画する。
 *
 * 色はRatingInput（既存の総合評価の星）と同じ`warn`トークンを使い、
 * 「評価」を表す見た目の言語を揃えている（`primary`はキーボード
 * フォーカスリング専用のため、通常表示の配色には使わない）。
 *
 * 未評価（null）の軸は中心（0扱い）にプロットする
 * （tasteRadarLayout.js参照）。
 */
function TasteRadarChart({ record }) {
  const { t } = useTranslation();

  const axes = TASTE_AXES.map((axis) => ({
    ...axis,
    value: record[axis.field] ?? null,
  }));
  const layout = buildTasteRadarLayout(axes);

  return (
    <div className="relative mx-auto aspect-square w-full max-w-xs">
      <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
        {/* 目盛り（1〜5の同心六角形） */}
        {layout.ringPolygons.map((points, index) => (
          <polygon
            key={index}
            points={points}
            fill="none"
            className="stroke-surface-2"
            strokeWidth="0.4"
          />
        ))}

        {/* 軸線 */}
        {layout.axisLines.map((line, index) => (
          <line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            className="stroke-surface-2"
            strokeWidth="0.4"
          />
        ))}

        {/* 評価値のポリゴン */}
        <polygon points={layout.valuePolygon} className="fill-warn/20 stroke-warn" strokeWidth="1" />
        {layout.valuePoints.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="1.4" className="fill-warn" />
        ))}
      </svg>

      {/* 軸ラベル（DOM側。SVG内のtextよりフォント・折り返しの制御がしやすい） */}
      {layout.labelPoints.map((point, index) => (
        <span
          key={index}
          className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] text-text-secondary"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          {t(point.labelKey)}
        </span>
      ))}
    </div>
  );
}

export default TasteRadarChart;
