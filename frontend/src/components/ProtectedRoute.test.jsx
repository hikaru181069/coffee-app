/**
 * ProtectedRoute.jsxのテスト。
 *
 * 未ログインなら/landingへリダイレクトし、ログイン済みなら子ルート
 * （Outlet）をそのまま表示することを確認する。
 */
import { afterEach, describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";

import ProtectedRoute from "./ProtectedRoute";

afterEach(() => {
  localStorage.clear();
});

function renderProtectedRoute() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<p>保護されたページ</p>} />
        </Route>
        <Route path="/landing" element={<p>ランディングページ</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  test("トークンが無ければ/landingへリダイレクトする", () => {
    renderProtectedRoute();

    expect(screen.getByText("ランディングページ")).toBeInTheDocument();
    expect(screen.queryByText("保護されたページ")).not.toBeInTheDocument();
  });

  test("トークンがあれば子ルート（Outlet）をそのまま表示する", () => {
    localStorage.setItem("token", "dummy-token");

    renderProtectedRoute();

    expect(screen.getByText("保護されたページ")).toBeInTheDocument();
    expect(screen.queryByText("ランディングページ")).not.toBeInTheDocument();
  });
});
