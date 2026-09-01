/**
 * GraphNodeSearch.jsxのテスト。
 *
 * graph.nodesをクライアント側でラベル部分一致フィルタする検索欄。
 * recordノードは対象外、種別ごとにグループ化して表示する。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import GraphNodeSearch from "./GraphNodeSearch";

const GRAPH = {
  nodes: [
    { id: "record:1", type: "record", label: "Ethiopia Guji Natural" },
    { id: "origin:1", type: "origin", label: "Ethiopia" },
    { id: "origin:2", type: "origin", label: "Kenya" },
    { id: "flavor:1", type: "flavor", label: "Berry" },
  ],
};

describe("GraphNodeSearch", () => {
  test("何も入力していなければ候補一覧を表示しない", () => {
    render(<GraphNodeSearch graph={GRAPH} onSelectNode={vi.fn()} />);

    expect(screen.queryByText("Ethiopia")).not.toBeInTheDocument();
  });

  test("入力すると一致する属性ノードだけを種別ごとに表示する（recordノードは除外）", async () => {
    const user = userEvent.setup();
    render(<GraphNodeSearch graph={GRAPH} onSelectNode={vi.fn()} />);

    await user.type(screen.getByLabelText("ノードを検索"), "eth");

    expect(screen.getByRole("button", { name: /Ethiopia/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Ethiopia Guji Natural/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Kenya/ })).not.toBeInTheDocument();
  });

  test("大文字小文字を区別しない", async () => {
    const user = userEvent.setup();
    render(<GraphNodeSearch graph={GRAPH} onSelectNode={vi.fn()} />);

    await user.type(screen.getByLabelText("ノードを検索"), "BERRY");

    expect(screen.getByRole("button", { name: /Berry/ })).toBeInTheDocument();
  });

  test("一致するノードが無ければ「見つかりません」を表示する", async () => {
    const user = userEvent.setup();
    render(<GraphNodeSearch graph={GRAPH} onSelectNode={vi.fn()} />);

    await user.type(screen.getByLabelText("ノードを検索"), "xyz");

    expect(screen.getByText('「xyz」に一致するノードが見つかりません')).toBeInTheDocument();
  });

  test("候補を選ぶとonSelectNodeが呼ばれ、入力欄がクリアされる", async () => {
    const user = userEvent.setup();
    const onSelectNode = vi.fn();
    render(<GraphNodeSearch graph={GRAPH} onSelectNode={onSelectNode} />);

    const input = screen.getByLabelText("ノードを検索");
    await user.type(input, "eth");
    await user.click(screen.getByRole("button", { name: /Ethiopia/ }));

    expect(onSelectNode).toHaveBeenCalledWith({
      id: "origin:1",
      data: { id: "origin:1", type: "origin", label: "Ethiopia" },
    });
    expect(input).toHaveValue("");
  });

  test("Escapeキーで入力欄がクリアされる", async () => {
    const user = userEvent.setup();
    render(<GraphNodeSearch graph={GRAPH} onSelectNode={vi.fn()} />);

    const input = screen.getByLabelText("ノードを検索");
    await user.type(input, "eth");
    expect(input).toHaveValue("eth");

    fireEvent.keyDown(input, { key: "Escape" });

    expect(input).toHaveValue("");
  });

  test("外側をクリックすると入力欄がクリアされる", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <GraphNodeSearch graph={GRAPH} onSelectNode={vi.fn()} />
        <button type="button">外側</button>
      </div>,
    );

    const input = screen.getByLabelText("ノードを検索");
    await user.type(input, "eth");
    expect(input).toHaveValue("eth");

    await user.click(screen.getByRole("button", { name: "外側" }));

    expect(input).toHaveValue("");
  });
});
