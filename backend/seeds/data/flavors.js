/**
 * フレーバーの初期候補。
 *
 * category は SCA のフレーバーホイールの大分類をゆるく参考にした。
 * 「自分は fruity ばかり選んでいる」という気づきにつながるよう、
 * 個別のフレーバーより1段上の粒度をあわせて持たせている。
 *
 * 初学者が迷わないよう、専門的すぎる語は入れていない
 * （docs/vision.md の対象ユーザーは「詳しい専門知識はない人」）。
 */
export const flavors = [
  // 果実系
  { name: "Citrus", category: "fruity" },
  { name: "Lemon", category: "fruity" },
  { name: "Orange", category: "fruity" },
  { name: "Berry", category: "fruity" },
  { name: "Strawberry", category: "fruity" },
  { name: "Blueberry", category: "fruity" },
  { name: "Stone Fruit", category: "fruity" },
  { name: "Apple", category: "fruity" },
  { name: "Grape", category: "fruity" },
  { name: "Tropical Fruit", category: "fruity" },

  // 甘さ系
  { name: "Chocolate", category: "sweet" },
  { name: "Dark Chocolate", category: "sweet" },
  { name: "Caramel", category: "sweet" },
  { name: "Brown Sugar", category: "sweet" },
  { name: "Honey", category: "sweet" },
  { name: "Vanilla", category: "sweet" },

  // ナッツ・穀物系
  { name: "Nutty", category: "nutty" },
  { name: "Almond", category: "nutty" },
  { name: "Hazelnut", category: "nutty" },

  // 花・香草系
  { name: "Floral", category: "floral" },
  { name: "Jasmine", category: "floral" },
  { name: "Black Tea", category: "floral" },
  { name: "Herbal", category: "floral" },

  // 香辛料系
  { name: "Spice", category: "spicy" },
  { name: "Cinnamon", category: "spicy" },

  // その他
  { name: "Winey", category: "other" },
  { name: "Creamy", category: "other" },
  { name: "Juicy", category: "other" },
  { name: "Smoky", category: "other" },
  { name: "Earthy", category: "other" },
];
