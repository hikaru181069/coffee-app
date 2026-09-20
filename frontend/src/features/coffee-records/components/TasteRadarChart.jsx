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
 *
 * 2026-09、RecordDetailPage.jsxのダッシュボード風レイアウトのため、
 * `layout="row"`（図と数値一覧を横並びにする）を追加した。既定は従来
 * 通り`layout="stacked"`（図の下に数値一覧）で、ArchetypeCard.jsx
 * （Diagnosisページ）は未指定のままなので見た目は変わらない。
 */
function TasteRadarChart({ record, layout = "stacked" }) {
  const { t } = useTranslation();
  const isRow = layout === "row";

  const axes = TASTE_AXES.map((axis) => ({
    ...axis,
    value: record[axis.field] ?? null,
  }));
  const chartLayout = buildTasteRadarLayout(axes);

  return (
    <div className={isRow ? "flex items-center gap-5" : undefined}>
      <div
        className={`relative aspect-square w-full ${
          isRow ? "max-w-[11rem] flex-shrink-0" : "mx-auto max-w-sm"
        }`}
      >
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {/* 目盛り（1〜5の同心六角形） */}
          {chartLayout.ringPolygons.map((points, index) => (
            <polygon
              key={index}
              points={points}
              fill="none"
              className="stroke-surface-2"
              strokeWidth="0.4"
            />
          ))}

          {/* 軸線 */}
          {chartLayout.axisLines.map((line, index) => (
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
          <polygon points={chartLayout.valuePolygon} className="fill-warn/20 stroke-warn" strokeWidth="1" />
          {chartLayout.valuePoints.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r="1.4" className="fill-warn" />
          ))}
        </svg>

        {/* 軸ラベル（DOM側。SVG内のtextよりフォント・折り返しの制御がしやすい） */}
        {chartLayout.labelPoints.map((point, index) => (
          <span
            key={index}
            className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] text-text-secondary"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
          >
            {t(point.labelKey)}
          </span>
        ))}
      </div>

      <TasteRadarValues axes={axes} t={t} layout={layout} />
    </div>
  );
}

/**
 * 6軸の数値一覧。上のSVGは形だけで評価値を表現しており（かつ装飾用に
 * aria-hidden）、スクリーンリーダーには何も伝わらない。晴眼者にとっても
 * グラフの形から正確な値を読み取るのは難しい。この一覧が実質的な内容を
 * 担う（docs/design.md「色だけで状態を表現しない」と同じ考え方で、
 * ここでは形だけで表現しないようにする）。RatingInput.jsxの
 * 「未評価」/「n / 5」という既存の表記をそのまま流用する。
 */
function TasteRadarValues({ axes, t, layout }) {
  if (layout === "row") {
    return (
      <dl className="flex min-w-0 flex-1 flex-col gap-2 text-sm">
        {axes.map((axis) => (
          <div
            key={axis.field}
            className="flex items-center justify-between gap-2 border-b border-surface-1 pb-2 last:border-none last:pb-0"
          >
            <dt className="text-text-secondary">{t(axis.labelKey)}</dt>
            <dd className="font-mono font-semibold text-text">
              {axis.value === null ? t("common.unrated") : `${axis.value} / 5`}
            </dd>
          </div>
        ))}
      </dl>
    );
  }

  return (
    <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-base sm:grid-cols-3">
      {axes.map((axis) => (
        <div key={axis.field} className="flex items-center justify-between gap-2">
          <dt className="text-text-secondary">{t(axis.labelKey)}</dt>
          <dd className="font-mono text-text">
            {axis.value === null ? t("common.unrated") : `${axis.value} / 5`}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export default TasteRadarChart;
