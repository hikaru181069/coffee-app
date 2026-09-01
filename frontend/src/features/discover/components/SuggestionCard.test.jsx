/**
 * SuggestionCard.jsxのテスト。
 *
 * Discoverの提案1件分の表示（文言の穴埋め・記録CTAのリンク先）を見る。
 */
import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

import SuggestionCard from "./SuggestionCard";

const SUGGESTION = {
  type: "similarProcessOrigin",
  basedOn: { originLabel: "Guatemala", processLabel: "Washed", count: 2 },
  suggestedOrigin: { label: "Costa Rica", avgQualityScore: 84.3 },
};

describe("SuggestionCard", () => {
  test("産地・精製方法・件数・提案先の産地名を文中に埋め込んで表示する", () => {
    render(
      <MemoryRouter>
        <SuggestionCard suggestion={SUGGESTION} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText(
        "GuatemalaをWashed精製でよく選んでいますが（2件）、同じWashed精製で評価の高いCosta Ricaはまだ記録がありません。",
      ),
    ).toBeInTheDocument();
  });

  test("「この産地を記録してみる」は提案先の産地名を添えて新規記録フォームへ遷移する", () => {
    render(
      <MemoryRouter>
        <SuggestionCard suggestion={SUGGESTION} />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: "この産地を記録してみる" })).toHaveAttribute(
      "href",
      "/records/new?originName=Costa%20Rica",
    );
  });
});
