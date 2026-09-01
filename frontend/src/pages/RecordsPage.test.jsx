/**
 * RecordsPage.jsxのテスト。
 *
 * 一覧の読み込み中・空状態・絞り込み結果なし・正常系と、記録タイプ
 * フィルターの配線、検索モードへの切り替えを確認する。フィルターの
 * 詳細な組み立てロジック自体はRecordFilters.test.jsxで検証済みのため、
 * ここでは「フィルターを変えるとfetchCoffeeRecordsへ正しく伝わるか」
 * という配線だけを見る。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const fetchCoffeeRecords = vi.fn();
vi.mock("../features/coffee-records/api/coffeeRecordApi", () => ({
  fetchCoffeeRecords: (...args) => fetchCoffeeRecords(...args),
}));

const fetchAllMasterData = vi.fn();
vi.mock("../features/coffee-records/api/masterDataApi", () => ({
  fetchAllMasterData: (...args) => fetchAllMasterData(...args),
}));

const fetchSearchResults = vi.fn();
vi.mock("../features/search/api/searchApi", () => ({
  fetchSearchResults: (...args) => fetchSearchResults(...args),
}));

import RecordsPage from "./RecordsPage";

const EMPTY_MASTER_DATA = { origins: [], varieties: [], processes: [], roastLevels: [], flavors: [] };

function renderRecordsPage() {
  return render(
    <MemoryRouter>
      <RecordsPage />
    </MemoryRouter>,
  );
}

describe("RecordsPage", () => {
  test("読み込み中はスケルトンを表示する", () => {
    fetchCoffeeRecords.mockReturnValue(new Promise(() => {}));
    fetchAllMasterData.mockResolvedValue(EMPTY_MASTER_DATA);

    renderRecordsPage();

    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("記録が0件・絞り込み無しなら空状態を表示する", async () => {
    fetchCoffeeRecords.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, totalPages: 1 } });
    fetchAllMasterData.mockResolvedValue(EMPTY_MASTER_DATA);

    renderRecordsPage();

    expect(await screen.findByText("まだ記録がありません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "最初の記録をつくる" })).toBeInTheDocument();
  });

  test("記録があれば一覧を件数とともに表示する", async () => {
    fetchCoffeeRecords.mockResolvedValue({
      data: [
        { id: "1", title: "Ethiopia Guji Natural", rating: 4, origin: null, process: null, flavors: [] },
        { id: "2", title: "Kenya Nyeri AA", rating: 5, origin: null, process: null, flavors: [] },
      ],
      pagination: { total: 2, page: 1, totalPages: 1 },
    });
    fetchAllMasterData.mockResolvedValue(EMPTY_MASTER_DATA);

    renderRecordsPage();

    expect(await screen.findByText("Ethiopia Guji Natural")).toBeInTheDocument();
    expect(screen.getByText("Kenya Nyeri AA")).toBeInTheDocument();
    expect(screen.getByText("2 件の記録")).toBeInTheDocument();
  });

  test("recordTypeフィルターを変えると絞り込み結果無しの状態を出し分ける", async () => {
    fetchCoffeeRecords.mockResolvedValue({ data: [], pagination: { total: 0, page: 1, totalPages: 1 } });
    fetchAllMasterData.mockResolvedValue(EMPTY_MASTER_DATA);
    const user = userEvent.setup();

    renderRecordsPage();
    await screen.findByText("まだ記録がありません");

    await user.click(screen.getByRole("button", { name: "家で" }));

    await waitFor(() =>
      expect(fetchCoffeeRecords).toHaveBeenLastCalledWith(
        expect.objectContaining({ recordType: "home" }),
        expect.anything(),
      ),
    );
    expect(await screen.findByText("条件に合う記録がありません")).toBeInTheDocument();
  });

  test("検索ボックスに入力すると検索結果表示へ切り替わる", async () => {
    fetchCoffeeRecords.mockResolvedValue({
      data: [{ id: "1", title: "Ethiopia Guji Natural", rating: 4, origin: null, process: null, flavors: [] }],
      pagination: { total: 1, page: 1, totalPages: 1 },
    });
    fetchAllMasterData.mockResolvedValue(EMPTY_MASTER_DATA);
    fetchSearchResults.mockResolvedValue({ entities: [], entitiesTruncated: false, records: [] });
    const user = userEvent.setup();

    renderRecordsPage();
    await screen.findByText("Ethiopia Guji Natural");

    await user.type(screen.getByPlaceholderText(/産地・品種・フレーバー/), "ethiopia");

    await waitFor(() => expect(fetchSearchResults).toHaveBeenCalled());
  });
});
