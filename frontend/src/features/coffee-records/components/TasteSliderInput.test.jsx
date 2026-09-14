/**
 * TasteSliderInput.jsxのテスト。
 *
 * 実体は<input type="range" min={0} max={5}>。0は「未評価」専用の値
 * として扱う（RatingInput.test.jsxと同じ観点: 未評価表示・クリア相当の
 * 挙動・disabled時の状態）。range inputのドラッグ操作はuserEventでは
 * 表現しづらいため、値の変更はfireEvent.changeで行う（RTLで range
 * input をテストする一般的な方法）。
 */
import { describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import TasteSliderInput from "./TasteSliderInput";

describe("TasteSliderInput", () => {
  test("value=''のときはスライダーが0（未評価専用の位置）になり「未評価」と表示する", () => {
    render(<TasteSliderInput id="tasteSweetness" value="" onChange={vi.fn()} />);

    expect(screen.getByRole("slider")).toHaveValue("0");
    expect(screen.getByText("未評価")).toBeInTheDocument();
  });

  test("value='3'のときはスライダーが3になり「3 / 5」と表示する", () => {
    render(<TasteSliderInput id="tasteSweetness" value="3" onChange={vi.fn()} />);

    expect(screen.getByRole("slider")).toHaveValue("3");
    expect(screen.getByText("3 / 5")).toBeInTheDocument();
  });

  test("スライダーを4へ動かすとonChangeへ'4'が渡る", () => {
    const onChange = vi.fn();
    render(<TasteSliderInput id="tasteSweetness" value="" onChange={onChange} />);

    fireEvent.change(screen.getByRole("slider"), { target: { value: "4" } });

    expect(onChange).toHaveBeenCalledWith("4");
  });

  test("スライダーを0（左端）へ戻すとonChangeへ空文字が渡る（未評価に戻る）", () => {
    const onChange = vi.fn();
    render(<TasteSliderInput id="tasteSweetness" value="3" onChange={onChange} />);

    fireEvent.change(screen.getByRole("slider"), { target: { value: "0" } });

    expect(onChange).toHaveBeenCalledWith("");
  });

  test("disabledのときはスライダーが無効化される", () => {
    render(<TasteSliderInput id="tasteSweetness" value="3" onChange={vi.fn()} disabled />);

    expect(screen.getByRole("slider")).toBeDisabled();
  });
});
