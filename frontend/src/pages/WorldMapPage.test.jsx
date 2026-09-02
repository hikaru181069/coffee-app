/**
 * WorldMapPage.jsxのテスト。
 *
 * 読み込み中・エラー・訪問産地0件（空状態）・正常系（訪れた産地数の
 * サマリー・産地一覧）を確認する。WorldMap.jsx本体（d3-geo/topojsonの
 * 実描画）はWorldMap.test.jsxで検証済みのため、ここではスタブに
 * 差し替える。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const fetchGraph = vi.fn();
vi.mock("../features/graph/api/graphApi", () => ({
  fetchGraph: (...args) => fetchGraph(...args),
}));

const fetchAllMasterData = vi.fn();
vi.mock("../features/coffee-records/api/masterDataApi", () => ({
  fetchAllMasterData: (...args) => fetchAllMasterData(...args),
}));

vi.mock("../features/map/components/WorldMap", () => ({
  default: () => <div>WorldMapスタブ</div>,
}));

import WorldMapPage from "./WorldMapPage";

const EMPTY_MASTER_DATA = { origins: [], varieties: [], processes: [], roastLevels: [], flavors: [] };

const VISITED_GRAPH = {
  nodes: [
    { id: "origin:1", type: "origin", label: "Ethiopia", metadata: { recordCount: 4, countryCode: "ET" } },
  ],
  edges: [],
  summary: { recordCount: 4, nodeCount: 1, edgeCount: 1 },
};

function renderWorldMapPage() {
  return render(
    <MemoryRouter>
      <WorldMapPage />
    </MemoryRouter>,
  );
}

describe("WorldMapPage", () => {
  test("読み込み中はスケルトンを表示する", () => {
    fetchGraph.mockReturnValue(new Promise(() => {}));
    fetchAllMasterData.mockResolvedValue(EMPTY_MASTER_DATA);

    renderWorldMapPage();

    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("取得に失敗したらエラー状態を表示する", async () => {
    fetchGraph.mockRejectedValue(new Error("読み込みエラー"));
    fetchAllMasterData.mockResolvedValue(EMPTY_MASTER_DATA);

    renderWorldMapPage();

    expect(await screen.findByText("読み込みエラー")).toBeInTheDocument();
  });

  test("訪問済みの産地が無ければ空状態を表示する", async () => {
    fetchGraph.mockResolvedValue({ nodes: [], edges: [], summary: { recordCount: 0, nodeCount: 0, edgeCount: 0 } });
    fetchAllMasterData.mockResolvedValue(EMPTY_MASTER_DATA);

    renderWorldMapPage();

    expect(await screen.findByText("まだ産地の記録がありません")).toBeInTheDocument();
  });

  test("訪問済みの産地があれば地図・サマリー・一覧を表示する", async () => {
    fetchGraph.mockResolvedValue(VISITED_GRAPH);
    fetchAllMasterData.mockResolvedValue({ ...EMPTY_MASTER_DATA, origins: Array.from({ length: 20 }, (_, i) => ({ id: `o${i}`, name: `Origin${i}` })) });

    renderWorldMapPage();

    expect(await screen.findByText("WorldMapスタブ")).toBeInTheDocument();
    expect(screen.getByText("1 / 20")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ethiopia/ })).toHaveAttribute("href", "/entities/origin%3A1");
  });
});
