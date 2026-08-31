/**
 * RecordFilters.jsxのテスト。
 *
 * 2026-08、産地・品種・精製方法・焙煎度・フレーバーの複数選択と
 * 期間フィルターを追加した際に新設。中心的な確認事項は、詳細フィルター
 * （段階的開示）の開閉と、複数選択チップの追加・削除が正しく
 * onChangeへ反映されるかどうか。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RecordFilters from "./RecordFilters";

const MASTER_DATA = {
  origins: [
    { id: "origin-1", name: "Ethiopia" },
    { id: "origin-2", name: "Kenya" },
  ],
  varieties: [],
  processes: [],
  roastLevels: [],
  flavors: [{ id: "flavor-1", name: "Berry" }],
};

const DEFAULT_FILTERS = {
  page: 1,
  limit: 20,
  recordType: "",
  originIds: [],
  varietyIds: [],
  processIds: [],
  roastLevelIds: [],
  flavorIds: [],
  ratingMin: "",
  dateFrom: "",
  dateTo: "",
};

describe("RecordFilters", () => {
  test("記録タイプのボタンを押すとrecordTypeが変わり、pageが1へリセットされる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RecordFilters
        filters={{ ...DEFAULT_FILTERS, page: 3 }}
        onChange={onChange}
        onClear={vi.fn()}
        masterData={MASTER_DATA}
        hasActiveFilters={false}
      />,
    );

    await user.click(screen.getByRole("button", { name: "家で" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ recordType: "home", page: 1 }),
    );
  });

  test("詳細フィルターは初期状態で閉じており、クリックで開閉できる", async () => {
    const user = userEvent.setup();
    render(
      <RecordFilters
        filters={DEFAULT_FILTERS}
        onChange={vi.fn()}
        onClear={vi.fn()}
        masterData={MASTER_DATA}
        hasActiveFilters={false}
      />,
    );

    const toggle = screen.getByRole("button", { name: /詳細フィルター/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("checkbox", { name: "Ethiopia" })).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("checkbox", { name: "Ethiopia" })).toBeInTheDocument();
  });

  test("既にアクティブな詳細フィルターがあれば初期状態で開いている", () => {
    render(
      <RecordFilters
        filters={{ ...DEFAULT_FILTERS, originIds: ["origin-1"] }}
        onChange={vi.fn()}
        onClear={vi.fn()}
        masterData={MASTER_DATA}
        hasActiveFilters
      />,
    );

    expect(screen.getByRole("button", { name: /詳細フィルター/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  test("産地のチップを選ぶとoriginIdsへ追加される（複数選択）", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RecordFilters
        filters={{ ...DEFAULT_FILTERS, originIds: ["origin-1"] }}
        onChange={onChange}
        onClear={vi.fn()}
        masterData={MASTER_DATA}
        hasActiveFilters
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Kenya" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ originIds: ["origin-1", "origin-2"] }),
    );
  });

  test("選択済みの産地チップをもう一度選ぶと外れる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <RecordFilters
        filters={{ ...DEFAULT_FILTERS, originIds: ["origin-1", "origin-2"] }}
        onChange={onChange}
        onClear={vi.fn()}
        masterData={MASTER_DATA}
        hasActiveFilters
      />,
    );

    await user.click(screen.getByRole("checkbox", { name: "Ethiopia" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ originIds: ["origin-2"] }));
  });

  test("アクティブなフィルター件数が詳細フィルターボタンにバッジ表示される", () => {
    render(
      <RecordFilters
        filters={{ ...DEFAULT_FILTERS, originIds: ["origin-1"], dateFrom: "2026-01-01" }}
        onChange={vi.fn()}
        onClear={vi.fn()}
        masterData={MASTER_DATA}
        hasActiveFilters
      />,
    );

    // originIds(1件) + dateFrom(1件) = 2
    expect(screen.getByRole("button", { name: /詳細フィルター/ })).toHaveTextContent("2");
  });

  test("hasActiveFiltersがtrueのときだけ「絞り込みを解除」ボタンを表示し、押すとonClearが呼ばれる", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const { rerender } = render(
      <RecordFilters
        filters={DEFAULT_FILTERS}
        onChange={vi.fn()}
        onClear={onClear}
        masterData={MASTER_DATA}
        hasActiveFilters={false}
      />,
    );
    expect(screen.queryByText("絞り込みを解除")).not.toBeInTheDocument();

    rerender(
      <RecordFilters
        filters={{ ...DEFAULT_FILTERS, recordType: "home" }}
        onChange={vi.fn()}
        onClear={onClear}
        masterData={MASTER_DATA}
        hasActiveFilters
      />,
    );
    await user.click(screen.getByText("絞り込みを解除"));

    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
