/**
 * EntityDetailPage.jsxのテスト。
 *
 * 読み込み中・エラー・統計カード（記録数・平均評価・最終記録日）・
 * 関連する属性の「もっと見る」展開（2026-08、設計レビューで種別ごと
 * 5件上限を撤廃した際に追加したロジック）・関連記録一覧を確認する。
 * OriginQualityScores/DiscoverSuggestionsは産地ノードのときだけ描画
 * され、それぞれ独立した機能（別のAPIに依存）のためスタブに差し替える。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const fetchNodeDetail = vi.fn();
vi.mock("../features/graph/api/graphApi", () => ({
  fetchNodeDetail: (...args) => fetchNodeDetail(...args),
}));

vi.mock("../features/originQuality/components/OriginQualityScores", () => ({
  default: () => <div>OriginQualityScoresスタブ</div>,
}));
vi.mock("../features/discover/components/DiscoverSuggestions", () => ({
  default: () => <div>DiscoverSuggestionsスタブ</div>,
}));

import EntityDetailPage from "./EntityDetailPage";

const flavorItem = (n) => ({ id: `flavor:${n}`, label: `Flavor${n}`, count: n });

const FLAVOR_DETAIL = {
  id: "flavor:1",
  type: "flavor",
  label: "Berry",
  recordCount: 5,
  avgRating: 4.2,
  lastConsumedAt: "2026-07-20T00:00:00.000Z",
  relatedAttributes: { origin: [{ id: "origin:1", label: "Ethiopia", count: 5 }] },
  records: [
    { id: "r1", title: "Ethiopia Guji Natural", consumedAt: "2026-07-20T00:00:00.000Z", rating: 4, notesExcerpt: "" },
  ],
};

function renderEntityDetailPage(nodeId = "flavor%3A1") {
  return render(
    <MemoryRouter initialEntries={[`/entities/${nodeId}`]}>
      <Routes>
        <Route path="/entities/:nodeId" element={<EntityDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("EntityDetailPage", () => {
  test("読み込み中はスケルトンを表示する", () => {
    fetchNodeDetail.mockReturnValue(new Promise(() => {}));
    renderEntityDetailPage();

    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("取得に失敗したらエラーメッセージを表示する", async () => {
    fetchNodeDetail.mockRejectedValue(new Error("読み込みエラー"));
    renderEntityDetailPage();

    expect(await screen.findByText("読み込みエラー")).toBeInTheDocument();
  });

  test("ラベル・記録数・平均評価・最終記録日を表示する", async () => {
    fetchNodeDetail.mockResolvedValue(FLAVOR_DETAIL);
    renderEntityDetailPage();

    expect(await screen.findByRole("heading", { name: "Berry" })).toBeInTheDocument();
    expect(screen.getByText("5件の記録")).toBeInTheDocument();
    expect(screen.getByText("4.2")).toBeInTheDocument();
  });

  test("平均評価が無ければ「—」を表示する", async () => {
    fetchNodeDetail.mockResolvedValue({ ...FLAVOR_DETAIL, avgRating: null });
    renderEntityDetailPage();

    await screen.findByRole("heading", { name: "Berry" });
    expect(screen.getByText("—")).toBeInTheDocument();
  });

  test("産地ノードのときだけOriginQualityScores・DiscoverSuggestions・地図リンクを表示する", async () => {
    fetchNodeDetail.mockResolvedValue({ ...FLAVOR_DETAIL, id: "origin:1", type: "origin", label: "Ethiopia" });
    renderEntityDetailPage("origin%3A1");

    expect(await screen.findByText("OriginQualityScoresスタブ")).toBeInTheDocument();
    expect(screen.getByText("DiscoverSuggestionsスタブ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "地図で見る" })).toHaveAttribute("href", "/map");
  });

  test("産地ノード以外では地図リンクを表示しない", async () => {
    fetchNodeDetail.mockResolvedValue(FLAVOR_DETAIL);
    renderEntityDetailPage();

    await screen.findByRole("heading", { name: "Berry" });
    expect(screen.queryByRole("link", { name: "地図で見る" })).not.toBeInTheDocument();
  });

  test("関連する属性が6件を超えると最初の5件+「もっと見る」で表示し、押すと残りが展開される", async () => {
    const items = Array.from({ length: 7 }, (_, i) => flavorItem(i + 1));
    fetchNodeDetail.mockResolvedValue({ ...FLAVOR_DETAIL, relatedAttributes: { origin: items } });
    const user = userEvent.setup();

    renderEntityDetailPage();

    await screen.findByRole("heading", { name: "Berry" });
    expect(screen.getByRole("link", { name: /Flavor5/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Flavor6/ })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "他2件を見る" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "他2件を見る" }));

    expect(screen.getByRole("link", { name: /Flavor6/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Flavor7/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /もっと見る|他\d+件を見る/ })).not.toBeInTheDocument();
  });

  test("関連する記録の一覧を表示する", async () => {
    fetchNodeDetail.mockResolvedValue(FLAVOR_DETAIL);
    renderEntityDetailPage();

    expect(await screen.findByText("Ethiopia Guji Natural")).toBeInTheDocument();
  });
});
