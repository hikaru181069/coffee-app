/**
 * GraphCommunities.jsxのテスト。
 *
 * 2026-09、「ホバー中のノードが属するグループだけを表示する」設計に
 * 作り直した（該当エントリ参照）。純粋にprops（communities/hoveredNodeId）
 * だけで決まる表示のため、hookのモックは不要。
 */
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

import GraphCommunities from "./GraphCommunities";

const communities = [
  {
    id: 0,
    recordCount: 6,
    dominantAttributes: { origin: ["Ethiopia"], process: ["Washed"] },
    nodeIds: ["record:1", "origin:eth", "process:washed"],
  },
];

describe("GraphCommunities", () => {
  test("何もホバーしていなければ何も表示しない", () => {
    const { container } = render(<GraphCommunities communities={communities} hoveredNodeId={null} />);

    expect(container).toBeEmptyDOMElement();
  });

  test("属性ノードがどのグループにも属さなければ何も表示しない", () => {
    const { container } = render(
      <GraphCommunities communities={communities} hoveredNodeId="origin:unrelated" hoveredNodeType="origin" />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  test("record型ノードがどのグループにも属さなければ「まだ大きなグループの一部になっていません」と表示する", () => {
    render(
      <GraphCommunities communities={communities} hoveredNodeId="record:unrelated" hoveredNodeType="record" />,
    );

    expect(screen.getByText("まだ大きなグループの一部になっていません")).toBeInTheDocument();
  });

  test("ホバー中のノードが属するグループの記録件数・代表属性を表示する", () => {
    render(<GraphCommunities communities={communities} hoveredNodeId="origin:eth" />);

    expect(screen.getByText("検出されたグループ")).toBeInTheDocument();
    expect(screen.getByText("6件")).toBeInTheDocument();
    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
    expect(screen.getByText("Washed")).toBeInTheDocument();
  });

  test("グループ内の別のノードをホバーしても同じグループが表示される", () => {
    render(<GraphCommunities communities={communities} hoveredNodeId="process:washed" />);

    expect(screen.getByText("6件")).toBeInTheDocument();
  });
});
