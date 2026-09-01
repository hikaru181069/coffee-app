/**
 * HomeRecordCard.jsxのテスト。
 *
 * RecordCard.jsxと役割が近いが、Home画面向けに産地・銘柄・精製方法・
 * フレーバーを優先する見た目の違いがある（日付・記録タイプ・cafeNameは
 * 出さない）。
 */
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import HomeRecordCard from "./HomeRecordCard";

const BASE_RECORD = {
  id: "1",
  title: "Ethiopia Guji Natural",
  rating: null,
  origin: null,
  process: null,
  flavors: [],
};

function renderCard(record) {
  return render(
    <MemoryRouter>
      <ul>
        <HomeRecordCard record={record} />
      </ul>
    </MemoryRouter>,
  );
}

describe("HomeRecordCard", () => {
  test("タイトルを表示し、記録詳細へのリンクになる", () => {
    renderCard(BASE_RECORD);

    expect(screen.getByText("Ethiopia Guji Natural")).toBeInTheDocument();
    expect(screen.getByRole("link")).toHaveAttribute("href", "/records/1");
  });

  test("ratingがあれば評価を表示する", () => {
    renderCard({ ...BASE_RECORD, rating: 5 });
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  test("originがあれば産地名を表示する", () => {
    renderCard({ ...BASE_RECORD, origin: { id: "o1", name: "Ethiopia" } });
    expect(screen.getByText("Ethiopia")).toBeInTheDocument();
  });

  test("processがあればテキストで表示する", () => {
    renderCard({ ...BASE_RECORD, process: { id: "p1", name: "Washed" } });
    expect(screen.getByText("Washed")).toBeInTheDocument();
  });

  test("flavorsは「・」区切りではなく中黒でまとめて表示する", () => {
    renderCard({
      ...BASE_RECORD,
      flavors: [
        { id: "f1", name: "Berry" },
        { id: "f2", name: "Floral" },
      ],
    });

    expect(screen.getByText("Berry • Floral")).toBeInTheDocument();
  });

  test("コーヒーの要素が何も無ければヒント文を表示する", () => {
    renderCard(BASE_RECORD);
    expect(
      screen.getByText("産地やフレーバーを追加すると、ほかの記録とのつながりが見えるようになります。"),
    ).toBeInTheDocument();
  });
});
