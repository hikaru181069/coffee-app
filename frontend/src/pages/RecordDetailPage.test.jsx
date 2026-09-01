/**
 * RecordDetailPage.jsxのテスト。
 *
 * 読み込み中・404・その他エラー・詳細が何も無い場合の空状態・
 * 正常系（Coffee Information・Notes・味覚グラフ/Connections・削除フロー）
 * を確認する。SimilarRecords・BrewDetailsCardは独立した機能
 * （それぞれ専用のテストファイルで別途検証済み）のためスタブに差し替える。
 * TasteRadarChart・RecordConnectionsDiagramは軽量な自前SVGでこのページの
 * 構成確認に必要なため実装をそのまま使う。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import { ToastProvider } from "../contexts/ToastContext";

const fetchCoffeeRecord = vi.fn();
const deleteCoffeeRecord = vi.fn();
vi.mock("../features/coffee-records/api/coffeeRecordApi", () => ({
  fetchCoffeeRecord: (...args) => fetchCoffeeRecord(...args),
  deleteCoffeeRecord: (...args) => deleteCoffeeRecord(...args),
}));

vi.mock("../features/similarRecords/components/SimilarRecords", () => ({
  default: () => <div>SimilarRecordsスタブ</div>,
}));

vi.mock("../features/coffee-records/components/BrewDetailsCard", () => ({
  default: () => <div>BrewDetailsCardスタブ</div>,
}));

import RecordDetailPage from "./RecordDetailPage";

const BASE_RECORD = {
  id: "r1",
  title: "Ethiopia Guji Natural",
  consumedAt: "2026-07-20T00:00:00.000Z",
  recordType: "home",
  rating: 4,
  notes: "",
  cafeName: "",
  origin: null,
  farmName: "",
  varieties: [],
  process: null,
  roastLevel: null,
  roasterName: "",
  flavors: [],
  tasteSweetness: null,
  tasteBitterness: null,
  tasteAcidity: null,
  tasteBody: null,
  tasteAroma: null,
  tasteAftertaste: null,
};

const FULL_RECORD = {
  ...BASE_RECORD,
  notes: "華やかでベリーのような香り。",
  origin: { id: "o1", name: "Ethiopia" },
  process: { id: "p1", name: "Natural" },
  roastLevel: { id: "rl1", name: "Light" },
  flavors: [{ id: "f1", name: "Berry" }],
  tasteAcidity: 4,
};

function renderRecordDetailPage(recordId = "r1") {
  return render(
    <MemoryRouter initialEntries={[`/records/${recordId}`]}>
      <ToastProvider>
        <Routes>
          <Route path="/records/:recordId" element={<RecordDetailPage />} />
        </Routes>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("RecordDetailPage", () => {
  test("読み込み中はスケルトンを表示する", () => {
    fetchCoffeeRecord.mockReturnValue(new Promise(() => {}));
    renderRecordDetailPage();

    expect(screen.getByLabelText("読み込み中...")).toBeInTheDocument();
  });

  test("404の場合は記録が見つからない旨を表示する", async () => {
    fetchCoffeeRecord.mockRejectedValue({ name: "ApiError", isNotFound: true });
    renderRecordDetailPage();

    expect(await screen.findByText("記録が見つかりません")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "一覧へ戻る" })).toHaveAttribute("href", "/records");
  });

  test("404以外のエラーはエラー状態を表示する", async () => {
    fetchCoffeeRecord.mockRejectedValue(new Error("読み込みエラー"));
    renderRecordDetailPage();

    expect(await screen.findByText("読み込みエラー")).toBeInTheDocument();
  });

  test("コーヒー情報が何も無い記録では空状態のヒントを表示する", async () => {
    fetchCoffeeRecord.mockResolvedValue(BASE_RECORD);
    renderRecordDetailPage();

    expect(
      await screen.findByText("産地やフレーバーを追加すると、ほかの記録とのつながりが見えるようになります。"),
    ).toBeInTheDocument();
  });

  test("BrewDetailsCardは他のCoffee情報の有無に関わらず常に表示する", async () => {
    fetchCoffeeRecord.mockResolvedValue(BASE_RECORD);
    renderRecordDetailPage();

    expect(await screen.findByText("BrewDetailsCardスタブ")).toBeInTheDocument();
  });

  test("記録の詳細（タイトル・評価・Coffee Information・メモ・Connections）を表示する", async () => {
    fetchCoffeeRecord.mockResolvedValue(FULL_RECORD);
    renderRecordDetailPage();

    expect(await screen.findByRole("heading", { name: "Ethiopia Guji Natural" })).toBeInTheDocument();
    expect(screen.getByText("コーヒーの詳細")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ethiopia" })).toHaveAttribute("href", "/entities/origin%3Ao1");
    expect(screen.getByText("メモ")).toBeInTheDocument();
    expect(screen.getByText("華やかでベリーのような香り。")).toBeInTheDocument();
    expect(screen.getByText("つながり")).toBeInTheDocument();
    expect(screen.getByText("味覚グラフ")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /グラフで見る/ })).toHaveAttribute("href", "/graph?focus=record:r1");
    expect(screen.getByRole("link", { name: /地図で見る/ })).toHaveAttribute("href", "/map");
    expect(screen.getByText("SimilarRecordsスタブ")).toBeInTheDocument();
  });

  test("産地が無い記録では地図で見るリンクを表示しない", async () => {
    fetchCoffeeRecord.mockResolvedValue({ ...FULL_RECORD, origin: null });
    renderRecordDetailPage();

    await screen.findByRole("heading", { name: "Ethiopia Guji Natural" });
    expect(screen.queryByRole("link", { name: /地図で見る/ })).not.toBeInTheDocument();
  });

  test("その他メニューから削除確認ダイアログを開き、確定すると削除して一覧へ戻る", async () => {
    fetchCoffeeRecord.mockResolvedValue(FULL_RECORD);
    deleteCoffeeRecord.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderRecordDetailPage();
    await screen.findByRole("heading", { name: "Ethiopia Guji Natural" });

    await user.click(screen.getByRole("button", { name: "その他の操作" }));
    await user.click(screen.getByRole("menuitem", { name: "削除" }));

    expect(await screen.findByText("この記録を削除しますか？")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "削除する" }));

    expect(deleteCoffeeRecord).toHaveBeenCalledWith("r1");
  });
});
