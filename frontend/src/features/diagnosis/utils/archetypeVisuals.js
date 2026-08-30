/**
 * コーヒータイプ（archetype.type）ごとのアクセントカラー。
 *
 * features/graph/utils/nodeVisuals.jsと同じCatppuccin Mochaパレットを
 * 再利用する。診断はGraphの知識グラフ（roastLevel.order・
 * flavors[].category）から導かれるため、色もGraphの語彙をそのまま
 * 引き継ぎ、「診断はグラフから生まれている」という一貫性を持たせる
 * （新しい色は増やさない。docs/product.md「One Source of Truth」）。
 *
 * light/dark/mediumの一般則（category不明時のフォールバック）は、
 * 対応するroastLevel自体の色を使う。組み合わせ型は、flavorのcategory
 * ごとに固定の色を割り当てる（2026-08、診断タイプを5種類から
 * 焙煎度3×category6の全18種類へ拡張した際、色数が増えても管理しやすい
 * よう「categoryが同じなら常に同じ色」というルールへ整理した）。
 */
const CATEGORY_COLOR_CLASS = {
  fruity: "text-accent-pink",
  floral: "text-accent-lavender",
  nutty: "text-accent-teal", // farm（木の実=植物系の色に寄せる）
  sweet: "text-accent-yellow",
  spicy: "text-accent-mauve",
  other: "text-accent-moss", // record色を転用（archetypeでは未使用だったため）
};

const ROAST_ONLY_COLOR_CLASS = {
  light: "text-accent-sky", // origin
  dark: "text-accent-peach", // roastLevel（暖色。Flameアイコンとも合う）
  medium: "text-accent-sapphire", // process
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
