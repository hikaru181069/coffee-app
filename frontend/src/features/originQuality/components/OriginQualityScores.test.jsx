/**
 * OriginQualityScores.jsxのテスト。
 *
 * DiscoverSuggestions.test.jsxと同じ方針: 「読み込み中・エラー・
 * スコア0件のときは何も表示しない」という“静かな道具”の方針が
 * 守られているかを中心に見る。データ取得自体はuseOriginQualityの
 * 責務のためモックする。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("../hooks/useOriginQuality", () => ({
  useOriginQuality: vi.fn(),
}));

import { useOriginQuality } from "../hooks/useOriginQuality";
import OriginQualityScores from "./OriginQualityScores";

describe("OriginQualityScores", () => {
  test("読み込み中は何も表示しない", () => {
    useOriginQuality.mockReturnValue({ scores: [], isLoading: true, error: null });
    const { container } = render(<OriginQualityScores nodeId="origin:1" />);

    expect(container).toBeEmptyDOMElement();
  });

  test("エラー時は何も表示しない", () => {
    useOriginQuality.mockReturnValue({ scores: [], isLoading: false, error: new Error("fail") });
    const { container } = render(<OriginQualityScores nodeId="origin:1" />);

    expect(container).toBeEmptyDOMElement();
  });

  test("スコアが0件（CQIデータに無い産地）なら何も表示しない", () => {
    useOriginQuality.mockReturnValue({ scores: [], isLoading: false, error: null });
    const { container } = render(<OriginQualityScores nodeId="origin:1" />);

    expect(container).toBeEmptyDOMElement();
  });

  test("スコアがあれば見出しと精製方法ごとのスコア・サンプル数を表示する", () => {
    useOriginQuality.mockReturnValue({
      scores: [
        { processLabel: "Natural", avgQualityScore: 86.4, sampleSize: 210 },
        { processLabel: "Washed", avgQualityScore: 85.1, sampleSize: 260 },
      ],
      isLoading: false,
      error: null,
    });
    render(<OriginQualityScores nodeId="origin:1" />);

    expect(screen.getByText("品質スコア")).toBeInTheDocument();
    expect(screen.getByText("Natural")).toBeInTheDocument();
    expect(screen.getByText("86.4")).toBeInTheDocument();
    expect(screen.getByText("n=210")).toBeInTheDocument();
    expect(screen.getByText("Washed")).toBeInTheDocument();
  });
});
