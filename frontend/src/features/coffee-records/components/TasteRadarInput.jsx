import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  buildTasteRadarLayout,
  RADAR_CENTER,
  RADAR_MAX_RADIUS,
  radarAxisUnitVector,
} from "../utils/tasteRadarLayout";

const clamp05 = (value) => Math.max(0, Math.min(5, value));

/**
 * 味覚6軸（甘み・苦み・酸味・コク・香り・後味）を、六角形レーダーの
 * 頂点を直接ドラッグして入力する（2026-09、記録体験の再設計・
 * 「コーヒーキャンバス」）。以前のTasteSliderInput（縦に並んだ6本の
 * スライダー）を置き換える。数値入力ではなく「味の形を描く」操作にする。
 *
 * ジオメトリ（六角形の頂点座標）は記録詳細ページの表示用レーダー
 * TasteRadarChart.jsxと同じ`tasteRadarLayout.js`を共有する。表示と入力で
 * 同じ計算を使うことで、キャンバスで描いた形が詳細ページでも同じ形で
 * 再現される。
 *
 * ドラッグはPointer Events（マウス/タッチ/ペン共通）。頂点を中心からの
 * 軸方向へ射影し、0〜5の整数へ丸める。0は「未評価」（RatingInputと同じ
 * 表現）。
 *
 * 頂点はSVG上の<circle>だが、role="slider" + tabIndex + 矢印キー/Home/End
 * のキーボード操作を自前で実装している。RatingInputのようなネイティブ
 * radiogroupで表現できる「離散的な選択肢」ではなく「軸ごとに連続的な
 * ドラッグで値を作る」操作のため、ネイティブ要素だけでは支援技術に
 * 伝えられない。
 */
function TasteRadarInput({ axes, onChangeAxis, disabled = false, accentHex, className = "max-w-xs" }) {
  const { t } = useTranslation();
  const svgRef = useRef(null);
  const [draggingIndex, setDraggingIndex] = useState(null);
  const layout = buildTasteRadarLayout(axes);

  const valueFromClientPoint = (index, clientX, clientY) => {
    const svg = svgRef.current;
    if (!svg) return 0;

    const rect = svg.getBoundingClientRect();
    const point = {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100,
    };

    const unit = radarAxisUnitVector(index);
    const rel = { x: point.x - RADAR_CENTER.x, y: point.y - RADAR_CENTER.y };
    const projected = rel.x * unit.x + rel.y * unit.y;
    const clamped = Math.max(0, Math.min(RADAR_MAX_RADIUS, projected));

    return Math.round((clamped / RADAR_MAX_RADIUS) * 5);
  };

  const commitValue = (field, value) => {
    onChangeAxis(field, value === 0 ? "" : String(value));
  };

  const handlePointerDown = (index, field) => (event) => {
    if (disabled) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingIndex(index);
    commitValue(field, valueFromClientPoint(index, event.clientX, event.clientY));
  };

  const handlePointerMove = (index, field) => (event) => {
    if (draggingIndex !== index) return;
    commitValue(field, valueFromClientPoint(index, event.clientX, event.clientY));
  };

  const endDrag = (index) => () => {
    setDraggingIndex((current) => (current === index ? null : current));
  };

  const handleKeyDown = (field, currentValue) => (event) => {
    if (disabled) return;

    const current = currentValue ?? 0;
    let next = null;
    if (event.key === "ArrowUp" || event.key === "ArrowRight") next = clamp05(current + 1);
    else if (event.key === "ArrowDown" || event.key === "ArrowLeft") next = clamp05(current - 1);
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = 5;

    if (next === null) return;
    event.preventDefault();
    commitValue(field, next);
  };

  return (
    <div className={`relative mx-auto aspect-square w-full ${className}`}>
      <svg
        ref={svgRef}
        viewBox="0 0 100 100"
        className="absolute inset-0 h-full w-full select-none"
        style={{ touchAction: "none" }}
      >
        {layout.ringPolygons.map((points, index) => (
          <polygon key={index} points={points} fill="none" className="stroke-surface-2" strokeWidth="0.4" />
        ))}

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

        <polygon
          points={layout.valuePolygon}
          fill={accentHex ? `${accentHex}4d` : "var(--color-text-tertiary)"}
          fillOpacity={accentHex ? 1 : 0.18}
          stroke={accentHex ?? "var(--color-text-tertiary)"}
          strokeWidth="1.2"
          strokeLinejoin="round"
          style={{ transition: "fill 500ms var(--ease-decel), stroke 500ms var(--ease-decel)" }}
        />

        {layout.valuePoints.map((point, index) => {
          const axis = axes[index];
          const valueLabel = axis.value === null ? t("common.unrated") : `${axis.value} / 5`;
          const isDragging = draggingIndex === index;

          return (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r={isDragging ? 3 : 2.2}
              fill={accentHex ?? "var(--color-text)"}
              stroke="var(--color-base)"
              strokeWidth="0.8"
              tabIndex={disabled ? -1 : 0}
              role="slider"
              aria-label={t(axis.labelKey)}
              aria-valuemin={0}
              aria-valuemax={5}
              aria-valuenow={axis.value ?? 0}
              aria-valuetext={valueLabel}
              onPointerDown={handlePointerDown(index, axis.field)}
              onPointerMove={handlePointerMove(index, axis.field)}
              onPointerUp={endDrag(index)}
              onPointerCancel={endDrag(index)}
              onKeyDown={handleKeyDown(axis.field, axis.value)}
              className="cursor-grab outline-none transition-[r] duration-150 focus-visible:stroke-primary focus-visible:stroke-2 active:cursor-grabbing"
            />
          );
        })}
      </svg>

      {/* SVG内のtextよりフォント・折り返しの制御がしやすいため、
          ラベルはDOM側に置く（TasteRadarChart.jsxと同じ構成） */}
      {layout.labelPoints.map((point, index) => (
        <span
          key={index}
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[11px] font-medium text-text-secondary"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
        >
          {t(point.labelKey)}
        </span>
      ))}
    </div>
  );
}

export default TasteRadarInput;
