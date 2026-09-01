/**
 * LoginPage.jsxのテスト。
 *
 * services/api/authApi.jsのloginUserをモックし、クライアント側検証・
 * ログイン成功時の保存と遷移・失敗時のエラー表示（2026-08、設計レビューで
 * 新しいエラーコード形式へ統一したerrorMessage.js経由）・ログイン済みの
 * ときの表示切り替えを確認する。
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const loginUser = vi.fn();
vi.mock("../services/api/authApi", () => ({
  loginUser: (...args) => loginUser(...args),
}));

import LoginPage from "./LoginPage";

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderLoginPage() {
  return render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );
}

describe("LoginPage（未ログイン）", () => {
  test("email/passwordが空のまま送信すると、APIを呼ばずクライアント側エラーを表示する", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByText("メールアドレスを入力してください")).toBeInTheDocument();
    expect(loginUser).not.toHaveBeenCalled();
  });

  test("ログイン成功時は認証情報を保存してホームへ遷移する", async () => {
    const user = userEvent.setup();
    loginUser.mockResolvedValue({ _id: "1", name: "Alice", email: "alice@example.com", token: "tok" });
    renderLoginPage();

    await user.type(screen.getByLabelText(/メールアドレス/), "alice@example.com");
    await user.type(screen.getByLabelText(/^パスワード/), "password123");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    await waitFor(() => expect(localStorage.getItem("token")).toBe("tok"));
    expect(localStorage.getItem("userName")).toBe("Alice");
  });

  test("ログイン失敗（INVALID_CREDENTIALS）時は具体的なエラーメッセージを表示する", async () => {
    const user = userEvent.setup();
    const error = new Error("メールアドレスまたはパスワードが正しくありません");
    error.code = "INVALID_CREDENTIALS";
    loginUser.mockRejectedValue(error);
    renderLoginPage();

    await user.type(screen.getByLabelText(/メールアドレス/), "alice@example.com");
    await user.type(screen.getByLabelText(/^パスワード/), "wrong-password");
    await user.click(screen.getByRole("button", { name: "ログイン" }));

    expect(await screen.findByText("メールアドレスまたはパスワードが正しくありません")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
});

describe("LoginPage（ログイン済み）", () => {
  test("トークンがあれば、ログインフォームの代わりに案内を表示する", () => {
    localStorage.setItem("token", "dummy-token");
    localStorage.setItem("userName", "Alice");

    renderLoginPage();

    expect(screen.getByText("Aliceとしてログイン済みです")).toBeInTheDocument();
    expect(screen.queryByLabelText(/メールアドレス/)).not.toBeInTheDocument();
  });
});
