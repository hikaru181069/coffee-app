/**
 * GraphFilters.jsxのテスト。
 *
 * 2026-08、期間（dateFrom/dateTo）フィルターUIを追加した際に新設。
 * 中心的な確認事項は、各操作（記録タイプ・ノード種別・評価・期間）が
 * 正しくonChangeへ反映されるかどうか。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import GraphFilters from "./GraphFilters";

const DEFAULT_FILTERS = { nodeTypes: [], recordType: "", ratingMin: "", dateFrom: "", dateTo: "" };

describe("GraphFilters", () => {
  test("記録タイプのボタンを押すとrecordTypeが変わる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GraphFilters filters={DEFAULT_FILTERS} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "家で" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ recordType: "home" }));
  });

  test("ノード種別チップを押すとnodeTypesに追加される", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GraphFilters filters={DEFAULT_FILTERS} onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /産地/ }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nodeTypes: ["origin"] }));
  });

  test("すでに選択済みのノード種別を押すと外れる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <GraphFilters filters={{ ...DEFAULT_FILTERS, nodeTypes: ["origin", "flavor"] }} onChange={onChange} />,
    );

    await user.click(screen.getByRole("button", { name: /産地/ }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ nodeTypes: ["flavor"] }));
  });

  test("評価セレクトを変えるとratingMinが変わる", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GraphFilters filters={DEFAULT_FILTERS} onChange={onChange} />);

    await user.selectOptions(screen.getByLabelText("評価"), "4");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ ratingMin: "4" }));
  });

  test("開始日を変えるとdateFromが変わる", () => {
    const onChange = vi.fn();
    render(<GraphFilters filters={DEFAULT_FILTERS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("開始日"), { target: { value: "2026-01-01" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ dateFrom: "2026-01-01" }));
  });

  test("終了日を変えるとdateToが変わる", () => {
    const onChange = vi.fn();
    render(<GraphFilters filters={DEFAULT_FILTERS} onChange={onChange} />);

    fireEvent.change(screen.getByLabelText("終了日"), { target: { value: "2026-01-31" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ dateTo: "2026-01-31" }));
  });
});
