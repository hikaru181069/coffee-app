/**
 * ChipMultiSelect.jsxのテスト。
 *
 * 品種・フレーバーの複数選択で使う。実体はチェックボックス
 * （sr-only）なので、キーボード・支援技術での操作性も含めて
 * role="checkbox"経由で検証する。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import ChipMultiSelect from "./ChipMultiSelect";

const OPTIONS = [
  { id: "berry", name: "Berry" },
  { id: "floral", name: "Floral" },
  { id: "citrus", name: "Citrus" },
];

describe("ChipMultiSelect", () => {
  test("選択肢が無ければ空メッセージを表示する", () => {
    render(<ChipMultiSelect id="flavorIds" options={[]} selectedIds={[]} onToggle={vi.fn()} />);

    expect(screen.getByText("選択肢がありません")).toBeInTheDocument();
  });

  test("emptyMessageを渡すとそちらを優先する", () => {
    render(
      <ChipMultiSelect
        id="flavorIds"
        options={[]}
        selectedIds={[]}
        onToggle={vi.fn()}
        emptyMessage="カスタムメッセージ"
      />,
    );

    expect(screen.getByText("カスタムメッセージ")).toBeInTheDocument();
  });

  test("selectedIdsに含まれる項目だけチェック状態になる", () => {
    render(
      <ChipMultiSelect id="flavorIds" options={OPTIONS} selectedIds={["berry"]} onToggle={vi.fn()} />,
    );

    expect(screen.getByRole("checkbox", { name: "Berry" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Floral" })).not.toBeChecked();
  });

  test("未選択のチップをクリックするとそのidでonToggleが呼ばれる", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ChipMultiSelect id="flavorIds" options={OPTIONS} selectedIds={["berry"]} onToggle={onToggle} />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Citrus" }));

    expect(onToggle).toHaveBeenCalledWith("citrus");
  });

  test("選択済みのチップをクリックしても同じidでonToggleが呼ばれる（外す操作）", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <ChipMultiSelect id="flavorIds" options={OPTIONS} selectedIds={["berry"]} onToggle={onToggle} />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Berry" }));

    expect(onToggle).toHaveBeenCalledWith("berry");
  });

  test("disabledのときは全チェックボックスが操作不可になる", () => {
    render(
      <ChipMultiSelect
        id="flavorIds"
        options={OPTIONS}
        selectedIds={[]}
        onToggle={vi.fn()}
        disabled
      />,
    );

    for (const option of OPTIONS) {
      expect(screen.getByRole("checkbox", { name: option.name })).toBeDisabled();
    }
  });
});
