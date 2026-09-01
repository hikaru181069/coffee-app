/**
 * RatingInput.jsxのテスト。
 *
 * 見た目は星だが実体はradiogroup。未評価（""）を選べること、
 * クリアボタンの出し分け、disabled時の挙動を確認する。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RatingInput from "./RatingInput";

describe("RatingInput", () => {
  test("value=''のときは「未評価」と表示し、クリアボタンは出さない", () => {
    render(<RatingInput id="rating" value="" onChange={vi.fn()} />);

    expect(screen.getByText("未評価")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "クリア" })).not.toBeInTheDocument();
  });

  test("星をクリックするとonChangeへその点数が渡る", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RatingInput id="rating" value="" onChange={onChange} />);

    await user.click(screen.getByText("4"));

    expect(onChange).toHaveBeenCalledWith("4");
  });

  test("値が入っているときは「n / 5」表示とクリアボタンが出る", () => {
    render(<RatingInput id="rating" value="3" onChange={vi.fn()} />);

    expect(screen.getByText("3 / 5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "クリア" })).toBeInTheDocument();
  });

  test("クリアボタンを押すとonChangeに空文字が渡る", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<RatingInput id="rating" value="3" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "クリア" }));

    expect(onChange).toHaveBeenCalledWith("");
  });

  test("該当する点数のradioが選択状態になる", () => {
    render(<RatingInput id="rating" value="2" onChange={vi.fn()} />);

    const radios = screen.getAllByRole("radio");
    expect(radios[1]).toBeChecked();
    expect(radios[0]).not.toBeChecked();
    expect(radios[2]).not.toBeChecked();
  });

  test("disabledのときはクリアボタンを出さず、radioも無効化する", () => {
    render(<RatingInput id="rating" value="3" onChange={vi.fn()} disabled />);

    expect(screen.queryByRole("button", { name: "クリア" })).not.toBeInTheDocument();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio).toBeDisabled();
    }
  });
});
