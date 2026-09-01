/**
 * RecordConnectionsDiagram.jsxのテスト。
 *
 * レイアウト計算自体はutils/recordConnectionsLayout.test.jsで検証済み。
 * ここでは「記録の各属性がエンティティ詳細ページへのリンクとして
 * 描画されるか」「フレーバーの超過件数の案内が出るか」を確認する。
 */
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import RecordConnectionsDiagram from "./RecordConnectionsDiagram";
import { MAX_FLAVOR_NODES } from "../utils/recordConnectionsLayout";

const flavor = (n) => ({ id: `flavor-${n}`, name: `Flavor${n}` });

function renderDiagram(record) {
  return render(
    <MemoryRouter>
      <RecordConnectionsDiagram record={record} />
    </MemoryRouter>,
  );
}

describe("RecordConnectionsDiagram", () => {
  test("中心に記録タイトルを表示する", () => {
    renderDiagram({ title: "Ethiopia Guji Natural", origin: null, process: null, roastLevel: null, flavors: [] });

    expect(screen.getByText("Ethiopia Guji Natural")).toBeInTheDocument();
  });

  test("origin/process/roastLevelはそれぞれエンティティ詳細ページへのリンクになる", () => {
    renderDiagram({
      title: "記録",
      origin: { id: "origin-1", name: "Ethiopia" },
      process: { id: "process-1", name: "Washed" },
      roastLevel: { id: "roast-1", name: "Medium" },
      flavors: [],
    });

    expect(screen.getByRole("link", { name: /Ethiopia/ })).toHaveAttribute(
      "href",
      "/entities/origin%3Aorigin-1",
    );
    expect(screen.getByRole("link", { name: /Washed/ })).toHaveAttribute(
      "href",
      "/entities/process%3Aprocess-1",
    );
    expect(screen.getByRole("link", { name: /Medium/ })).toHaveAttribute(
      "href",
      "/entities/roastLevel%3Aroast-1",
    );
  });

  test("設定されていない属性はノードとして描画しない", () => {
    renderDiagram({ title: "記録", origin: null, process: null, roastLevel: null, flavors: [] });

    // 中心の記録タイトル以外にリンクが無いこと
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  test(`フレーバーが${MAX_FLAVOR_NODES}件を超えると超過件数の案内が出る`, () => {
    const flavors = Array.from({ length: MAX_FLAVOR_NODES + 2 }, (_, i) => flavor(i));
    renderDiagram({ title: "記録", origin: null, process: null, roastLevel: null, flavors });

    expect(screen.getByText("ほかに2件のフレーバー")).toBeInTheDocument();
  });

  test(`フレーバーが${MAX_FLAVOR_NODES}件以下なら超過案内は出ない`, () => {
    renderDiagram({
      title: "記録",
      origin: null,
      process: null,
      roastLevel: null,
      flavors: [flavor(1), flavor(2)],
    });

    expect(screen.queryByText(/ほかに\d+件/)).not.toBeInTheDocument();
  });
});
