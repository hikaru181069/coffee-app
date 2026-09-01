/**
 * RecordCard.jsxのテスト。
 *
 * 一覧に並ぶ記録カードが、日付・タイプ・評価・産地・タグ（精製方法・
 * フレーバー最大3件+超過件数）を正しく出し分けるかを確認する。
 */
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import RecordCard from "./RecordCard";

const BASE_RECORD = {
  id: "1",
  title: "Ethiopia Guji Natural",
  consumedAt: "2026-07-15T09:00:00.000Z",
  recordType: "home",
  rating: null,
  cafeName: "",
  origin: null,
  process: null,
  flavors: [],
};

function renderCard(record) {
  return render(
    <MemoryRouter>
      <ul>
        <RecordCard record={record} />
      </ul>
    </MemoryRouter>,
  );
}

describe("RecordCard", () => {
  test("タイトルを表示し、記録詳細へのリンクになる", () => {
    renderCard(BASE_RECORD);

    expect(screen.getByText("Ethiopia Guji Natural")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ethiopia Guji Natural" })).toHaveAttribute(
      "href",
      "/records/1",
    );
  });

  test("ratingがあれば評価バッジを表示する", () => {
    renderCard({ ...BASE_RECORD, rating: 4 });
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  test("ratingがnullなら評価バッジを表示しない", () => {
    const { container } = renderCard(BASE_RECORD);
    expect(container.querySelector(".text-warn")).not.toBeInTheDocument();
  });

  test("originがあれば産地名とエンティティ詳細へのリンクを表示する", () => {
    renderCard({ ...BASE_RECORD, origin: { id: "o1", name: "Ethiopia" } });

    expect(screen.getByRole("link", { name: "Ethiopia" })).toHaveAttribute(
      "href",
      "/entities/origin%3Ao1",
    );
  });

  test("recordType='cafe'かつcafeNameがあれば店名を表示する", () => {
    renderCard({ ...BASE_RECORD, recordType: "cafe", cafeName: "Onibus Coffee" });

    expect(screen.getByText("Onibus Coffee")).toBeInTheDocument();
  });

  test("processとflavorsはタグとして最大3件まで表示し、超過分は件数表示にする", () => {
    renderCard({
      ...BASE_RECORD,
      process: { id: "p1", name: "Washed" },
      flavors: [
        { id: "f1", name: "Berry" },
        { id: "f2", name: "Floral" },
        { id: "f3", name: "Citrus" },
        { id: "f4", name: "Honey" },
      ],
    });

    expect(screen.getByRole("link", { name: /Washed/ })).toHaveAttribute(
      "href",
      "/entities/process%3Ap1",
    );
    expect(screen.getByRole("link", { name: "Berry" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Floral" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Citrus" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Honey" })).not.toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  test("コーヒーの要素が何も無ければヒント文を表示する", () => {
    renderCard(BASE_RECORD);
    expect(screen.getByText("産地やフレーバーを追加すると、ほかの記録とのつながりが見えるようになります。")).toBeInTheDocument();
  });

  test("何か要素があればヒント文は出さない", () => {
    renderCard({ ...BASE_RECORD, origin: { id: "o1", name: "Ethiopia" } });
    expect(
      screen.queryByText("産地やフレーバーを追加すると、ほかの記録とのつながりが見えるようになります。"),
    ).not.toBeInTheDocument();
  });
});
