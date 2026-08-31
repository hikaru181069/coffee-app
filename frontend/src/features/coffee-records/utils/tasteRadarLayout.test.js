import { describe, expect, test } from "vitest";
import { buildTasteRadarLayout } from "./tasteRadarLayout";

const AXES_ALL_UNRATED = [
  { field: "tasteSweetness", labelKey: "recordForm.tasteSweetness", value: null },
  { field: "tasteBitterness", labelKey: "recordForm.tasteBitterness", value: null },
  { field: "tasteAcidity", labelKey: "recordForm.tasteAcidity", value: null },
  { field: "tasteBody", labelKey: "recordForm.tasteBody", value: null },
  { field: "tasteAroma", labelKey: "recordForm.tasteAroma", value: null },
  { field: "tasteAftertaste", labelKey: "recordForm.tasteAftertaste", value: null },
];

describe("buildTasteRadarLayout", () => {
  test("6軸ぶんのring・axisLine・labelPoint・valuePointを返す", () => {
    const layout = buildTasteRadarLayout(AXES_ALL_UNRATED);

    expect(layout.ringPolygons).toHaveLength(5);
    expect(layout.axisLines).toHaveLength(6);
    expect(layout.labelPoints).toHaveLength(6);
    expect(layout.valuePoints).toHaveLength(6);
  });

  test("すべてのaxisLineは中心（50,50）から始まる", () => {
    const layout = buildTasteRadarLayout(AXES_ALL_UNRATED);

    for (const line of layout.axisLines) {
      expect(line.x1).toBe(50);
      expect(line.y1).toBe(50);
    }
  });

  test("未評価（null）の軸は中心にプロットされる", () => {
    const layout = buildTasteRadarLayout(AXES_ALL_UNRATED);

    for (const point of layout.valuePoints) {
      expect(point.x).toBeCloseTo(50);
      expect(point.y).toBeCloseTo(50);
      expect(point.value).toBeNull();
    }
  });

  test("評価値5（最大）の軸は、その軸線の外側の点（半径1.0）と同じ位置になる", () => {
    const axes = AXES_ALL_UNRATED.map((axis, index) =>
      index === 0 ? { ...axis, value: 5 } : axis,
    );
    const layout = buildTasteRadarLayout(axes);

    expect(layout.valuePoints[0].x).toBeCloseTo(layout.axisLines[0].x2);
    expect(layout.valuePoints[0].y).toBeCloseTo(layout.axisLines[0].y2);
    expect(layout.valuePoints[0].value).toBe(5);
  });

  test("評価値2.5（半径の半分）の軸は中心と外側の中間に位置する", () => {
    const axes = AXES_ALL_UNRATED.map((axis, index) =>
      index === 0 ? { ...axis, value: 2.5 } : axis,
    );
    const layout = buildTasteRadarLayout(axes);

    const midX = (50 + layout.axisLines[0].x2) / 2;
    const midY = (50 + layout.axisLines[0].y2) / 2;
    expect(layout.valuePoints[0].x).toBeCloseTo(midX);
    expect(layout.valuePoints[0].y).toBeCloseTo(midY);
  });

  test("labelPointsはlabelKeyをそのまま引き継ぐ", () => {
    const layout = buildTasteRadarLayout(AXES_ALL_UNRATED);

    expect(layout.labelPoints.map((p) => p.labelKey)).toEqual(
      AXES_ALL_UNRATED.map((axis) => axis.labelKey),
    );
  });
});
