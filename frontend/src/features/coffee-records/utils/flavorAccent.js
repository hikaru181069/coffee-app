/**
 * フレーバーごとの個別アクセントカラー。
 *
 * 2026-09、「記録一覧・Homeの記録カードにGraph画面の配色の雰囲気を
 * 適用してほしい」という要望をきっかけに追加した。産地
 * （originAccent.js）と同じ考え方で、フレーバーは種別共通の1色
 * （graph.flavor のマゼンタ、GraphCanvas.jsxのノード色）ではなく、
 * `backend/seeds/data/flavors.js`のフレーバーごとにそのキーワードを
 * 連想させる個別の色を割り当てる（例: Lemonは黄緑、Blueberryは青、
 * Chocolateは茶）。Artifactでのモック確認を経てユーザー承認を得た配色。
 *
 * 種別共通色（process・roastLevel等）と個別色（origin・flavor）を
 * 使い分けている理由: 産地・フレーバーは「具体的に何を選んだか」が
 * 一覧性を持って見分けられる方が実用的（例: 記録一覧を眺めたときに
 * 「これはBerry系、これはChocolate系」と色だけで大まかに掴める）のに
 * 対し、精製方法・焙煎度は選択肢の種類数が少なく個別色にする実益が
 * 薄いため、Graph画面と揃えた種別共通色のままにしている。
 *
 * originAccent.jsと同様、フレーバーマスターにcolorフィールドを追加する
 * 案もあったが、見た目だけの目的でバックエンドのスキーマを変える必要性は
 * 薄いため、フロントエンドだけで完結する対応表にした。
 *
 * 【保守上の注意】この対応表はハッシュ方式ではなく手動の決め打ちで、
 * 自動では増えない。`backend/seeds/data/flavors.js`へ新しいフレーバーを
 * 追加したときは、`frontend/src/features/map/utils/countryCodes.js`や
 * `originAccent.js`の`ORIGIN_NAME_TO_HEX`と同様、この
 * `FLAVOR_NAME_TO_HEX`にも1行手動で追加すること。追加を忘れても、
 * フォールバック（中立グレー）が使われるだけでエラーにはならない。
 */

/** フレーバー名 → 個別の色（HEX）。backend/seeds/data/flavors.jsのcategoryごとにグループ化してある */
const FLAVOR_NAME_TO_HEX = {
  // 果実系 (fruity)
  Citrus: "#e8a23c",
  Lemon: "#e6d64a",
  Orange: "#f0862e",
  Berry: "#a23e6b",
  Strawberry: "#e0435c",
  Blueberry: "#4f5ba3",
  "Stone Fruit": "#e89b6e",
  Cherry: "#b52535",
  Peach: "#f2b088",
  Mango: "#f2a627",
  Raisin: "#5c3d42",
  Apple: "#8fb93f",
  Grape: "#6b4088",
  "Tropical Fruit": "#e8628f",

  // 甘さ系 (sweet)
  Chocolate: "#6b4630",
  "Dark Chocolate": "#47301f",
  "Milk Chocolate": "#8a5a3a",
  Caramel: "#c17a35",
  "Brown Sugar": "#a06a3a",
  "Maple Syrup": "#a8611f",
  Honey: "#dba130",
  Vanilla: "#e8d3a3",

  // ナッツ・穀物系 (nutty)
  Nutty: "#9c7a51",
  Almond: "#cbb08a",
  Hazelnut: "#8a6239",
  Walnut: "#6e4f38",
  Peanut: "#b68b52",

  // 花・香草系 (floral)
  Floral: "#d98bc4",
  Jasmine: "#dcc9e8",
  Rose: "#d1517a",
  "Black Tea": "#8a4a2e",
  Herbal: "#6b8f5e",

  // 香辛料系 (spicy)
  Spice: "#c2703a",
  Cinnamon: "#a8622e",
  Clove: "#6e2e2e",

  // その他 (other)
  Winey: "#6e2340",
  Creamy: "#e8ddc8",
  Juicy: "#e0554a",
  Smoky: "#5a5a52",
  Earthy: "#6b5638",
  Malty: "#8a6f3a",
  Tobacco: "#5c4530",
};

/** 対応表に無いフレーバー名（追加し忘れ）のためのフォールバック */
const FALLBACK_HEX = "#6c7086";

