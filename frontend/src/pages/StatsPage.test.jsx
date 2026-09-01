/**
 * StatsPage.jsxのテスト。
 *
 * 読み込み中・エラー・記録0件（空状態）・正常系（3セクション構成）の
 * 出し分けを確認する。各サブコンポーネント（OverviewStats等）自体の
 * 内部表示ロジックはこのテストの対象外。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchStats = vi.fn();
vi.mock("../features/stats/api/statsApi", () => ({
  fetchStats: (...args) => fetchStats(...args),
}));

import StatsPage from "./StatsPage";

const FULL_STATS = {
  overview: { recordCount: 15, avgRating: 4.1, firstRecordedAt: "2026-06-03T00:00:00.000Z" },
  collection: { originCount: 7, varietyCount: 7, processCount: 3, farmCount: 1, cafeCount: 4, flavorCount: 13 },
  topOrigins: [{ id: "origin:1", label: "Ethiopia", count: 4 }],
  topVarieties: [],
  topProcesses: [],
  topFlavors: [],
  topCafes: [],
  ratingDistribution: [1, 2, 3, 4, 5].map((rating) => ({ rating, count: rating === 4 ? 3 : 0 })),
  homeVsCafe: null,
  monthlyTrend: [{ month: "2026-07", count: 15 }],
};

function renderStatsPage() {
  return render(
    <MemoryRouter>
      <StatsPage />
    </MemoryRouter>,
  );
}

describe("StatsPage", () => {
  test("読み込み中はスケルトンを表示する", () => {
    fetchStats.mockReturnValue(new Promise(() => {}));
    renderStatsPage();

    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("取得に失敗したらエラー状態を表示する", async () => {
    fetchStats.mockRejectedValue(new Error("読み込みエラー"));
    renderStatsPage();

    expect(await screen.findByText("読み込みエラー")).toBeInTheDocument();
  });

  test("記録0件なら空状態を表示する", async () => {
    fetchStats.mockResolvedValue({ ...FULL_STATS, overview: { ...FULL_STATS.overview, recordCount: 0 } });
    renderStatsPage();

    expect(await screen.findByText("統計")).toBeInTheDocument();
    expect(screen.queryByText("記録のペース")).not.toBeInTheDocument();
  });

  test("記録があれば3セクション（ペース・Collection・味の傾向）を表示する", async () => {
    fetchStats.mockResolvedValue(FULL_STATS);
    renderStatsPage();

    expect(await screen.findByText("記録のペース")).toBeInTheDocument();
    expect(screen.getByText("Collection")).toBeInTheDocument();
    expect(screen.getByText("味の傾向")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "詳しい診断を見る" })).toHaveAttribute("href", "/diagnosis");
  });
});
