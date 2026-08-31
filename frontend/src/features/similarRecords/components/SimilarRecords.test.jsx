/**
 * SimilarRecords.jsxのテスト。
 *
 * DiscoverSuggestions.test.jsxと同じ方針: 「読み込み中・エラー・0件の
 * ときは何も表示しない」という“静かな道具”の方針を中心に見る。
 * データ取得自体はuseSimilarRecordsの責務のためモックする。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("../hooks/useSimilarRecords", () => ({
  useSimilarRecords: vi.fn(),
}));

import { useSimilarRecords } from "../hooks/useSimilarRecords";
import SimilarRecords from "./SimilarRecords";

const renderWithRouter = (recordId = "record-1") =>
  render(
    <MemoryRouter>
      <SimilarRecords recordId={recordId} />
    </MemoryRouter>,
  );

describe("SimilarRecords", () => {
  test("読み込み中は何も表示しない", () => {
    useSimilarRecords.mockReturnValue({ similarRecords: [], isLoading: true, error: null });
    const { container } = renderWithRouter();

    expect(container).toBeEmptyDOMElement();
  });

  test("エラー時は何も表示しない", () => {
    useSimilarRecords.mockReturnValue({ similarRecords: [], isLoading: false, error: new Error("fail") });
    const { container } = renderWithRouter();

    expect(container).toBeEmptyDOMElement();
  });

  test("候補が0件なら何も表示しない", () => {
    useSimilarRecords.mockReturnValue({ similarRecords: [], isLoading: false, error: null });
    const { container } = renderWithRouter();

    expect(container).toBeEmptyDOMElement();
  });

  test("候補があれば見出し・記録名・共有属性のチップ・記録詳細へのリンクを表示する", () => {
    useSimilarRecords.mockReturnValue({
      similarRecords: [
        {
          id: "record-2",
          title: "Kenya AA",
          consumedAt: "2026-07-01T09:00:00.000Z",
          rating: 4,
          sharedCount: 2,
          sharedAttributes: [
            { type: "origin", label: "Ethiopia" },
            { type: "process", label: "Washed" },
          ],
        },
      ],
      isLoading: false,
      error: null,
    });
    renderWithRouter();

    expect(screen.getByText("似た記録")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Kenya AA/ })).toHaveAttribute("href", "/records/record-2");
    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
    expect(screen.getByText("Washed")).toBeInTheDocument();
  });
});
