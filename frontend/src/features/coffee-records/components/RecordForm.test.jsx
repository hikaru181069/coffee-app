/**
 * RecordForm.jsxのテスト。
 *
 * このコンポーネント自体は状態を持たない（Coffee Detailsの開閉を除く）ため、
 * useRecordFormと組み合わせた小さなHarnessで、実際にRecordFormPage.jsxが
 * 行っているのと同じ配線（values/errors/setValue/onSubmit=form.submit）で
 * レンダーする。フィールドを1つ1つモックするより、実際の使われ方に近い
 * 形で「主要な正常系・重要な異常系」（CLAUDE.mdのテスト方針）を検証できる。
 */
import { useEffect } from "react";
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RecordForm from "./RecordForm";
import { useRecordForm } from "../hooks/useRecordForm";

const EMPTY_MASTER_DATA = {
  origins: [],
  varieties: [],
  processes: [],
  roastLevels: [],
  flavors: [],
};

/**
 * prefillRoasterName: マウント直後に強制的にroasterNameへ121文字を
 * 入れる。「Coffee Detailsを開かないまま、隠れた項目でエラーが出た
 * 場合に自動で開く」（RecordForm.jsxのhasHiddenError）を、実際に
 * ユーザーが未入力のまま開いていない状態から検証するためのテスト専用の
 * 抜け道（本来のユーザー操作では起こらない、DOM外からの直接書き込み）。
 */
function Harness({
  onSubmit = vi.fn(),
  record = null,
  prefillRoasterName = false,
  prefillOriginId = null,
}) {
  const form = useRecordForm(record, onSubmit, prefillOriginId);

  useEffect(() => {
    if (prefillRoasterName) form.setValue("roasterName", "a".repeat(121));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <RecordForm
      values={form.values}
      errors={form.errors}
      submitError={form.submitError}
      isSubmitting={form.isSubmitting}
      setValue={form.setValue}
      toggleValue={form.toggleValue}
      onSubmit={form.submit}
      onCancel={vi.fn()}
      masterData={EMPTY_MASTER_DATA}
      isMasterDataLoading={false}
      masterDataError={null}
      submitLabel="保存する"
      prefillOriginId={prefillOriginId}
    />
  );
}

describe("RecordForm", () => {
  test("必須項目とhome/cafeの切り替えが表示され、初期状態はhomeで店名欄が無い", () => {
    render(<Harness />);

    expect(screen.getByLabelText(/^タイトル/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^飲んだ日時/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "家で" })).toBeChecked();
    expect(screen.queryByLabelText(/^店名/)).not.toBeInTheDocument();
  });

  test("記録タイプをカフェに切り替えると店名欄が表示される", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("radio", { name: "カフェで" }));

    expect(screen.getByLabelText(/^店名/)).toBeInTheDocument();
  });

  test("Coffee Detailsは新規作成では初期状態で閉じており、クリックで開閉できる", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const toggle = screen.getByRole("button", { name: /コーヒーの詳細/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByLabelText(/^焙煎者・ロースター/)).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/^焙煎者・ロースター/)).toBeInTheDocument();
  });

  test("タイトルが空のまま送信すると必須エラーが表示され、onSubmitは呼ばれない", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ id: "1" });
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("タイトルを入力してください")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("Coffee Detailsを開いていなくても、隠れた項目にエラーがあれば自動的に開く", async () => {
    const user = userEvent.setup();
    render(<Harness prefillRoasterName />);

    // 送信前はまだ閉じたまま（バリデーションはsubmit時にしか走らないため）
    const toggle = screen.getByRole("button", { name: /コーヒーの詳細/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByLabelText(/^焙煎者・ロースター/)).toBeInTheDocument();
  });

  test("Discoverからの産地事前入力（prefillOriginId）が後から届くと、Coffee Detailsが自動的に開く", () => {
    const { rerender } = render(<Harness prefillOriginId={null} />);

    const toggle = screen.getByRole("button", { name: /コーヒーの詳細/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");

    // masterData読み込み待ちで、originNameの解決が後から届く想定
    // （RecordFormPage.jsxのuseMemo経由）を再レンダーで再現する
    rerender(<Harness prefillOriginId="origin-123" />);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
  });

  test("送信中は保存ボタンが無効化され「保存中...」と表示される", async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    const onSubmit = vi.fn(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<Harness onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/^タイトル/), "とりあえず買った豆");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByRole("button", { name: /保存中/ })).toBeDisabled();

    resolveSubmit({ id: "1" });
  });
});
