/**
 * FormField.jsxのテスト。
 *
 * docs/design.mdの「任意項目を必須に見せない」「色だけで状態を表現
 * しない」に対応する部分（required/optionalバッジの出し分け、
 * エラーメッセージのrole="alert"）を確認する。
 */
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";

import FormField from "./FormField";

describe("FormField", () => {
  test("required=trueなら「必須」バッジを表示する", () => {
    render(
      <FormField id="title" label="タイトル" required>
        <input id="title" />
      </FormField>,
    );

    expect(screen.getByText("必須")).toBeInTheDocument();
    expect(screen.queryByText("任意")).not.toBeInTheDocument();
  });

  test("required=false（既定）なら「任意」を表示する", () => {
    render(
      <FormField id="notes" label="メモ">
        <textarea id="notes" />
      </FormField>,
    );

    expect(screen.getByText("任意")).toBeInTheDocument();
    expect(screen.queryByText("必須")).not.toBeInTheDocument();
  });

  test("hintを渡すと説明文を表示する", () => {
    render(
      <FormField id="farm" label="農園" hint="候補が無いため自由入力です">
        <input id="farm" />
      </FormField>,
    );

    expect(screen.getByText("候補が無いため自由入力です")).toBeInTheDocument();
  });

  test("errorを渡すとrole='alert'でエラーメッセージを表示する", () => {
    render(
      <FormField id="title" label="タイトル" required error="タイトルを入力してください">
        <input id="title" />
      </FormField>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("タイトルを入力してください");
  });

  test("errorが無ければalertは出さない", () => {
    render(
      <FormField id="title" label="タイトル" required>
        <input id="title" />
      </FormField>,
    );

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("childrenをそのまま描画する", () => {
    render(
      <FormField id="title" label="タイトル" required>
        <input id="title" placeholder="例: Ethiopia Yirgacheffe" />
      </FormField>,
    );

    expect(screen.getByPlaceholderText("例: Ethiopia Yirgacheffe")).toBeInTheDocument();
  });
});
