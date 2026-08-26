import { describe, expect, test } from "vitest";
import { buildForceGraphData } from "./graphAdapter";

describe("buildForceGraphData", () => {
  test("edgesの登場回数からdegreeを数える", () => {
    const graph = {
      nodes: [
        { id: "record:1", type: "record", label: "Ethiopia Natural", metadata: {} },
        { id: "origin:1", type: "origin", label: "Ethiopia", metadata: { recordCount: 2 } },
        { id: "flavor:1", type: "flavor", label: "Berry", metadata: { recordCount: 1 } },
      ],
      edges: [
        { source: "record:1", target: "origin:1" },
        { source: "record:1", target: "flavor:1" },
      ],
    };

    const { nodes } = buildForceGraphData(graph);

    expect(nodes.find((n) => n.id === "record:1").degree).toBe(2);
    expect(nodes.find((n) => n.id === "origin:1").degree).toBe(1);
    expect(nodes.find((n) => n.id === "flavor:1").degree).toBe(1);
  });

  test("エッジが無いノードのdegreeは0", () => {
    const graph = {
      nodes: [{ id: "origin:1", type: "origin", label: "Ethiopia", metadata: {} }],
      edges: [],
    };

    const { nodes } = buildForceGraphData(graph);
    expect(nodes[0].degree).toBe(0);
  });

  test("edgesをsource/targetだけのlinkへ変換する", () => {
    const graph = {
      nodes: [],
      edges: [{ source: "a", target: "b", someExtraField: "ignored" }],
    };

    const { links } = buildForceGraphData(graph);
    expect(links).toEqual([{ source: "a", target: "b" }]);
  });

  test("id/type/label/metadataを保持する", () => {
    const graph = {
      nodes: [{ id: "flavor:1", type: "flavor", label: "Berry", metadata: { recordCount: 3 } }],
      edges: [],
    };

    const { nodes } = buildForceGraphData(graph);
    expect(nodes[0]).toEqual({
      id: "flavor:1",
      type: "flavor",
      label: "Berry",
      metadata: { recordCount: 3 },
      degree: 0,
    });
  });
});
