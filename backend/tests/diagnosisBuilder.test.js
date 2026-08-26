/**
 * core/diagnosis/diagnosisBuilder.js のユニットテスト。
 *
 * DB・HTTPに依存しない純粋関数なので、モック無しでテストできる
 * （tests/insightBuilder.test.js と同じ方針）。
 */

import { buildArchetype } from "../core/diagnosis/diagnosisBuilder.js";

const ROAST_LIGHT = { id: "roast-light", order: 1 };
const ROAST_MEDIUM_LIGHT = { id: "roast-medium-light", order: 2 };
const ROAST_MEDIUM = { id: "roast-medium", order: 3 };
const ROAST_MEDIUM_DARK = { id: "roast-medium-dark", order: 4 };
const ROAST_DARK = { id: "roast-dark", order: 5 };

const ROAST_ORDER_BY_ID = new Map(
  [ROAST_LIGHT, ROAST_MEDIUM_LIGHT, ROAST_MEDIUM, ROAST_MEDIUM_DARK, ROAST_DARK].map((roast) => [
    roast.id,
    roast.order,
  ]),
);

const FLAVOR_CATEGORY_BY_ID = new Map([
  ["flavor-berry", "fruity"],
  ["flavor-jasmine", "floral"],
  ["flavor-almond", "nutty"],
  ["flavor-caramel", "sweet"],
  ["flavor-cinnamon", "spicy"],
]);

const buildRecord = ({ roastId, flavorIds = [] } = {}) => ({
  roastLevel: roastId ? { id: roastId, name: roastId } : null,
  flavors: flavorIds.map((id) => ({ id, name: id })),
});

const buildArchetypeFor = (records) => buildArchetype(records, ROAST_ORDER_BY_ID, FLAVOR_CATEGORY_BY_ID);

describe("焙煎度が閾値未満・同率首位のとき", () => {
  test("roastLevelつきの記録が3件未満ならnull", () => {
    const records = [
      buildRecord({ roastId: ROAST_LIGHT.id }),
      buildRecord({ roastId: ROAST_LIGHT.id }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: null });
  });

  test("light/darkが同率首位ならnull", () => {
    const records = [
      buildRecord({ roastId: ROAST_LIGHT.id }),
      buildRecord({ roastId: ROAST_MEDIUM_LIGHT.id }),
      buildRecord({ roastId: ROAST_DARK.id }),
      buildRecord({ roastId: ROAST_MEDIUM_DARK.id }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: null });
  });
});

describe("焙煎度だけの一般則（フレーバー不足・同率）", () => {
  test("フレーバーが無ければ焙煎度だけの一般則になる", () => {
    const records = [
      buildRecord({ roastId: ROAST_LIGHT.id }),
      buildRecord({ roastId: ROAST_LIGHT.id }),
      buildRecord({ roastId: ROAST_MEDIUM_LIGHT.id }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: { type: "light", sampleSize: 3 } });
  });

  test("フレーバーのcategoryが同率首位でも診断全体はnullにならず一般則へフォールバックする", () => {
    const records = [
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-almond"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-caramel"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: [] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: { type: "dark", sampleSize: 3 } });
  });
});

describe("焙煎度×フレーバーの組み合わせルール", () => {
  test("light×fruityはlightFruityになる（一般則より優先される）", () => {
    const records = [
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"] }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"] }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: { type: "lightFruity", sampleSize: 3 } });
  });

  test("light×floralはlightFloralになる", () => {
    const records = [
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-jasmine"] }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-jasmine"] }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-jasmine"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: { type: "lightFloral", sampleSize: 3 } });
  });

  test("dark×nuttyはdarkNuttyになる", () => {
    const records = [
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-almond"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-almond"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-almond"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: { type: "darkNutty", sampleSize: 3 } });
  });

  test("dark×sweetはdarkSweetになる", () => {
    const records = [
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-caramel"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-caramel"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-caramel"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: { type: "darkSweet", sampleSize: 3 } });
  });

  test("medium×spicyはmediumSpicyになる", () => {
    const records = [
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-cinnamon"] }),
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-cinnamon"] }),
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-cinnamon"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: { type: "mediumSpicy", sampleSize: 3 } });
  });

  test("組み合わせに合致しないcategoryならmediumの一般則になる", () => {
    const records = [
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-berry"] }),
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-berry"] }),
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-berry"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({ archetype: { type: "medium", sampleSize: 3 } });
  });
});