// bg-*/text-*版は同じ対応表を指す並行オブジェクト（同じキーが
// 同じ色になるよう対応を揃えている）。Tailwindはソースコードに実際に
// 書かれた完全なクラス名の文字列だけを見てCSSを生成するため、
// `` `bg-[${hex}]` ``のようにJS側で文字列結合して作ると検出されず
// CSSが生成されない。そのため2系統ぶん、全クラス名をリテラルで書き出す
// （originAccent.jsと同じ理由）
const FLAVOR_BG_CLASS_BY_NAME = {
  Citrus: "bg-[#e8a23c]",
  Lemon: "bg-[#e6d64a]",
  Orange: "bg-[#f0862e]",
  Berry: "bg-[#a23e6b]",
  Strawberry: "bg-[#e0435c]",
  Blueberry: "bg-[#4f5ba3]",
  "Stone Fruit": "bg-[#e89b6e]",
  Cherry: "bg-[#b52535]",
  Peach: "bg-[#f2b088]",
  Mango: "bg-[#f2a627]",
  Raisin: "bg-[#5c3d42]",
  Apple: "bg-[#8fb93f]",
  Grape: "bg-[#6b4088]",
  "Tropical Fruit": "bg-[#e8628f]",
  Chocolate: "bg-[#6b4630]",
  "Dark Chocolate": "bg-[#47301f]",
  "Milk Chocolate": "bg-[#8a5a3a]",
  Caramel: "bg-[#c17a35]",
  "Brown Sugar": "bg-[#a06a3a]",
  "Maple Syrup": "bg-[#a8611f]",
  Honey: "bg-[#dba130]",
  Vanilla: "bg-[#e8d3a3]",
  Nutty: "bg-[#9c7a51]",
  Almond: "bg-[#cbb08a]",
  Hazelnut: "bg-[#8a6239]",
  Walnut: "bg-[#6e4f38]",
  Peanut: "bg-[#b68b52]",
  Floral: "bg-[#d98bc4]",
  Jasmine: "bg-[#dcc9e8]",
  Rose: "bg-[#d1517a]",
  "Black Tea": "bg-[#8a4a2e]",
  Herbal: "bg-[#6b8f5e]",
  Spice: "bg-[#c2703a]",
  Cinnamon: "bg-[#a8622e]",
  Clove: "bg-[#6e2e2e]",
  Winey: "bg-[#6e2340]",
  Creamy: "bg-[#e8ddc8]",
  Juicy: "bg-[#e0554a]",
  Smoky: "bg-[#5a5a52]",
  Earthy: "bg-[#6b5638]",
  Malty: "bg-[#8a6f3a]",
  Tobacco: "bg-[#5c4530]",
};

const FLAVOR_TEXT_CLASS_BY_NAME = {
  Citrus: "text-[#e8a23c]",
  Lemon: "text-[#e6d64a]",
  Orange: "text-[#f0862e]",
  Berry: "text-[#a23e6b]",
  Strawberry: "text-[#e0435c]",
  Blueberry: "text-[#4f5ba3]",
  "Stone Fruit": "text-[#e89b6e]",
  Cherry: "text-[#b52535]",
  Peach: "text-[#f2b088]",
  Mango: "text-[#f2a627]",
  Raisin: "text-[#5c3d42]",
  Apple: "text-[#8fb93f]",
  Grape: "text-[#6b4088]",
  "Tropical Fruit": "text-[#e8628f]",
  Chocolate: "text-[#6b4630]",
  "Dark Chocolate": "text-[#47301f]",
  "Milk Chocolate": "text-[#8a5a3a]",
  Caramel: "text-[#c17a35]",
  "Brown Sugar": "text-[#a06a3a]",
  "Maple Syrup": "text-[#a8611f]",
  Honey: "text-[#dba130]",
  Vanilla: "text-[#e8d3a3]",
  Nutty: "text-[#9c7a51]",
  Almond: "text-[#cbb08a]",
  Hazelnut: "text-[#8a6239]",
  Walnut: "text-[#6e4f38]",
  Peanut: "text-[#b68b52]",
  Floral: "text-[#d98bc4]",
  Jasmine: "text-[#dcc9e8]",
  Rose: "text-[#d1517a]",
  "Black Tea": "text-[#8a4a2e]",
  Herbal: "text-[#6b8f5e]",
  Spice: "text-[#c2703a]",
  Cinnamon: "text-[#a8622e]",
  Clove: "text-[#6e2e2e]",
  Winey: "text-[#6e2340]",
  Creamy: "text-[#e8ddc8]",
  Juicy: "text-[#e0554a]",
  Smoky: "text-[#5a5a52]",
  Earthy: "text-[#6b5638]",
  Malty: "text-[#8a6f3a]",
  Tobacco: "text-[#5c4530]",
};

