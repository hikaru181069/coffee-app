/**
 * EmptyState.jsxのテスト。
 *
 * 2026-08、RecordsEmptyState/StatsEmptyState/GraphEmptyState等5箇所の
 * 重複マークアップを集約した共通コンポーネント。多くの画面から使われる
 * ため、variant・fillHeight・各propの有無による出し分けを確認する。
 */
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { Coffee } from "lucide-react";

import EmptyState from "./EmptyState";

describe("EmptyState", () => {
  test("icon・title・description・actionをすべて表示する", () => {
    render(
      <EmptyState
        icon={Coffee}
        title="記録がありません"
        description="最初の記録を作成しましょう"
        action={<button type="button">記録する</button>}
      />,
    );

    expect(screen.getByText("記録がありません")).toBeInTheDocument();
    expect(screen.getByText("最初の記録を作成しましょう")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "記録する" })).toBeInTheDocument();
  });

  test("variant='error'のときは危険色のクラスになる", () => {
    const { container } = render(<EmptyState icon={Coffee} title="エラー" variant="error" />);

    expect(container.firstChild.className).toContain("border-danger/40");
  });

  test("既定（variant='default'）のときは危険色を含まない", () => {
    const { container } = render(<EmptyState icon={Coffee} title="通常" />);

    expect(container.firstChild.className).not.toContain("border-danger");
    expect(container.firstChild.className).toContain("border-dashed");
  });

  test("fillHeightを指定すると高さいっぱいに中央寄せするクラスが付く", () => {
    const { container } = render(<EmptyState icon={Coffee} title="タイトル" fillHeight />);

    expect(container.firstChild.className).toContain("h-full");
    expect(container.firstChild.className).toContain("justify-center");
  });

  test("iconを渡さなければアイコンは描画しない", () => {
    const { container } = render(<EmptyState title="タイトル" />);

    expect(container.querySelector("svg")).not.toBeInTheDocument();
  });

  test("descriptionを渡さなければ説明文は描画しない", () => {
    render(<EmptyState icon={Coffee} title="タイトルのみ" />);

    expect(screen.getByText("タイトルのみ")).toBeInTheDocument();
    expect(screen.queryByText(/説明/)).not.toBeInTheDocument();
  });

  test("titleを渡さなければタイトル・説明のブロック自体を描画しない", () => {
    const { container } = render(<EmptyState icon={Coffee} description="説明だけ渡しても出ない" />);

    expect(screen.queryByText("説明だけ渡しても出ない")).not.toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  test("roleを渡すとそのままDOMへ反映される（エラー領域のrole='alert'等）", () => {
    render(<EmptyState icon={Coffee} title="エラーです" variant="error" role="alert" />);

    expect(screen.getByRole("alert")).toBeInTheDocument();
  });
});
