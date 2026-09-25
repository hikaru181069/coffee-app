import { describe, expect, test } from "vitest";
import { findCommunityForNode } from "./communityLookup";

const communities = [
  { id: 0, recordCount: 3, dominantAttributes: {}, nodeIds: ["record:1", "origin:eth"] },
  { id: 1, recordCount: 4, dominantAttributes: {}, nodeIds: ["record:2", "origin:bra"] },
];

describe("findCommunityForNode", () => {
  test("nodeIdが含まれるコミュニティを返す", () => {
    expect(findCommunityForNode(communities, "origin:bra")).toBe(communities[1]);
  });

  test("どのコミュニティにも属さなければnullを返す", () => {
    expect(findCommunityForNode(communities, "origin:unknown")).toBeNull();
  });

  test("nodeIdが未指定ならnullを返す", () => {
    expect(findCommunityForNode(communities, null)).toBeNull();
  });
});
