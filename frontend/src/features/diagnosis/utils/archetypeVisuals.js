/**
 * コーヒータイプ（archetype.type）ごとのアクセントカラー。
 *
 * features/graph/utils/nodeVisuals.jsと同じCatppuccin Mochaパレットを
 * 再利用する。診断はGraphの知識グラフ（roastLevel.order・
 * flavors[].category）から導かれるため、色もGraphの語彙をそのまま
 * 引き継ぎ、「診断はグラフから生まれている」という一貫性を持たせる
 * （新しい色は増やさない。docs/product.md「One Source of Truth」）。
 *
 * light/dark/mediumの一般則は、対応するroastLevel（origin色ではなく
 * こちらはroastLevel自体の色）を使う。組み合わせ型は、フレーバー
 * categoryに近い属性の色を使う。
 */
const ARCHETYPE_COLOR_CLASS = {
  lightFruity: "text-accent-pink", // flavor
  lightFloral: "text-accent-lavender",
  darkNutty: "text-accent-teal", // farm（木の実=植物系の色に寄せる）
  darkSweet: "text-accent-yellow",
  mediumSpicy: "text-accent-mauve",
  light: "text-accent-sky", // origin
  dark: "text-accent-peach", // roastLevel（暖色。Flameアイコンとも合う）
  medium: "text-accent-sapphire", // process
};

const DEFAULT_COLOR_CLASS = "text-text-secondary";

export const getArchetypeColorClass = (type) => ARCHETYPE_COLOR_CLASS[type] ?? DEFAULT_COLOR_CLASS;
