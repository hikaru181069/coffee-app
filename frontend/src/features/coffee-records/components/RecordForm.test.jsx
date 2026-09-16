/**
 * RecordForm.jsx（コーヒーキャンバス）のテスト。
 *
 * このコンポーネント自体は状態を持たない（発見バッジの一時状態を除く）ため、
 * useRecordFormと組み合わせた小さなHarnessで、実際にRecordFormPage.jsxが
 * 行っているのと同じ配線でレンダーする。フィールドを1つ1つモックするより、
 * 実際の使われ方に近い形で「主要な正常系・重要な異常系」
 * （CLAUDE.mdのテスト方針）を検証できる。
 *
 * 2026-09、記録体験の作り直し（コーヒーキャンバス）にあわせて全面書き換え。
 * フレーバー・農園・品種・精製方法・焙煎度・ロースター名・店名・メモは
 * PropertyButton（小さいボタン＋クリックで開くポップオーバー）になった。
 * 産地バッジ・味覚レーダー（キーボード操作）・ブレンド追加とあわせて
 * 検証する。
 *
 * useRecordForm自体がAPI（createCoffeeRecord/updateCoffeeRecord）を呼ぶため、
 * ここではそのAPIモジュールをモックする。
 */
import { useCallback } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import RecordForm from "./RecordForm";
import { useRecordForm } from "../hooks/useRecordForm";
import { createCoffeeRecord } from "../api/coffeeRecordApi";
import { previewOriginDiscovery } from "../api/discoveriesApi";

vi.mock("../api/coffeeRecordApi", () => ({
  createCoffeeRecord: vi.fn(),
  updateCoffeeRecord: vi.fn(),
}));

// 産地バッジを選んだときに呼ばれる（保存前の発見プレビュー）。
// この画面の主目的（記録フォームの操作）とは無関係なので、
// 何も発見が無い状態を既定にする（個別のテストで上書きする）
vi.mock("../api/discoveriesApi", () => ({
  previewOriginDiscovery: vi.fn().mockResolvedValue({ discoveries: [] }),
}));

afterEach(() => {
  vi.clearAllMocks();
  createCoffeeRecord.mockResolvedValue({ record: { id: "1" }, discoveries: [] });
  previewOriginDiscovery.mockResolvedValue({ discoveries: [] });
});
createCoffeeRecord.mockResolvedValue({ record: { id: "1" }, discoveries: [] });

const MASTER_DATA_WITH_ORIGINS = {
  origins: [
    { id: "origin-eth", name: "Ethiopia", countryCode: "ET" },
    { id: "origin-ken", name: "Kenya", countryCode: "KE" },
  ],
  varieties: [],
  processes: [],
  roastLevels: [],
  flavors: [],
};

const EMPTY_MASTER_DATA = {
  origins: [],
  varieties: [],
  processes: [],
  roastLevels: [],
  flavors: [],
};

/**
 * onSubmit: 送信が成功（バリデーション・API呼び出しの両方を通過）した
 * ときだけ、保存された記録付きで呼ばれる。RecordFormPage.jsxの
 * handleFormSubmitと同じ「form.submit()を呼び、truthyな戻り値のときだけ
 * 反応する」という薄いラッパー経由で配線する。
 */
function Harness({ onSubmit = vi.fn(), record = null, masterData = EMPTY_MASTER_DATA }) {
  const form = useRecordForm(record);

  const handleSubmit = useCallback(async () => {
    const saved = await form.submit();
    if (saved) onSubmit(saved);
  }, [form, onSubmit]);

  return (
    <RecordForm
      values={form.values}
      errors={form.errors}
      submitError={form.submitError}
      isSubmitting={form.isSubmitting}
      setValue={form.setValue}
      validateField={form.validateField}
      toggleValue={form.toggleValue}
      addComponent={form.addComponent}
      removeComponent={form.removeComponent}
      setComponentValue={form.setComponentValue}
      toggleComponentValue={form.toggleComponentValue}
      setPrimaryComponentValue={form.setPrimaryComponentValue}
      togglePrimaryComponentVariety={form.togglePrimaryComponentVariety}
      onSubmit={handleSubmit}
      onCancel={vi.fn()}
      masterData={masterData}
      isMasterDataLoading={false}
      masterDataError={null}
      submitLabel="保存する"
    />
  );
}

