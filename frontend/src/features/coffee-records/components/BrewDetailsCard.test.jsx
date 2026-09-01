/**
 * BrewDetailsCard.jsxのテスト。
 *
 * 記録編集フォーム（RecordForm.jsx）とは独立した、記録詳細ページ専用の
 * カード。空状態→編集モードへの遷移、閲覧モードでのレシオ計算表示、
 * pours行の追加削除、保存成功時の表示更新、キャンセル時の変更破棄を
 * 確認する。
 */
import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const updateCoffeeRecord = vi.fn();
vi.mock("../api/coffeeRecordApi", () => ({
  updateCoffeeRecord: (...args) => updateCoffeeRecord(...args),
}));

import BrewDetailsCard from "./BrewDetailsCard";

const EMPTY_RECORD = {
  id: "r1",
  doseWeight: null,
  waterWeight: null,
  brewTimeSeconds: null,
  pours: [],
};

const FULL_RECORD = {
  id: "r1",
  doseWeight: 18,
  waterWeight: 280,
  brewTimeSeconds: 150,
  pours: [
    { elapsedSeconds: 0, cumulativeWaterWeight: 50 },
    { elapsedSeconds: 45, cumulativeWaterWeight: 280 },
  ],
};

describe("BrewDetailsCard", () => {
  beforeEach(() => {
    updateCoffeeRecord.mockReset();
  });

  test("抽出データが無ければ空状態と記録ボタンを表示する", () => {
    render(<BrewDetailsCard record={EMPTY_RECORD} />);

    expect(screen.getByText("まだ抽出データがありません")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "抽出データを記録する" })).toBeInTheDocument();
  });

  test("空状態のボタンを押すと編集モードになる", async () => {
    const user = userEvent.setup();
    render(<BrewDetailsCard record={EMPTY_RECORD} />);

    await user.click(screen.getByRole("button", { name: "抽出データを記録する" }));

    expect(screen.getByLabelText(/粉量/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "＋注湯を追加" })).toBeInTheDocument();
  });

  test("閲覧モードで粉量・湯量・レシオ・抽出時間・注湯記録を表示する", () => {
    render(<BrewDetailsCard record={FULL_RECORD} />);

    expect(screen.getByText("18")).toBeInTheDocument();
    expect(screen.getByText("280")).toBeInTheDocument();
    expect(screen.getByText("1 : 15.6")).toBeInTheDocument();
    expect(screen.getByText("2:30")).toBeInTheDocument();
    expect(screen.getByText("0:00 – 50g")).toBeInTheDocument();
    expect(screen.getByText("0:45 – 280g")).toBeInTheDocument();
  });

  test("注湯の行を追加・削除できる", async () => {
    const user = userEvent.setup();
    render(<BrewDetailsCard record={EMPTY_RECORD} />);

    await user.click(screen.getByRole("button", { name: "抽出データを記録する" }));
    await user.click(screen.getByRole("button", { name: "＋注湯を追加" }));

    expect(screen.getByRole("button", { name: "1回目の注湯を削除" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "1回目の注湯を削除" }));

    expect(screen.queryByRole("button", { name: "1回目の注湯を削除" })).not.toBeInTheDocument();
  });

  test("保存に成功すると閲覧モードへ戻り、最新の値を表示する", async () => {
    updateCoffeeRecord.mockResolvedValue(FULL_RECORD);
    const user = userEvent.setup();
    render(<BrewDetailsCard record={EMPTY_RECORD} />);

    await user.click(screen.getByRole("button", { name: "抽出データを記録する" }));
    await user.type(screen.getByLabelText(/粉量/), "18");
    await user.type(screen.getByLabelText(/総湯量/), "280");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("1 : 15.6")).toBeInTheDocument();
    expect(updateCoffeeRecord).toHaveBeenCalledWith(
      "r1",
      expect.objectContaining({ doseWeight: 18, waterWeight: 280 }),
    );
  });

  test("キャンセルすると変更を破棄して閲覧モードへ戻る", async () => {
    const user = userEvent.setup();
    render(<BrewDetailsCard record={EMPTY_RECORD} />);

    await user.click(screen.getByRole("button", { name: "抽出データを記録する" }));
    await user.type(screen.getByLabelText(/粉量/), "18");
    await user.click(screen.getByRole("button", { name: "キャンセル" }));

    expect(screen.getByText("まだ抽出データがありません")).toBeInTheDocument();
    expect(updateCoffeeRecord).not.toHaveBeenCalled();
  });
});
