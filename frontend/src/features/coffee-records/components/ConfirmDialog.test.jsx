/**
 * ConfirmDialog.jsxのテスト。
 *
 * 中心的な確認事項はフォーカストラップ（Tab/Shift+Tabがダイアログ内の
 * 2ボタンだけを循環し、背景側へ抜けないこと）。実際にキーボード操作
 * するuserEventを使い、実装の詳細（handleKeyDownの中身）ではなく
 * 観測できる振る舞い（どの要素にフォーカスがあるか）で検証する。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// i18n初期化・言語固定はsrc/test/setup.jsで行っている
import ConfirmDialog from "./ConfirmDialog";

const renderDialog = (props = {}) =>
  render(
    <ConfirmDialog
      isOpen
      title="この記録を削除しますか？"
      description="この操作は取り消せません。"
      onConfirm={vi.fn()}
      onCancel={vi.fn()}
      {...props}
    />,
  );

describe("ConfirmDialog", () => {
  test("isOpenがfalseなら何も描画しない", () => {
    render(<ConfirmDialog isOpen={false} title="t" onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  test("開いた直後はキャンセルボタンへフォーカスが当たる", () => {
    renderDialog();
    expect(screen.getByRole("button", { name: "キャンセル" })).toHaveFocus();
  });

  test("Tabでキャンセル→削除するへ、もう一度Tabで元に戻る（循環する）", async () => {
    const user = userEvent.setup();
    renderDialog();

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    const confirmButton = screen.getByRole("button", { name: "削除する" });

    expect(cancelButton).toHaveFocus();

    await user.tab();
    expect(confirmButton).toHaveFocus();

    await user.tab();
    expect(cancelButton).toHaveFocus();
  });

  test("Shift+Tabで最初の要素から最後の要素へ循環する", async () => {
    const user = userEvent.setup();
    renderDialog();

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    const confirmButton = screen.getByRole("button", { name: "削除する" });

    expect(cancelButton).toHaveFocus();

    await user.tab({ shift: true });
    expect(confirmButton).toHaveFocus();
  });

  test("Escapeを押すとonCancelが呼ばれる", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderDialog({ onCancel });

    await user.keyboard("{Escape}");
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("処理中（isProcessing）はEscapeで閉じない", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderDialog({ onCancel, isProcessing: true });

    await user.keyboard("{Escape}");
    expect(onCancel).not.toHaveBeenCalled();
  });

  test("削除するボタンを押すとonConfirmが呼ばれる", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    renderDialog({ onConfirm });

    await user.click(screen.getByRole("button", { name: "削除する" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
