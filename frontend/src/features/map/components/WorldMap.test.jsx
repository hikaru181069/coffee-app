/**
 * WorldMap.jsxのテスト。
 *
 * 実際のworld-atlasデータ（200件超の国境）は重く、国境の形状自体は
 * このコンポーネントの責務ではないため、topojson-clientのfeature()を
 * モックして2か国だけの最小データに差し替える。見るのは「訪問済みかどうか
 * でクリック可否・塗り色・ツールチップの内容が決まる」というロジック。
 */
import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Ethiopia(231)・India(356)のISO numeric idを持つ、最小の正方形2つだけの
// FeatureCollection。実際の国境形状はテストの関心事ではない
vi.mock("topojson-client", () => ({
  feature: () => ({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: "231",
        properties: { name: "Ethiopia" },
        geometry: { type: "Polygon", coordinates: [[[38, 8], [39, 8], [39, 9], [38, 9], [38, 8]]] },
      },
      {
        type: "Feature",
        id: "356",
        properties: { name: "India" },
        geometry: { type: "Polygon", coordinates: [[[78, 20], [79, 20], [79, 21], [78, 21], [78, 20]]] },
      },
    ],
  }),
}));
vi.mock("world-atlas/countries-110m.json", () => ({ default: { objects: { countries: {} } } }));

// vi.mockはモジュールimportより前に巻き上げられるため、モック後にimportする
const { default: WorldMap } = await import("./WorldMap");

const VISITED_ETHIOPIA_ONLY = new Map([
  ["231", { id: "origin:eth1", label: "Ethiopia", recordCount: 4 }],
]);

describe("WorldMap", () => {
  test("訪問済みの国だけrole=linkになり、未訪問の国はクリックできる要素にならない", () => {
    render(<WorldMap visitedByNumericId={VISITED_ETHIOPIA_ONLY} />);

    expect(screen.getByRole("link", { name: "Ethiopiaの詳細を見る" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /India/ })).not.toBeInTheDocument();
  });

  test("訪問済みの国をクリックするとそのエンティティ詳細ページへ遷移する", () => {
    render(<WorldMap visitedByNumericId={VISITED_ETHIOPIA_ONLY} />);

    fireEvent.click(screen.getByRole("link", { name: "Ethiopiaの詳細を見る" }));

    expect(mockNavigate).toHaveBeenCalledWith("/entities/origin%3Aeth1");
  });

  test("訪問済みの国にホバーすると産地名と記録数のツールチップが出る", () => {
    render(<WorldMap visitedByNumericId={VISITED_ETHIOPIA_ONLY} />);

    fireEvent.mouseEnter(screen.getByRole("link", { name: "Ethiopiaの詳細を見る" }));

    expect(screen.getByRole("tooltip")).toHaveTextContent("Ethiopia");
    expect(screen.getByRole("tooltip")).toHaveTextContent("4件の記録");
  });
});
