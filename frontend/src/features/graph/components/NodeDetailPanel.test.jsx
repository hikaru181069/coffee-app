/**
 * NodeDetailPanel.jsxのテスト。
 *
 * ノード種別（record/属性）による表示の出し分け、loading/error状態、
 * 閉じるボタンの配線を確認する。Escape・フォーカス移動は
 * hooks/useFocusTrap.test.jsで検証済みのため、ここでは繰り返さない。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import NodeDetailPanel from "./NodeDetailPanel";

const RECORD_NODE = {
  id: "record:1",
  data: { type: "record", label: "Ethiopia Guji Natural", metadata: {} },
};

const ATTRIBUTE_NODE = {
  id: "origin:1",
  data: { type: "origin", label: "Ethiopia", metadata: { recordCount: 3 } },
};

function renderPanel(props) {
  return render(
    <MemoryRouter>
      <NodeDetailPanel onClose={vi.fn()} {...props} />
    </MemoryRouter>,
  );
}

describe("NodeDetailPanel", () => {
  test("nodeがnullなら何も描画しない", () => {
    const { container } = renderPanel({ node: null });
    expect(container).toBeEmptyDOMElement();
  });

  test("isLoadingならスケルトンを表示する", () => {
    renderPanel({ node: ATTRIBUTE_NODE, isLoading: true });
    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("errorならエラーメッセージを表示する", () => {
    renderPanel({ node: ATTRIBUTE_NODE, error: { message: "取得に失敗しました" } });
    expect(screen.getByText("取得に失敗しました")).toBeInTheDocument();
  });

  test("recordノードは日付・評価・メモ・詳細リンクを表示する", () => {
    renderPanel({
      node: RECORD_NODE,
      detail: {
        kind: "record",
        record: {
          id: "1",
          consumedAt: "2026-07-15T09:00:00.000Z",
          rating: 4,
          notes: "ベリー系の甘さが強い。",
        },
      },
    });

    expect(screen.getByText("Ethiopia Guji Natural")).toBeInTheDocument();
    expect(screen.getByText("4 / 5")).toBeInTheDocument();
    expect(screen.getByText("ベリー系の甘さが強い。")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "記録の詳細を見る" })).toHaveAttribute(
      "href",
      "/records/1",
    );
  });

  test("属性ノードは記録数・エンティティ詳細リンク・関連記録一覧を表示する", () => {
    renderPanel({
      node: ATTRIBUTE_NODE,
      detail: {
        kind: "attribute",
        relatedRecords: [
          { id: "r1", title: "Ethiopia Yirgacheffe", consumedAt: "2026-07-01T00:00:00.000Z", rating: 5 },
        ],
      },
    });

    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "詳細を見る" })).toHaveAttribute(
      "href",
      "/entities/origin%3A1",
    );
    expect(screen.getByText("Ethiopia Yirgacheffe")).toBeInTheDocument();
  });

  test("関連記録が0件なら一覧を空のまま表示する（クラッシュしない）", () => {
    renderPanel({
      node: ATTRIBUTE_NODE,
      detail: { kind: "attribute", relatedRecords: [] },
    });

    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
  });

  test("閉じるボタンを押すとonCloseが呼ばれる", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPanel({ node: ATTRIBUTE_NODE, onClose });

    await user.click(screen.getByRole("button", { name: "閉じる" }));

    expect(onClose).toHaveBeenCalled();
  });
});