describe("RecordForm", () => {
  test("必須項目とhome/cafeの切り替えが表示され、初期状態はhomeで店名欄が無い", () => {
    render(<Harness />);

    expect(screen.getByLabelText(/^タイトル/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^飲んだ日時/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "家で" })).toBeChecked();
    expect(screen.queryByRole("button", { name: /店名/ })).not.toBeInTheDocument();
  });

  test("記録タイプをカフェに切り替えると店名のプロパティボタンが表示される", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("radio", { name: "カフェで" }));

    expect(screen.getByRole("button", { name: /店名/ })).toBeInTheDocument();
  });

  test("コーヒーの詳細はプロパティボタンとして常時表示され、クリックすると編集できる", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    // 産地・味覚以外の任意項目は、値の有無に関わらずボタンとして並ぶ
    expect(screen.getByRole("button", { name: /^農園/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^焙煎度/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ロースター/ })).toBeInTheDocument();

    // クリックするとその場にポップオーバーが開き、中の入力欄が使える
    await user.click(screen.getByRole("button", { name: /^農園/ }));
    const farmInput = await screen.findByLabelText(/^農園/);
    await user.type(farmInput, "Konga Washing Station");

    // 入力した値がボタン自体の表示にも反映される
    expect(screen.getByRole("button", { name: /Konga Washing Station/ })).toBeInTheDocument();
  });

  test("タイトルが空のまま送信すると必須エラーが表示され、onSubmitは呼ばれない", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn().mockResolvedValue({ id: "1" });
    render(<Harness onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("タイトルを入力してください")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  test("産地バッジを選ぶと選択状態になり、保存前の発見プレビューが呼ばれる", async () => {
    const user = userEvent.setup();
    previewOriginDiscovery.mockResolvedValue({
      discoveries: [{ type: "firstAppearance", nodeType: "origin", nodeId: "origin:origin-eth", label: "Ethiopia", recordCount: 1 }],
    });
    render(<Harness masterData={MASTER_DATA_WITH_ORIGINS} />);

    await user.click(screen.getByRole("radio", { name: "Ethiopia" }));

    expect(screen.getByRole("radio", { name: "Ethiopia" })).toBeChecked();
    expect(previewOriginDiscovery).toHaveBeenCalledWith("origin-eth");
    expect(await screen.findByRole("status")).toHaveTextContent("初めての記録になります");
  });

  test("味覚レーダーの頂点は矢印キーで値を変更できる", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const sweetness = screen.getByRole("slider", { name: "甘み" });
    expect(sweetness).toHaveAttribute("aria-valuenow", "0");

    sweetness.focus();
    await user.keyboard("{ArrowUp}{ArrowUp}");

    expect(sweetness).toHaveAttribute("aria-valuenow", "2");

    await user.keyboard("{ArrowDown}");
    expect(sweetness).toHaveAttribute("aria-valuenow", "1");

    await user.keyboard("{End}");
    expect(sweetness).toHaveAttribute("aria-valuenow", "5");

    await user.keyboard("{Home}");
    expect(sweetness).toHaveAttribute("aria-valuenow", "0");
  });

  test("「＋ブレンドを追加」で2グループ目が表示され、削除ボタンで消える", async () => {
    const user = userEvent.setup();
    render(<Harness masterData={MASTER_DATA_WITH_ORIGINS} />);

    expect(screen.queryByText("コーヒー2")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /ブレンドを追加/ }));
    expect(screen.getByText("コーヒー2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "削除" }));
    expect(screen.queryByText("コーヒー2")).not.toBeInTheDocument();
  });

  test("送信中は保存ボタンが無効化され「保存中...」と表示される", async () => {
    const user = userEvent.setup();
    let resolveSubmit;
    createCoffeeRecord.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSubmit = resolve;
        }),
    );
    render(<Harness />);

    await user.type(screen.getByLabelText(/^タイトル/), "とりあえず買った豆");
    await user.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByRole("button", { name: /保存中/ })).toBeDisabled();

    resolveSubmit({ record: { id: "1" }, discoveries: [] });
  });
});
