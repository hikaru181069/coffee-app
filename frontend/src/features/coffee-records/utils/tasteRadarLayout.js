/**
 * 味覚グラフ（TasteRadarChart）用の6角形レーダー配置を計算する
 * 純粋関数（DOM非依存）。
 *
 * frontend/src/features/graph/utils/recordConnectionsLayout.js と同じ
 * 設計思想: 力学シミュレーションは使わず、常に決まった小さな構造
 * （6軸固定）なので三角関数で位置を直接計算する。座標は0〜100の
 * パーセンテージ空間（SVGのviewBoxでそのまま使える）。
 */

const CENTER = { x: 50, y: 50 };
const MAX_RADIUS = 40;
const AXIS_COUNT = 6;
const RING_COUNT = 5; // 1〜5の評価値に対応する同心六角形の数
const ANGLE_STEP = (2 * Math.PI) / AXIS_COUNT;

// 12時の方向から時計回りに配置する
const angleForIndex = (index) => index * ANGLE_STEP - Math.PI / 2;

const pointOnAxis = (index, radiusFraction) => {
  const angle = angleForIndex(index);
  const radius = MAX_RADIUS * radiusFraction;
  return {
    x: CENTER.x + radius * Math.cos(angle),
    y: CENTER.y + radius * Math.sin(angle),
  };
};

/**
 * 表示用（TasteRadarChart）・入力用（TasteRadarInput）の両方が同じ
 * 六角形ジオメトリを使うための共有定数・関数。値はこのファイル内で
 * 完結させ、呼び出し側が独自に三角関数を計算しないようにする
 * （2026-09、記録体験の再設計・キャンバス化でTasteRadarInputを追加した
 * 際にexportへ追加した）。
 */
export const RADAR_CENTER = CENTER;
export const RADAR_MAX_RADIUS = MAX_RADIUS;
export const RADAR_AXIS_COUNT = AXIS_COUNT;

/** 軸インデックスから、中心を原点とした単位ベクトル（cos, sin）を返す */
export const radarAxisUnitVector = (index) => {
  const angle = angleForIndex(index);
  return { x: Math.cos(angle), y: Math.sin(angle) };
};

/** 軸インデックスと半径の割合（0〜1が評価1〜5、0は中心=未評価）から座標を返す */
export const radarPointOnAxis = pointOnAxis;

const polygonPoints = (points) => points.map((point) => `${point.x},${point.y}`).join(" ");

/**
 * @param {Array<{ field: string, labelKey: string, value: number | null }>} axes
 *   TASTE_AXES に評価値（1〜5、未評価はnull）を合わせた配列
 * @returns {{
 *   center: {x:number, y:number},
 *   ringPolygons: string[],
 *   axisLines: Array<{x1:number,y1:number,x2:number,y2:number}>,
 *   labelPoints: Array<{x:number,y:number,labelKey:string}>,
 *   valuePolygon: string,
 *   valuePoints: Array<{x:number,y:number,labelKey:string,value:number|null}>,
 * }}
 */
export function buildTasteRadarLayout(axes) {
  // 目盛り: 半径 1/5, 2/5, ... 5/5 の同心六角形
  const ringPolygons = Array.from({ length: RING_COUNT }, (_, ringIndex) => {
    const radiusFraction = (ringIndex + 1) / RING_COUNT;
    const points = axes.map((_, axisIndex) => pointOnAxis(axisIndex, radiusFraction));
    return polygonPoints(points);
  });

  const axisLines = axes.map((_, index) => {
    const outer = pointOnAxis(index, 1);
    return { x1: CENTER.x, y1: CENTER.y, x2: outer.x, y2: outer.y };
  });

  const labelPoints = axes.map((axis, index) => {
    // ラベルは目盛りの外側（半径1.18倍）に置く
    const point = pointOnAxis(index, 1.18);
    return { ...point, labelKey: axis.labelKey };
  });

  // 未評価（null）の軸は中心（0扱い）にプロットする。
  // RatingInputの「0 = 未評価」という表現と一貫させるため
  const valuePoints = axes.map((axis, index) => {
    const radiusFraction = axis.value === null || axis.value === undefined ? 0 : axis.value / 5;
    const point = pointOnAxis(index, radiusFraction);
    return { ...point, labelKey: axis.labelKey, value: axis.value ?? null };
  });

  return {
    center: CENTER,
    ringPolygons,
    axisLines,
    labelPoints,
    valuePolygon: polygonPoints(valuePoints),
    valuePoints,
  };
}
