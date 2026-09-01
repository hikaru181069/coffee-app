/**
 * GraphPage.jsxのテスト。
 *
 * このページの責務（画面の構成・絞り込みの状態・選択中ノード）に絞って
 * 確認する。GraphCanvas.jsx本体はcanvas描画+物理演算でjsdomでは検証
 * 困難なためスタブに差し替える（IMPLEMENTATION.mdの既知の制約と同じ
 * 方針）。ノード選択の配線はGraphNodeSearch（実装をそのまま使う）経由で
 * 確認する。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const fetchGraph = vi.fn();
const fetchNodeRecords = vi.fn();
vi.mock("../features/graph/api/graphApi", () => ({
  fetchGraph: (...args) => fetchGraph(...args),
  fetchNodeRecords: (...args) => fetchNodeRecords(...args),
  fetchNodeDetail: vi.fn(),
}));

vi.mock("../features/graph/components/GraphCanvas", () => ({
  default: ({ selectedNodeId, onSelectNode }) => (
    <div>
      GraphCanvasスタブ（選択中: {selectedNodeId ?? "なし"}）
      <button type="button" onClick={() => onSelectNode({ id: "origin:1", data: { id: "origin:1", type: "origin", label: "Ethiopia", metadata: { recordCount: 1 } } })}>
        Ethiopiaを選ぶ
      </button>
    </div>
  ),
}));

import GraphPage from "./GraphPage";

const GRAPH_WITH_NODES = {
  nodes: [
    { id: "record:1", type: "record", label: "Ethiopia Guji Natural", metadata: {} },
    { id: "origin:1", type: "origin", label: "Ethiopia", metadata: { recordCount: 1 } },
  ],
  edges: [],
  summary: { recordCount: 1, nodeCount: 2, edgeCount: 1 },
};

const EMPTY_GRAPH = { nodes: [], edges: [], summary: { recordCount: 0, nodeCount: 0, edgeCount: 0 } };

function renderGraphPage(initialEntries = ["/graph"]) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <GraphPage />
    </MemoryRouter>,
  );
}

describe("GraphPage", () => {
  test("読み込み中はローディング状態を表示する", () => {
    fetchGraph.mockReturnValue(new Promise(() => {}));
    renderGraphPage();

    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("取得に失敗したらエラー状態を表示する", async () => {
    fetchGraph.mockRejectedValue(new Error("読み込みエラー"));
    renderGraphPage();

    expect(await screen.findByText("読み込みエラー")).toBeInTheDocument();
  });

  test("記録・絞り込みが無ければ空状態を表示する", async () => {
    fetchGraph.mockResolvedValue(EMPTY_GRAPH);
    renderGraphPage();

    expect(await screen.findByText("まだつながりがありません")).toBeInTheDocument();
  });

  test("記録があればGraphCanvasを表示する", async () => {
    fetchGraph.mockResolvedValue(GRAPH_WITH_NODES);
    renderGraphPage();

    expect(await screen.findByText(/GraphCanvasスタブ/)).toBeInTheDocument();
  });

  test("ノード検索で選ぶとNodeDetailPanelが開く", async () => {
    fetchGraph.mockResolvedValue(GRAPH_WITH_NODES);
    fetchNodeRecords.mockResolvedValue([]);
    const user = userEvent.setup();

    renderGraphPage();
    await screen.findByText(/GraphCanvasスタブ/);

    await user.type(screen.getByLabelText("ノードを検索"), "ethiopia");
    await user.click(screen.getByRole("button", { name: "Ethiopia" }));

    expect(await screen.findByRole("heading", { name: "Ethiopia" })).toBeInTheDocument();
  });

  test("GraphCanvas上でノードを選んでもNodeDetailPanelが開く", async () => {
    fetchGraph.mockResolvedValue(GRAPH_WITH_NODES);
    fetchNodeRecords.mockResolvedValue([]);
    const user = userEvent.setup();

    renderGraphPage();
    await screen.findByText(/GraphCanvasスタブ/);

    await user.click(screen.getByRole("button", { name: "Ethiopiaを選ぶ" }));

    expect(await screen.findByRole("heading", { name: "Ethiopia" })).toBeInTheDocument();
  });

  test("?focus=でURLに指定したノードを自動的に選択する", async () => {
    fetchGraph.mockResolvedValue(GRAPH_WITH_NODES);
    fetchNodeRecords.mockResolvedValue([]);

    renderGraphPage(["/graph?focus=origin%3A1"]);

    expect(await screen.findByRole("heading", { name: "Ethiopia" })).toBeInTheDocument();
  });
});
