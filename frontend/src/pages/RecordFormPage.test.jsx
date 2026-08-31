/**
 * RecordFormPage.jsxのテスト。
 *
 * 中心的な確認事項は「保存忘れ確認」（useBlocker）: 未保存の変更がある
 * 状態でアプリ内ナビゲーションを試みると確認ダイアログで止まり、
 * 「破棄する」で初めて遷移が進むこと。useBlockerはデータルーター
 * （createBrowserRouter/createMemoryRouter）でしか動作しないため、
 * router.jsxの本番設定と同じ考え方でcreateMemoryRouterを使う
 * （このリポジトリで最初のルーター込みテスト）。
 *
 * 記録の取得（useCoffeeRecord）・マスターデータ取得（useMasterData）は
 * それぞれfetchCoffeeRecord/fetchAllMasterDataというAPI関数だけに依存する
 * ため、フックそのものではなくAPI層をモックする（実装の詳細に依存しすぎない）。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route, RouterProvider, createMemoryRouter, createRoutesFromElements } from "react-router-dom";

import { ToastProvider } from "../contexts/ToastContext";

vi.mock("../features/coffee-records/api/masterDataApi", () => ({
  fetchAllMasterData: vi.fn().mockResolvedValue({
    origins: [],
    varieties: [],
    processes: [],
    roastLevels: [],
    flavors: [],
  }),
}));

const createCoffeeRecord = vi.fn();
vi.mock("../features/coffee-records/api/coffeeRecordApi", () => ({
  createCoffeeRecord: (...args) => createCoffeeRecord(...args),
  updateCoffeeRecord: vi.fn(),
  fetchCoffeeRecord: vi.fn(),
}));

import RecordFormPage from "./RecordFormPage";

/** router.jsxの本番構成を、このテストに必要な範囲だけ縮小したもの */
const renderAtNewRecordForm = () => {
  const router = createMemoryRouter(
    createRoutesFromElements(
      <>
        <Route path="/records/new" element={<RecordFormPage />} />
        <Route path="/records" element={<p>Records List Page</p>} />
        <Route path="/records/:recordId" element={<p>Record Detail Page</p>} />
      </>,
    ),
    { initialEntries: ["/records/new"] },
  );

  render(
    <ToastProvider>
      <RouterProvider router={router} />
    </ToastProvider>,
  );
};

describe("RecordFormPage（保存忘れ確認）", () => {
  test("変更が無い状態で戻ると、確認無しに遷移する", async () => {
    const user = userEvent.setup();
    renderAtNewRecordForm();

    await user.click(await screen.findByRole("button", { name: /戻る/ }));

    expect(await screen.findByText("Records List Page")).toBeInTheDocument();
  });

  test("未保存の変更がある状態で戻ろうとすると確認ダイアログが出て、編集を続けるを選ぶと遷移しない", async () => {
    const user = userEvent.setup();
    renderAtNewRecordForm();

    await user.type(await screen.findByLabelText(/^タイトル/), "とりあえず買った豆");
    await user.click(screen.getByRole("button", { name: /戻る/ }));

    expect(await screen.findByText("変更を破棄しますか？")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "編集を続ける" }));

    expect(screen.queryByText("変更を破棄しますか？")).not.toBeInTheDocument();
    // ダイアログを閉じただけで遷移はしておらず、フォームの入力も保持されている
    expect(screen.getByLabelText(/^タイトル/)).toHaveValue("とりあえず買った豆");
  });

  test("未保存の変更がある状態で「破棄する」を選ぶと、確認していた遷移先へ進む", async () => {
    const user = userEvent.setup();
    renderAtNewRecordForm();

    await user.type(await screen.findByLabelText(/^タイトル/), "とりあえず買った豆");
    await user.click(screen.getByRole("button", { name: /戻る/ }));

    await user.click(await screen.findByRole("button", { name: "破棄する" }));

    expect(await screen.findByText("Records List Page")).toBeInTheDocument();
  });

  test("保存に成功すると確認無しに詳細ページへ遷移する（justSavedRefによるスキップ）", async () => {
    createCoffeeRecord.mockResolvedValue({ id: "new-record-id" });
    const user = userEvent.setup();
    renderAtNewRecordForm();

    await user.type(await screen.findByLabelText(/^タイトル/), "とりあえず買った豆");
    await user.click(screen.getByRole("button", { name: "記録する" }));

    await waitFor(() => expect(createCoffeeRecord).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("Record Detail Page")).toBeInTheDocument();
    expect(screen.queryByText("変更を破棄しますか？")).not.toBeInTheDocument();
  });
});
