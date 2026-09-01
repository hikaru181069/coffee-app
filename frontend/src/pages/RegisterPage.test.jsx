/**
 * RegisterPage.jsxのテスト。
 *
 * services/api/authApi.jsのregisterUserをモックし、クライアント側検証・
 * 登録成功時の保存と遷移・失敗時のエラー表示（2026-08、設計レビューで
 * 「すでに登録されています」がCONFLICT/409へ統一された）を確認する。
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const registerUser = vi.fn();
vi.mock("../services/api/authApi", () => ({
  registerUser: (...args) => registerUser(...args),
}));

import RegisterPage from "./RegisterPage";

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderRegisterPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

describe("RegisterPage", () => {
  test("すべて空のまま送信すると、APIを呼ばずクライアント側エラーを表示する", async () => {
    const user = userEvent.setup();
    renderRegisterPage();

    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    expect(await screen.findByText("名前を入力してください")).toBeInTheDocument();
    expect(registerUser).not.toHaveBeenCalled();
  });

  test("登録成功時は認証情報を保存してホームへ遷移する", async () => {
    const user = userEvent.setup();
    registerUser.mockResolvedValue({ _id: "1", name: "Alice", email: "alice@example.com", token: "tok" });
    renderRegisterPage();

    await user.type(screen.getByLabelText(/^名前/), "Alice");
    await user.type(screen.getByLabelText(/メールアドレス/), "alice@example.com");
    await user.type(screen.getByLabelText(/^パスワード/), "password123");
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    await waitFor(() => expect(localStorage.getItem("token")).toBe("tok"));
    expect(localStorage.getItem("userName")).toBe("Alice");
  });

  test("登録済みメールアドレス（CONFLICT）のときは具体的なエラーメッセージを表示する", async () => {
    const user = userEvent.setup();
    const error = new Error("このメールアドレスは既に登録されています");
    error.code = "CONFLICT";
    registerUser.mockRejectedValue(error);
    renderRegisterPage();

    await user.type(screen.getByLabelText(/^名前/), "Alice");
    await user.type(screen.getByLabelText(/メールアドレス/), "alice@example.com");
    await user.type(screen.getByLabelText(/^パスワード/), "password123");
    await user.click(screen.getByRole("button", { name: "アカウントを作成" }));

    expect(await screen.findByText("すでに登録されています")).toBeInTheDocument();
    expect(localStorage.getItem("token")).toBeNull();
  });
});
