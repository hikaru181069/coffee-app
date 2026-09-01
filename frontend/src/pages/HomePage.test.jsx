/**
 * HomePage.jsxのテスト。
 *
 * 2026-08、設計レビューでuseProfileを使わず直接getCurrentUserを
 * 呼んでいた重複を解消した（useProfile.jsへ統一）。ここではその配線と、
 * 最近の記録の読み込み中・空・エラー・正常系を確認する。GraphPreview・
 * DiscoverCardはそれぞれ独立した機能（別のAPIに依存）のため、
 * このページ自身の責務ではないとしてスタブに差し替える。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchCoffeeRecords = vi.fn();
vi.mock("../features/coffee-records/api/coffeeRecordApi", () => ({
  fetchCoffeeRecords: (...args) => fetchCoffeeRecords(...args),
}));

const getCurrentUser = vi.fn();
vi.mock("../services/api/userApi", () => ({
  getCurrentUser: (...args) => getCurrentUser(...args),
}));

vi.mock("../features/graph/components/GraphPreview", () => ({
  default: () => <div>GraphPreviewスタブ</div>,
}));
vi.mock("../features/discover/components/DiscoverCard", () => ({
  default: () => <div>DiscoverCardスタブ</div>,
}));

import HomePage from "./HomePage";

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

describe("HomePage", () => {
  test("useProfile経由でユーザー名を含む挨拶を表示する", async () => {
    getCurrentUser.mockResolvedValue({ _id: "1", name: "Alice", email: "alice@example.com" });
    fetchCoffeeRecords.mockResolvedValue({ data: [], pagination: null });

    renderHomePage();

    expect(await screen.findByText(/Alice/)).toBeInTheDocument();
  });

  test("記録の読み込み中はスケルトンを表示する", () => {
    getCurrentUser.mockReturnValue(new Promise(() => {}));
    fetchCoffeeRecords.mockReturnValue(new Promise(() => {}));

    renderHomePage();

    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("記録が0件なら空状態の案内を表示する", async () => {
    getCurrentUser.mockResolvedValue({ _id: "1", name: "Alice", email: "alice@example.com" });
    fetchCoffeeRecords.mockResolvedValue({ data: [], pagination: { total: 0 } });

    renderHomePage();

    expect(
      await screen.findByText("最初の1杯を記録すると、産地やフレーバーのつながりが見えはじめます。"),
    ).toBeInTheDocument();
  });

  test("記録があれば一覧として表示する", async () => {
    getCurrentUser.mockResolvedValue({ _id: "1", name: "Alice", email: "alice@example.com" });
    fetchCoffeeRecords.mockResolvedValue({
      data: [
        {
          id: "1",
          title: "Ethiopia Guji Natural",
          rating: 4,
          origin: null,
          process: null,
          flavors: [],
        },
      ],
      pagination: { total: 1 },
    });

    renderHomePage();

    expect(await screen.findByText("Ethiopia Guji Natural")).toBeInTheDocument();
  });

  test("記録の取得に失敗したらエラーメッセージを表示する", async () => {
    getCurrentUser.mockResolvedValue({ _id: "1", name: "Alice", email: "alice@example.com" });
    fetchCoffeeRecords.mockRejectedValue(new Error("読み込みエラー"));

    renderHomePage();

    expect(await screen.findByText("読み込みエラー")).toBeInTheDocument();
  });

  test("GraphPreview・DiscoverCardを描画する", async () => {
    getCurrentUser.mockResolvedValue({ _id: "1", name: "Alice", email: "alice@example.com" });
    fetchCoffeeRecords.mockResolvedValue({ data: [], pagination: null });

    renderHomePage();

    expect(await screen.findByText("GraphPreviewスタブ")).toBeInTheDocument();
    expect(screen.getByText("DiscoverCardスタブ")).toBeInTheDocument();
  });
});
