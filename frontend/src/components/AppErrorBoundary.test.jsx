/**
 * AppErrorBoundary.jsxのテスト。
 *
 * 子要素の描画中に例外が起きても、アプリ全体を巻き込まずフォールバック
 * UIを表示することを確認する（2026-08、GraphCanvas.jsx移行時の障害を
 * 受けて追加された経緯があるコンポーネント）。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import AppErrorBoundary from "./AppErrorBoundary";

function Bomb() {
  throw new Error("boom");
}

describe("AppErrorBoundary", () => {
  test("子要素が正常に描画できるときは、そのまま表示する", () => {
    render(
      <AppErrorBoundary>
        <p>普通のコンテンツ</p>
      </AppErrorBoundary>,
    );

    expect(screen.getByText("普通のコンテンツ")).toBeInTheDocument();
  });

  test("子要素の描画中にエラーが起きたら、フォールバックUIへ切り替える", () => {
    // ReactがcomponentDidCatch経由でconsole.errorへエラーを出すため、
    // テスト出力を汚さないよう一時的に黙らせる
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AppErrorBoundary>
        <Bomb />
      </AppErrorBoundary>,
    );

    expect(screen.getByText("問題が発生しました")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "再読み込み" })).toBeInTheDocument();

    consoleErrorSpy.mockRestore();
  });
});
