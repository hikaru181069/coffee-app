/**
 * Navbar.jsxのテスト。
 *
 * 2026-08、監査でモバイルドロワーにEscape・フォーカストラップ・inertが
 * 無かったことが発覚し、hooks/useFocusTrap.jsを組み込んだ
 * （そちらは別途useFocusTrap.test.jsで検証済み）。ここではNavbar自体の
 * 配線: ログイン状態での出し分け・ドロワーの開閉・ログアウト時の
 * 認証情報クリアを確認する。
 */
import { afterEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import Navbar from "./Navbar";

afterEach(() => {
  localStorage.clear();
});

function renderNavbar() {
  return render(
    <MemoryRouter>
      <Navbar />
    </MemoryRouter>,
  );
}

describe("Navbar（未ログイン）", () => {
  test("ログイン・新規登録リンクを表示する", () => {
    renderNavbar();

    expect(screen.getAllByRole("link", { name: "ログイン" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("link", { name: "新規登録" }).length).toBeGreaterThan(0);
  });

  test("プロフィール・ログアウトは表示しない", () => {
    renderNavbar();

    expect(screen.queryByRole("button", { name: "ログアウト" })).not.toBeInTheDocument();
  });
});

describe("Navbar（ログイン済み）", () => {
  test("ユーザー名とログアウトボタンを表示する", () => {
    localStorage.setItem("token", "dummy-token");
    localStorage.setItem("userName", "Alice");

    renderNavbar();

    expect(screen.getAllByText("Alice").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "ログアウト" }).length).toBeGreaterThan(0);
  });

  test("ログアウトを押すと認証情報がクリアされる", async () => {
    const user = userEvent.setup();
    localStorage.setItem("token", "dummy-token");
    localStorage.setItem("userName", "Alice");

    renderNavbar();

    await user.click(screen.getAllByRole("button", { name: "ログアウト" })[0]);

    expect(localStorage.getItem("token")).toBeNull();
    expect(localStorage.getItem("userName")).toBeNull();
  });
});

describe("Navbar（モバイルドロワー）", () => {
  test("初期状態は閉じており、ハンバーガーボタンを押すと開く", async () => {
    const user = userEvent.setup();
    renderNavbar();

    const hamburger = screen.getByLabelText("メニューを開閉");
    expect(hamburger).toHaveAttribute("aria-expanded", "false");

    await user.click(hamburger);

    expect(hamburger).toHaveAttribute("aria-expanded", "true");
  });

  test("ドロワー内のナビリンクを押すと閉じる", async () => {
    const user = userEvent.setup();
    renderNavbar();

    const hamburger = screen.getByLabelText("メニューを開閉");
    await user.click(hamburger);
    expect(hamburger).toHaveAttribute("aria-expanded", "true");

    const drawer = document.getElementById("mobile-nav-drawer");
    const recordsLinks = screen.getAllByRole("link", { name: /記録/ });
    const drawerRecordsLink = recordsLinks.find((link) => drawer.contains(link));
    await user.click(drawerRecordsLink);

    expect(hamburger).toHaveAttribute("aria-expanded", "false");
  });
});