// タグの背景に使う、薄い塗り（15%不透明度）版。nodeVisuals.jsのbgTintClassと
// 同じ理由でリテラルに書き出す
const FLAVOR_TINT_CLASS_BY_NAME = {
  Citrus: "bg-[#e8a23c]/15",
  Lemon: "bg-[#e6d64a]/15",
  Orange: "bg-[#f0862e]/15",
  Berry: "bg-[#a23e6b]/15",
  Strawberry: "bg-[#e0435c]/15",
  Blueberry: "bg-[#4f5ba3]/15",
  "Stone Fruit": "bg-[#e89b6e]/15",
  Cherry: "bg-[#b52535]/15",
  Peach: "bg-[#f2b088]/15",
  Mango: "bg-[#f2a627]/15",
  Raisin: "bg-[#5c3d42]/15",
  Apple: "bg-[#8fb93f]/15",
  Grape: "bg-[#6b4088]/15",
  "Tropical Fruit": "bg-[#e8628f]/15",
  Chocolate: "bg-[#6b4630]/15",
  "Dark Chocolate": "bg-[#47301f]/15",
  "Milk Chocolate": "bg-[#8a5a3a]/15",
  Caramel: "bg-[#c17a35]/15",
  "Brown Sugar": "bg-[#a06a3a]/15",
  "Maple Syrup": "bg-[#a8611f]/15",
  Honey: "bg-[#dba130]/15",
  Vanilla: "bg-[#e8d3a3]/15",
  Nutty: "bg-[#9c7a51]/15",
  Almond: "bg-[#cbb08a]/15",
  Hazelnut: "bg-[#8a6239]/15",
  Walnut: "bg-[#6e4f38]/15",
  Peanut: "bg-[#b68b52]/15",
  Floral: "bg-[#d98bc4]/15",
  Jasmine: "bg-[#dcc9e8]/15",
  Rose: "bg-[#d1517a]/15",
  "Black Tea": "bg-[#8a4a2e]/15",
  Herbal: "bg-[#6b8f5e]/15",
  Spice: "bg-[#c2703a]/15",
  Cinnamon: "bg-[#a8622e]/15",
  Clove: "bg-[#6e2e2e]/15",
  Winey: "bg-[#6e2340]/15",
  Creamy: "bg-[#e8ddc8]/15",
  Juicy: "bg-[#e0554a]/15",
  Smoky: "bg-[#5a5a52]/15",
  Earthy: "bg-[#6b5638]/15",
  Malty: "bg-[#8a6f3a]/15",
  Tobacco: "bg-[#5c4530]/15",
};

/** フレーバー名から、そのフレーバー専用のアクセントカラー（Tailwindのbg-*クラス）を返す */
export const getFlavorAccentClass = (flavorName) => FLAVOR_BG_CLASS_BY_NAME[flavorName] ?? "bg-surface-2";

/** フレーバー名から、そのフレーバー専用のアクセントカラー（薄い塗り、15%不透明度のTailwindのbg-*クラス）を返す */
export const getFlavorTintClass = (flavorName) => FLAVOR_TINT_CLASS_BY_NAME[flavorName] ?? "bg-surface-1";

/** フレーバー名から、そのフレーバー専用のアクセントカラー（Tailwindのtext-*クラス）を返す */
export const getFlavorTextClass = (flavorName) => FLAVOR_TEXT_CLASS_BY_NAME[flavorName] ?? "text-text-secondary";

/** フレーバー名から、そのフレーバー専用のアクセントカラー（生のHEX文字列）を返す */
export const getFlavorHex = (flavorName) => FLAVOR_NAME_TO_HEX[flavorName] ?? FALLBACK_HEX;
