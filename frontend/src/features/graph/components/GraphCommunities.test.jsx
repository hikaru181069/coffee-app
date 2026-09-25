/**
 * GraphCommunities.jsxのテスト。
 *
 * SimilarRecords.test.jsxと同じ方針: 「読み込み中・0件のときは何も
 * 表示しない」という“静かな道具”の方針を中心に見る。データ取得自体は
 * useGraphCommunitiesの責務のためモックする。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../hooks/useGraphCommunities", () => ({
  useGraphCommunities: vi.fn(),
}));

import { useGraphCommunities } from "../hooks/useGraphCommunities";
import GraphCommunities from "./GraphCommunities";

describe("GraphCommunities", () => {
  test("読み込み中は何も表示しない", () => {
    useGraphCommunities.mockReturnValue({ communities: [], isLoading: true });
    const { container } = render(<GraphCommunities />);

    expect(container).toBeEmptyDOMElement();
  });

  test("グループが0件なら何も表示しない", () => {
    useGraphCommunities.mockReturnValue({ communities: [], isLoading: false });
    const { container } = render(<GraphCommunities />);

    expect(container).toBeEmptyDOMElement();
  });

  test("グループがあれば見出し・記録件数・代表属性を表示する", () => {
    useGraphCommunities.mockReturnValue({
      communities: [
        {
          id: 0,
          recordCount: 6,
          dominantAttributes: { origin: ["Ethiopia"], process: ["Washed"] },
        },
      ],
      isLoading: false,
    });
    render(<GraphCommunities />);

    expect(screen.getByText("検出されたグループ")).toBeInTheDocument();
    expect(screen.getByText("6件")).toBeInTheDocument();
    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
    expect(screen.getByText("Washed")).toBeInTheDocument();
  });
});
