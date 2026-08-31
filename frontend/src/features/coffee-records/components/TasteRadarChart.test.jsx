/**
 * TasteRadarChart.jsxのテスト。
 *
 * SVGは装飾用（aria-hidden）で、実質的な内容は下の数値一覧
 * （dl、TasteRadarValues）が担う（コンポーネント本体のコメント参照）。
 * レイアウト計算自体はtasteRadarLayout.test.jsが見るため、ここでは
 * 「記録の値がdlへ正しく反映されるか」だけを見る。
 */
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

import TasteRadarChart from "./TasteRadarChart";

describe("TasteRadarChart", () => {
  test("評価済みの軸は「n / 5」、未評価の軸は「未評価」と表示する", () => {
    const record = {
      tasteSweetness: 4,
      tasteBitterness: null,
      tasteAcidity: 3,
      tasteBody: null,
      tasteAroma: 5,
      tasteAftertaste: null,
    };

    render(<TasteRadarChart record={record} />);

    expect(screen.getByText("4 / 5")).toBeInTheDocument();
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
    expect(screen.getByText("5 / 5")).toBeInTheDocument();
    expect(screen.getAllByText("未評価")).toHaveLength(3);
  });

  test("記録に軸のフィールドが無い（undefined）場合も未評価扱いになる", () => {
    render(<TasteRadarChart record={{}} />);

    expect(screen.getAllByText("未評価")).toHaveLength(6);
  });
});
