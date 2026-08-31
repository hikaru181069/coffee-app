/**
 * DiscoverSuggestions.jsxのテスト。
 *
 * 「読み込み中・エラー・提案0件のときは何も表示しない」という
 * “静かな道具”の方針（コンポーネント本体のコメント参照）が実際に
 * 守られているかを中心に見る。データ取得自体はuseOriginDiscoveryの
 * 責務のためモックする。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../hooks/useOriginDiscovery", () => ({
  useOriginDiscovery: vi.fn(),
}));

import { useOriginDiscovery } from "../hooks/useOriginDiscovery";
import DiscoverSuggestions from "./DiscoverSuggestions";

const renderWithRouter = (nodeId = "origin:1") =>
  render(
    <MemoryRouter>
      <DiscoverSuggestions nodeId={nodeId} />
    </MemoryRouter>,
  );

describe("DiscoverSuggestions", () => {
  test("読み込み中は何も表示しない", () => {
    useOriginDiscovery.mockReturnValue({ suggestions: [], isLoading: true, error: null });
    const { container } = renderWithRouter();

    expect(container).toBeEmptyDOMElement();
  });

  test("エラー時は何も表示しない", () => {
    useOriginDiscovery.mockReturnValue({ suggestions: [], isLoading: false, error: new Error("fail") });
    const { container } = renderWithRouter();

    expect(container).toBeEmptyDOMElement();
  });

  test("提案が0件なら何も表示しない", () => {
    useOriginDiscovery.mockReturnValue({ suggestions: [], isLoading: false, error: null });
    const { container } = renderWithRouter();

    expect(container).toBeEmptyDOMElement();
  });

  test("提案があれば見出しと提案カードを表示する", () => {
    useOriginDiscovery.mockReturnValue({
      suggestions: [
        {
          type: "similarProcessOrigin",
          basedOn: { originLabel: "Guatemala", processLabel: "Washed", count: 2 },
          suggestedOrigin: { label: "Costa Rica", avgQualityScore: 84.3 },
        },
      ],
      isLoading: false,
      error: null,
    });
    renderWithRouter();

    expect(screen.getByText("まだ試していない産地")).toBeInTheDocument();
    expect(screen.getByText(/Costa Rica/)).toBeInTheDocument();
  });
});
