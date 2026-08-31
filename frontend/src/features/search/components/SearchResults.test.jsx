/**
 * SearchResults.jsxのテスト。
 *
 * 2026-08、「多数の属性がヒットしたときの上限が無い」という指摘を
 * 受けてbackendに上限（entitiesTruncated）を追加した際、その案内文が
 * 正しく出し分けられるかを中心に見る。
 */
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import SearchResults from "./SearchResults";

const ENTITY = {
  id: "origin:1",
  type: "origin",
  label: "Ethiopia",
  recordCount: 3,
  relatedType: "flavor",
  relatedLabels: ["Berry"],
};

const renderWithRouter = (props) =>
  render(
    <MemoryRouter>
      <SearchResults query="ethiopia" entities={[]} records={[]} isLoading={false} error={null} {...props} />
    </MemoryRouter>,
  );

describe("SearchResults", () => {
  test("entitiesTruncatedがfalseなら案内文を表示しない", () => {
    renderWithRouter({ entities: [ENTITY], entitiesTruncated: false });

    expect(screen.queryByText(/一致する項目が他にもあります/)).not.toBeInTheDocument();
  });

  test("entitiesTruncatedがtrueなら絞り込みを促す案内文を表示する", () => {
    renderWithRouter({ entities: [ENTITY], entitiesTruncated: true });

    expect(screen.getByText("一致する項目が他にもあります。絞り込んでください。")).toBeInTheDocument();
  });

  test("entities自体が0件のときはentitiesTruncatedがtrueでも案内文を出さない", () => {
    renderWithRouter({ entities: [], entitiesTruncated: true, records: [{ id: "r1", title: "Test", consumedAt: null, rating: null }] });

    expect(screen.queryByText(/一致する項目が他にもあります/)).not.toBeInTheDocument();
  });
});
