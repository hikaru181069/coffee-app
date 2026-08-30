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
  ["flavor-winey", "other"],
]);

const NO_SUPPLEMENT = {
  dominantProcess: null,
  dominantVariety: null,
  tasteProfile: {
    tasteSweetness: null,
    tasteBitterness: null,
    tasteAcidity: null,
    tasteBody: null,
    tasteAroma: null,
    tasteAftertaste: null,
  },
};

const buildRecord = ({ roastId, flavorIds = [], process = null, varieties = [], taste = {} } = {}) => ({
  roastLevel: roastId ? { id: roastId, name: roastId } : null,
  flavors: flavorIds.map((id) => ({ id, name: id })),
  process,
  varieties,
  tasteSweetness: null,
  tasteBitterness: null,
  tasteAcidity: null,
  tasteBody: null,
  tasteAroma: null,
  tasteAftertaste: null,
  ...taste,
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
  test("フレーバーが無ければ焙煎度だけの一般則になり、categorySampleSizeはnull", () => {
    const records = [
      buildRecord({ roastId: ROAST_LIGHT.id }),
      buildRecord({ roastId: ROAST_LIGHT.id }),
      buildRecord({ roastId: ROAST_MEDIUM_LIGHT.id }),
    ];
    expect(buildArchetypeFor(records)).toEqual({
      archetype: { type: "light", roastSampleSize: 3, categorySampleSize: null, ...NO_SUPPLEMENT },
    });
  });

  test("フレーバーのcategoryが件数不足でも診断全体はnullにならず一般則へフォールバックする", () => {
    const records = [
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-almond"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-caramel"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: [] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({
      archetype: { type: "dark", roastSampleSize: 3, categorySampleSize: null, ...NO_SUPPLEMENT },
    });
  });
});

describe("焙煎度×フレーバーの組み合わせルール", () => {
  test("light×fruityはlightFruityになり、categorySampleSizeが一致件数を反映する", () => {
    const records = [
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"] }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"] }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({
      archetype: { type: "lightFruity", roastSampleSize: 3, categorySampleSize: 3, ...NO_SUPPLEMENT },
    });
  });

  test("light×floralはlightFloralになる", () => {
    const records = [
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-jasmine"] }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-jasmine"] }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-jasmine"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({
      archetype: { type: "lightFloral", roastSampleSize: 3, categorySampleSize: 3, ...NO_SUPPLEMENT },
    });
  });

  test("dark×nuttyはdarkNuttyになる", () => {
    const records = [
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-almond"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-almond"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-almond"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({
      archetype: { type: "darkNutty", roastSampleSize: 3, categorySampleSize: 3, ...NO_SUPPLEMENT },
    });
  });

  test("dark×sweetはdarkSweetになる", () => {
    const records = [
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-caramel"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-caramel"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-caramel"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({
      archetype: { type: "darkSweet", roastSampleSize: 3, categorySampleSize: 3, ...NO_SUPPLEMENT },
    });
  });

  test("medium×spicyはmediumSpicyになる", () => {
    const records = [
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-cinnamon"] }),
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-cinnamon"] }),
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-cinnamon"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({
      archetype: { type: "mediumSpicy", roastSampleSize: 3, categorySampleSize: 3, ...NO_SUPPLEMENT },
    });
  });

  test("2026-08に追加した組み合わせ: medium×fruityはmediumFruityになる", () => {
    const records = [
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-berry"] }),
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-berry"] }),
      buildRecord({ roastId: ROAST_MEDIUM.id, flavorIds: ["flavor-berry"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({
      archetype: { type: "mediumFruity", roastSampleSize: 3, categorySampleSize: 3, ...NO_SUPPLEMENT },
    });
  });

  test("2026-08に追加したotherカテゴリ: dark×otherはdarkOtherになる（以前はdarkの一般則に落ちていた）", () => {
    const records = [
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-winey"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-winey"] }),
      buildRecord({ roastId: ROAST_DARK.id, flavorIds: ["flavor-winey"] }),
    ];
    expect(buildArchetypeFor(records)).toEqual({
      archetype: { type: "darkOther", roastSampleSize: 3, categorySampleSize: 3, ...NO_SUPPLEMENT },
    });
  });
});

describe("補足情報: 精製方法・品種", () => {
  const LIGHT_FRUITY_RECORDS_WITH = (extra) => [
    buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"], ...extra[0] }),
    buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"], ...extra[1] }),
    buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"], ...extra[2] }),
  ];

  test("精製方法が3件とも同じならdominantProcessが立つ", () => {
    const natural = { id: "process-natural", name: "Natural" };
    const records = LIGHT_FRUITY_RECORDS_WITH([{ process: natural }, { process: natural }, { process: natural }]);
    expect(buildArchetypeFor(records).archetype.dominantProcess).toEqual({ label: "Natural", count: 3 });
  });

  test("精製方法が3件未満（1件だけ設定）ならdominantProcessはnull", () => {
    const natural = { id: "process-natural", name: "Natural" };
    const records = LIGHT_FRUITY_RECORDS_WITH([{ process: natural }, {}, {}]);
    expect(buildArchetypeFor(records).archetype.dominantProcess).toBeNull();
  });

  test("精製方法が同率首位ならdominantProcessはnull", () => {
    const natural = { id: "process-natural", name: "Natural" };
    const washed = { id: "process-washed", name: "Washed" };
    const records = [
      ...LIGHT_FRUITY_RECORDS_WITH([{ process: natural }, { process: natural }, { process: washed }]),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"], process: washed }),
    ];
    expect(buildArchetypeFor(records).archetype.dominantProcess).toBeNull();
  });

  test("品種は配列を横断して集計する", () => {
    const geisha = { id: "variety-geisha", name: "Geisha" };
    const records = LIGHT_FRUITY_RECORDS_WITH([
      { varieties: [geisha] },
      { varieties: [geisha] },
      { varieties: [geisha] },
    ]);
    expect(buildArchetypeFor(records).archetype.dominantVariety).toEqual({ label: "Geisha", count: 3 });
  });
});

describe("補足情報: 平均テイストプロファイル", () => {
  test("軸ごとに3件以上あれば平均を出す", () => {
    const records = [
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"], taste: { tasteSweetness: 4 } }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"], taste: { tasteSweetness: 5 } }),
      buildRecord({ roastId: ROAST_LIGHT.id, flavorIds: ["flavor-berry"], taste: { tasteSweetness: 3 } }),
    ];
    expect(buildArchetypeFor(records).archetype.tasteProfile.tasteSweetness).toBe(4);
  });

  test("軸ごとに3件未満ならその軸だけnull（他の軸には影響しない）", () => {
    const records = [
      buildRecord({
        roastId: ROAST_LIGHT.id,
        flavorIds: ["flavor-berry"],
        taste: { tasteSweetness: 4, tasteAcidity: 5 },
      }),
      buildRecord({
        roastId: ROAST_LIGHT.id,
        flavorIds: ["flavor-berry"],
        taste: { tasteSweetness: 5, tasteAcidity: 4 },
      }),
      buildRecord({
        roastId: ROAST_LIGHT.id,
        flavorIds: ["flavor-berry"],
        taste: { tasteSweetness: 3, tasteAcidity: 3 },
      }),
    ];
    const profile = buildArchetypeFor(records).archetype.tasteProfile;
    expect(profile.tasteSweetness).toBe(4);
    expect(profile.tasteAcidity).toBe(4);
    expect(profile.tasteBitterness).toBeNull();
  });
});
