/**
 * SaveDiscoveryReveal.jsxのテスト。
 *
 * MemoryRouterで包むのは、内部の「つながりを見る」リンク（react-router-dom
 * のLink）がルーターコンテキストを必要とするため。
 *
 * 2026-09、冒頭に「淹れている」演出（CoffeeLoaderを1サイクル=4.6秒だけ
 * 再生してから本体を表示する）を追加したため、フェイクタイマーで
 * その時間を進めてから本体のアサーションを行う。
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import SaveDiscoveryReveal from "./SaveDiscoveryReveal";

const RECORD = {
  id: "record-1",
  title: "Ethiopia Gotiti",
  consumedAt: "2026-09-14T09:00:00.000Z",
  rating: 4,
};

const renderReveal = (props) => {
  render(
    <MemoryRouter>
      <SaveDiscoveryReveal record={RECORD} discoveries={[]} onContinue={vi.fn()} {...props} />
    </MemoryRouter>,
  );
  // 「淹れている」演出（SaveDiscoveryReveal.jsxのBREW_INTRO_MS）をスキップし、
  // 本体（記録・発見一覧）を即座に表示させる
  act(() => {
    vi.advanceTimersByTime(4600);
  });
};

describe("SaveDiscoveryReveal", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("記録のタイトル・評価を表示する", () => {
    renderReveal();

    expect(screen.getByText("Ethiopia Gotiti")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  test("初登場の発見を文言つきで表示する", () => {
    renderReveal({
      discoveries: [
        { type: "firstAppearance", nodeType: "origin", nodeId: "origin:eth-1", label: "Ethiopia", recordCount: 1 },
      ],
    });

    expect(screen.getByText("Ethiopiaを初めて記録しました")).toBeInTheDocument();
  });

  test("マイルストーンの発見を件数つきで表示する", () => {
    renderReveal({
      discoveries: [
        { type: "milestone", nodeType: "flavor", nodeId: "flavor:berry-1", label: "Berry", recordCount: 3 },
      ],
    });

    expect(screen.getByText("Berryを含む記録が3件になりました")).toBeInTheDocument();
  });

  test("「つながりを見る」はエンティティ詳細ページへのリンクになる", () => {
    renderReveal({
      discoveries: [
        { type: "firstAppearance", nodeType: "origin", nodeId: "origin:eth-1", label: "Ethiopia", recordCount: 1 },
      ],
    });

    expect(screen.getByRole("link", { name: /つながりを見る/ })).toHaveAttribute(
      "href",
      "/entities/origin%3Aeth-1",
    );
  });

  test("「記録を見る」ボタンを押すとonContinueが呼ばれる", async () => {
    const onContinue = vi.fn();
    renderReveal({ onContinue });

    // userEvent.click()は内部で実タイマーのdelayを使うため、演出をスキップ
    // した後は実タイマーへ戻してからクリックする
    vi.useRealTimers();
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: "記録を見る" }));

    expect(onContinue).toHaveBeenCalledTimes(1);
  });

  test("複数の発見を件数分表示する", () => {
    renderReveal({
      discoveries: [
        { type: "firstAppearance", nodeType: "origin", nodeId: "origin:eth-1", label: "Ethiopia", recordCount: 1 },
        { type: "milestone", nodeType: "flavor", nodeId: "flavor:berry-1", label: "Berry", recordCount: 3 },
      ],
    });

    expect(screen.getAllByRole("link", { name: /つながりを見る/ })).toHaveLength(2);
  });
});
