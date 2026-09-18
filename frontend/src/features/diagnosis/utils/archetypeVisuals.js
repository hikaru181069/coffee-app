/**
 * コーヒータイプ（archetype.type）ごとのアクセントカラー。
 *
 * features/graph/utils/nodeVisuals.jsと同じ色の語彙を再利用する。診断は
 * Graphの知識グラフ（roastLevel.order・flavors[].category）から導かれる
 * ため、色もGraphの語彙をそのまま引き継ぎ、「診断はグラフから生まれて
 * いる」という一貫性を持たせる（新しい色は増やさない。docs/product.md
 * 「One Source of Truth」）。
 *
 * light/dark/mediumの一般則（category不明時のフォールバック）は、
 * 対応するroastLevel自体の色を使う。組み合わせ型は、flavorのcategory
 * ごとに固定の色を割り当てる（2026-08、診断タイプを5種類から
 * 焙煎度3×category6の全18種類へ拡張した際、色数が増えても管理しやすい
 * よう「categoryが同じなら常に同じ色」というルールへ整理した）。
 *
 * 2026-09、「デザイン・テーマの統一」レビューで、ここが旧
 * `--color-accent-*`（Catppuccin Mocha）のままで、Graph画面作り直しで
 * 新設した`--color-graph-*`（features/graph/utils/nodeVisuals.js）と
 * 無関係になっていたことが分かった。下記コメント（`// origin`等）が
 * 示す通り「どのノード種別の色に寄せたか」という意図は元々1:1で決まって
 * いたため、対応する`--color-graph-*`へ機械的に差し替えた
 * （見た目の色自体は変えていない。`--color-graph-*`の9色は元々
 * `--color-accent-*`の同じ9スロットを踏襲して新設したため）。
 */
const CATEGORY_COLOR_CLASS = {
  fruity: "text-graph-flavor",
  floral: "text-graph-cafe",
  nutty: "text-graph-farm", // farm（木の実=植物系の色に寄せる）
  sweet: "text-graph-variety",
  spicy: "text-graph-keyword",
  other: "text-graph-record", // record色を転用（archetypeでは未使用だったため）
};

const ROAST_ONLY_COLOR_CLASS = {
  light: "text-graph-origin", // origin
  dark: "text-graph-roastlevel", // roastLevel（暖色。Flameアイコンとも合う）
  medium: "text-graph-process", // process
};

const ARCHETYPE_COLOR_CLASS = {
  lightFruity: CATEGORY_COLOR_CLASS.fruity,
  lightFloral: CATEGORY_COLOR_CLASS.floral,
  lightSweet: CATEGORY_COLOR_CLASS.sweet,
  lightNutty: CATEGORY_COLOR_CLASS.nutty,
  lightSpicy: CATEGORY_COLOR_CLASS.spicy,
  lightOther: CATEGORY_COLOR_CLASS.other,
  mediumFruity: CATEGORY_COLOR_CLASS.fruity,
  mediumFloral: CATEGORY_COLOR_CLASS.floral,
  mediumNutty: CATEGORY_COLOR_CLASS.nutty,
  mediumSweet: CATEGORY_COLOR_CLASS.sweet,
  mediumSpicy: CATEGORY_COLOR_CLASS.spicy,
  mediumOther: CATEGORY_COLOR_CLASS.other,
  darkFruity: CATEGORY_COLOR_CLASS.fruity,
  darkFloral: CATEGORY_COLOR_CLASS.floral,
  darkNutty: CATEGORY_COLOR_CLASS.nutty,
  darkSweet: CATEGORY_COLOR_CLASS.sweet,
  darkSpicy: CATEGORY_COLOR_CLASS.spicy,
  darkOther: CATEGORY_COLOR_CLASS.other,
  light: ROAST_ONLY_COLOR_CLASS.light,
  dark: ROAST_ONLY_COLOR_CLASS.dark,
  medium: ROAST_ONLY_COLOR_CLASS.medium,
};

const DEFAULT_COLOR_CLASS = "text-text-secondary";

export const getArchetypeColorClass = (type) => ARCHETYPE_COLOR_CLASS[type] ?? DEFAULT_COLOR_CLASS;
