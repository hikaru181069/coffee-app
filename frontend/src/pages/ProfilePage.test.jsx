/**
 * ProfilePage.jsxのテスト。
 *
 * services/api/userApi.js（2026-08、設計レビューでapiRequest経由へ統一）
 * をモックし、名前変更・パスワード変更・退会の主要経路を確認する。
 * 特に「現在のパスワードが違う」（400・INVALID_CURRENT_PASSWORD）が
 * 誤って自動ログアウトを起こさないことは、今回のリファクタの中心的な
 * 変更点なので重点的に検証する。
 */
import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const getCurrentUser = vi.fn();
const updateProfile = vi.fn();
const changePassword = vi.fn();
const deleteAccount = vi.fn();
vi.mock("../services/api/userApi", () => ({
  getCurrentUser: (...args) => getCurrentUser(...args),
  updateProfile: (...args) => updateProfile(...args),
  changePassword: (...args) => changePassword(...args),
  deleteAccount: (...args) => deleteAccount(...args),
}));

import ProfilePage from "./ProfilePage";
import { ToastProvider } from "../contexts/ToastContext";

const USER = { _id: "1", name: "Alice", email: "alice@example.com" };

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

function renderProfilePage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <ProfilePage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("ProfilePage（読み込み中・エラー）", () => {
  test("読み込み中はスケルトンを表示する", () => {
    getCurrentUser.mockReturnValue(new Promise(() => {}));
    renderProfilePage();

    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("取得に失敗したらエラー状態を表示する", async () => {
    getCurrentUser.mockRejectedValue(new Error("読み込みエラー"));
    renderProfilePage();

    expect(await screen.findByText("読み込みエラー")).toBeInTheDocument();
  });
});

describe("ProfilePage（名前変更）", () => {
  test("現在の名前・メールアドレスを表示する", async () => {
    getCurrentUser.mockResolvedValue(USER);
    renderProfilePage();

    expect(await screen.findByDisplayValue("Alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  test("名前を保存すると成功トーストが出る", async () => {
    const user = userEvent.setup();
    getCurrentUser.mockResolvedValue(USER);
    updateProfile.mockResolvedValue({ ...USER, name: "Alice Updated" });
    renderProfilePage();

    const nameInput = await screen.findByDisplayValue("Alice");
    await user.clear(nameInput);
    await user.type(nameInput, "Alice Updated");
    await user.click(screen.getByRole("button", { name: "名前を保存" }));

    expect(await screen.findByText("名前を更新しました")).toBeInTheDocument();
    expect(updateProfile).toHaveBeenCalledWith({ name: "Alice Updated" });
  });
});

describe("ProfilePage（パスワード変更）", () => {
  test("現在のパスワードが違う（400・INVALID_CURRENT_PASSWORD）場合、エラートーストを出し自動ログアウトしない", async () => {
    const user = userEvent.setup();
    getCurrentUser.mockResolvedValue(USER);
    const error = new Error("現在のパスワードが正しくありません");
    error.code = "INVALID_CURRENT_PASSWORD";
    changePassword.mockRejectedValue(error);
    localStorage.setItem("token", "dummy-token");
    renderProfilePage();

    await screen.findByDisplayValue("Alice");
    await user.type(screen.getByLabelText(/^現在のパスワード/), "wrong-password");
    await user.type(screen.getByLabelText(/^新しいパスワード/), "newpassword456");
    await user.click(screen.getByRole("button", { name: "パスワードを変更" }));

    expect(await screen.findByText("現在のパスワードが正しくありません")).toBeInTheDocument();
    // 自動ログアウトしていないこと（トークンが消えていない）
    expect(localStorage.getItem("token")).toBe("dummy-token");
  });

  test("正しいパスワードなら成功トーストを出し、入力欄をクリアする", async () => {
    const user = userEvent.setup();
    getCurrentUser.mockResolvedValue(USER);
    changePassword.mockResolvedValue({ message: "Password updated successfully" });
    renderProfilePage();

    await screen.findByDisplayValue("Alice");
    const currentPasswordInput = screen.getByLabelText(/^現在のパスワード/);
    const newPasswordInput = screen.getByLabelText(/^新しいパスワード/);
    await user.type(currentPasswordInput, "password123");
    await user.type(newPasswordInput, "newpassword456");
    await user.click(screen.getByRole("button", { name: "パスワードを変更" }));

    expect(await screen.findByText("パスワードを変更しました")).toBeInTheDocument();
    expect(currentPasswordInput).toHaveValue("");
    expect(newPasswordInput).toHaveValue("");
  });
});

describe("ProfilePage（アカウント削除）", () => {
  test("削除ボタンは確認ダイアログを開き、確定するとアカウントを削除してログイン画面へ遷移する", async () => {
    const user = userEvent.setup();
    getCurrentUser.mockResolvedValue(USER);
    deleteAccount.mockResolvedValue({ message: "Account deleted successfully" });
    localStorage.setItem("token", "dummy-token");
    renderProfilePage();

    await screen.findByDisplayValue("Alice");
    await user.click(screen.getByRole("button", { name: "アカウントを削除する" }));

    expect(screen.getByText("アカウントを削除しますか？")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    await waitFor(() => expect(localStorage.getItem("token")).toBeNull());
  });
});
