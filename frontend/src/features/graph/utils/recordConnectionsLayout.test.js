import { describe, expect, test } from "vitest";
import { buildRecordConnectionsLayout, MAX_FLAVOR_NODES } from "./recordConnectionsLayout";

const ORIGIN = { id: "origin:1", name: "Ethiopia" };
const ORIGIN_2 = { id: "origin:2", name: "Kenya" };
const PROCESS = { id: "process:1", name: "Washed" };
const PROCESS_2 = { id: "process:2", name: "Natural" };
const ROAST_LEVEL = { id: "roastLevel:1", name: "Medium" };
const flavor = (n) => ({ id: `flavor:${n}`, name: `Flavor${n}` });

describe("buildRecordConnectionsLayout", () => {
  test("何も無ければ中心だけを返す", () => {
    const layout = buildRecordConnectionsLayout({});
    expect(layout.center).toEqual({ x: 50, y: 50 });
    expect(layout.nodes).toEqual([]);
    expect(layout.edges).toEqual([]);
    expect(layout.flavorOverflowCount).toBe(0);
  });

  test("origin/process/roastLevelはそれぞれ固定スロットに配置され、中心とedgeでつながる", () => {
    const layout = buildRecordConnectionsLayout({ origins: [ORIGIN], processes: [PROCESS], roastLevel: ROAST_LEVEL });

    expect(layout.nodes).toHaveLength(3);
    expect(layout.edges).toHaveLength(3);

    const originNode = layout.nodes.find((n) => n.type === "origin");
    expect(originNode).toMatchObject({ id: ORIGIN.id, label: ORIGIN.name });

    const originEdge = layout.edges.find((e) => e.x2 === originNode.x && e.y2 === originNode.y);
    expect(originEdge).toMatchObject({ x1: 50, y1: 50 });
  });

  test("いずれかが空なら、そのノード・edgeだけ作られない", () => {
    const layout = buildRecordConnectionsLayout({ origins: [ORIGIN], processes: [], roastLevel: null });
    expect(layout.nodes.map((n) => n.type)).toEqual(["origin"]);
  });

  test("産地が複数（ブレンド）なら、産地の数だけノードが横に並ぶ", () => {
    const layout = buildRecordConnectionsLayout({ origins: [ORIGIN, ORIGIN_2] });

    const originNodes = layout.nodes.filter((n) => n.type === "origin");
    expect(originNodes).toHaveLength(2);
    expect(originNodes.map((n) => n.label)).toEqual([ORIGIN.name, ORIGIN_2.name]);
    // 2件なら中心(x=50)を挟んで左右対称に配置される
    expect(originNodes[0].x).toBeLessThan(50);
    expect(originNodes[1].x).toBeGreaterThan(50);
  });

  test("精製方法が複数（ブレンド）なら、精製方法の数だけノードが縦に並ぶ", () => {
    const layout = buildRecordConnectionsLayout({ processes: [PROCESS, PROCESS_2] });

    const processNodes = layout.nodes.filter((n) => n.type === "process");
    expect(processNodes).toHaveLength(2);
    expect(processNodes.map((n) => n.label)).toEqual([PROCESS.name, PROCESS_2.name]);
    // 2件なら中心(y=50)を挟んで上下対称に配置される
    expect(processNodes[0].y).toBeLessThan(50);
    expect(processNodes[1].y).toBeGreaterThan(50);
  });

  test("フレーバーは幹（中心→trunk）から扇状に分岐する", () => {
    const layout = buildRecordConnectionsLayout({ flavors: [flavor(1), flavor(2)] });

    // 中心→trunk のedgeが1本、trunk→各flavorのedgeがflavor数ぶん
    expect(layout.edges).toHaveLength(3);
    const flavorNodes = layout.nodes.filter((n) => n.type === "flavor");
    expect(flavorNodes).toHaveLength(2);
    expect(flavorNodes.map((n) => n.label)).toEqual(["Flavor1", "Flavor2"]);
  });

  test("フレーバーが1件だけならx=50（中央）に置かれる", () => {
    const layout = buildRecordConnectionsLayout({ flavors: [flavor(1)] });
    expect(layout.nodes[0].x).toBe(50);
  });

  test(`フレーバーが${MAX_FLAVOR_NODES}件を超えると、超過分はflavorOverflowCountに回り描画しない`, () => {
    const flavors = Array.from({ length: MAX_FLAVOR_NODES + 3 }, (_, i) => flavor(i));
    const layout = buildRecordConnectionsLayout({ flavors });

    const flavorNodes = layout.nodes.filter((n) => n.type === "flavor");
    expect(flavorNodes).toHaveLength(MAX_FLAVOR_NODES);
    expect(layout.flavorOverflowCount).toBe(3);
  });

  test("flavorsを省略すると空配列扱いになる", () => {
    const layout = buildRecordConnectionsLayout({ origins: [ORIGIN] });
    expect(layout.flavorOverflowCount).toBe(0);
    expect(layout.nodes.some((n) => n.type === "flavor")).toBe(false);
  });
});
