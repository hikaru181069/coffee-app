/**
 * デモ用のコーヒー記録データ。
 *
 * ポートフォリオとして見せる・面接でデモする際に、知識グラフが
 * 「見栄えする」ことを重視して組んでいる:
 *   - 同じ産地・フレーバーが複数記録にまたがるようにし、グラフ上で
 *     ノードが自然にクラスタ化される（同じ産地を繰り返し選ぶ、など）
 *   - home/cafeの両方、評価の高低、日付のばらつきを持たせ、
 *     一覧のフィルターやページ送りも試せるようにする
 *   - 一部の記録はあえて産地やフレーバーを設定せず、
 *     「孤立したrecordノード」も混ぜて null 項目の扱いを確認できるようにする
 *   - 2026-09、ブレンドコーヒー対応（「コーヒーの詳細」を複数持てる）に
 *     あわせて、componentsに2グループ持つ記録を2件混ぜた。産地ごとに
 *     異なる精製方法・品種を組み合わせ、1つの記録から複数のorigin/
 *     process/varietyノードへエッジが伸びる様子と、産地×精製方法の
 *     対応関係が正しく保たれる様子を実データで確認できるようにするため
 *
 * origin/variety/process/farmはコーヒーの詳細（components）1グループの
 * 中で名前で指定する。ObjectIdはseed実行時のDBの状態に依存するため、
 * ここでは持たない（seedDemoData.js が名前からマスターデータを引いて
 * IDへ変換する）。roastLevel/flavorsは記録全体で1つ（カップとしての
 * 結果）のため、componentsの外に置く（docs/domain-model.md参照）。
 */

export const demoRecords = [
  {
    title: "Ethiopia Yirgacheffe",
    consumedAt: "2026-06-02T08:30:00.000Z",
    recordType: "home",
    rating: 5,
    notes: "レモンのような明るい酸味と紅茶のような後味。今までで一番好みだった。",
    components: [{ origin: "Ethiopia", varieties: ["Heirloom"], process: "Washed" }],
    roastLevel: "light",
    flavors: ["Citrus", "Black Tea", "Floral"],
  },
  {
    title: "Ethiopia Guji Natural",
    consumedAt: "2026-06-09T09:00:00.000Z",
    recordType: "home",
    rating: 4,
    notes: "ベリー系の甘さが強い。ナチュラル特有の発酵感もある。",
    components: [{ origin: "Ethiopia", varieties: ["Heirloom"], process: "Natural" }],
    roastLevel: "light",
    flavors: ["Berry", "Winey"],
  },
  {
    title: "Blue Bottle - Ethiopia Worka",
    consumedAt: "2026-06-15T14:00:00.000Z",
    recordType: "cafe",
    cafeName: "Blue Bottle Coffee",
    rating: 5,
    notes: "カフェで飲んだが家で淹れたものよりさらにフローラル。",
    components: [{ origin: "Ethiopia", process: "Washed" }],
    roastLevel: "light",
    flavors: ["Floral", "Citrus"],
  },
  {
    title: "Kenya Nyeri AA",
    consumedAt: "2026-06-20T08:00:00.000Z",
    recordType: "home",
    rating: 5,
    notes: "トマトのような複雑な酸味。ブラックカラントの風味も。",
    components: [{ origin: "Kenya", varieties: ["SL28", "SL34"], process: "Washed" }],
    roastLevel: "medium-light",
    flavors: ["Berry", "Winey"],
  },
  {
    title: "Kenya Kirinyaga",
    consumedAt: "2026-06-27T08:15:00.000Z",
    recordType: "home",
    rating: 4,
    notes: "",
    components: [{ origin: "Kenya", varieties: ["SL28"], process: "Washed" }],
    roastLevel: "medium-light",
    flavors: ["Berry", "Citrus"],
  },
  {
    title: "Fuglen Tokyo - Kenya",
    consumedAt: "2026-07-02T15:30:00.000Z",
    recordType: "cafe",
    cafeName: "Fuglen Tokyo",
    rating: 4,
    notes: "北欧系ロースト、酸味が主役。",
    components: [{ origin: "Kenya" }],
    roastLevel: "light",
    flavors: ["Citrus"],
  },
  {
    title: "Colombia Huila",
    consumedAt: "2026-07-05T08:00:00.000Z",
    recordType: "home",
    rating: 3,
    notes: "バランス型。悪くはないが強い印象は無い。",
    components: [{ origin: "Colombia", varieties: ["Caturra"], process: "Washed" }],
    roastLevel: "medium",
    flavors: ["Caramel", "Nutty"],
  },
  {
    title: "Colombia Pink Bourbon",
    consumedAt: "2026-07-08T08:00:00.000Z",
    recordType: "home",
    rating: 4,
    notes: "ピンクブルボン、思ったよりフルーティー。",
    components: [{ origin: "Colombia", varieties: ["Pink Bourbon"], process: "Honey" }],
    roastLevel: "medium-light",
    flavors: ["Tropical Fruit", "Honey"],
  },
  {
    title: "Guatemala Antigua",
    consumedAt: "2026-07-11T08:30:00.000Z",
    recordType: "home",
    rating: 4,
    notes: "チョコレートのようなコクと、かすかなスパイス感。",
    components: [
      { origin: "Guatemala", farmName: "Finca El Injerto", varieties: ["Bourbon"], process: "Washed" },
    ],
    roastLevel: "medium",
    flavors: ["Chocolate", "Spice"],
  },
  {
    title: "Guatemala Huehuetenango",
    consumedAt: "2026-07-14T08:00:00.000Z",
    recordType: "home",
    rating: 3,
    notes: "",
    components: [{ origin: "Guatemala", process: "Washed" }],
    roastLevel: "medium",
    flavors: ["Nutty", "Caramel"],
  },
  {
    title: "% Arabica - Panama Geisha",
    consumedAt: "2026-07-18T13:00:00.000Z",
    recordType: "cafe",
    cafeName: "% Arabica",
    rating: 5,
    notes: "値段は張ったが、ジャスミンの香りが別格だった。",
    components: [{ origin: "Panama", varieties: ["Geisha"], process: "Washed" }],
    roastLevel: "light",
    flavors: ["Jasmine", "Floral", "Tropical Fruit"],
  },
  {
    title: "Brazil Cerrado",
    consumedAt: "2026-07-21T08:00:00.000Z",
    recordType: "home",
    rating: 3,
    notes: "ナッツ系でクセが無く、エスプレッソに合いそう。",
    components: [{ origin: "Brazil", process: "Natural" }],
    roastLevel: "medium-dark",
    flavors: ["Nutty", "Chocolate"],
  },
  {
    title: "Onibus Coffee - Ethiopia",
    consumedAt: "2026-07-24T16:00:00.000Z",
    recordType: "cafe",
    cafeName: "Onibus Coffee",
    rating: 5,
    notes: "行きつけの店。ここのエチオピアはいつも安定して美味しい。",
    components: [{ origin: "Ethiopia", process: "Natural" }],
    roastLevel: "light",
    flavors: ["Berry", "Floral"],
  },
  {
    title: "Rwanda Huye Mountain",
    consumedAt: "2026-07-27T08:00:00.000Z",
    recordType: "home",
    rating: 4,
    notes: "みかんのような優しい酸味。",
    components: [{ origin: "Rwanda", process: "Washed" }],
    roastLevel: "medium-light",
    flavors: ["Orange", "Honey"],
  },
  {
    title: "自家製ブレンド - Ethiopia × Guatemala",
    consumedAt: "2026-07-31T08:00:00.000Z",
    recordType: "home",
    rating: 4,
    notes: "エチオピアの華やかさとグアテマラのコクを半々でブレンド。",
    // 2026-09、コーヒーの詳細ごとに産地×精製方法×品種を対応づけられる
    // ようになったため、片方はNatural、もう片方はWashedという実際の
    // ブレンドらしい組み合わせにしている
    components: [
      { origin: "Ethiopia", varieties: ["Heirloom"], process: "Natural" },
      { origin: "Guatemala", farmName: "Finca El Injerto", varieties: ["Bourbon"], process: "Washed" },
    ],
    roastLevel: "medium",
    flavors: ["Floral", "Chocolate"],
  },
  {
    title: "Fuglen Tokyo - Signature Blend",
    consumedAt: "2026-08-02T09:00:00.000Z",
    recordType: "cafe",
    cafeName: "Fuglen Tokyo",
    rating: 4,
    notes: "エチオピアとケニアのブレンド。店のシグネチャーブレンド。",
    components: [
      { origin: "Ethiopia", process: "Natural" },
      { origin: "Kenya", process: "Washed" },
    ],
    roastLevel: "light",
    flavors: ["Berry", "Citrus"],
  },
  {
    title: "とりあえず買った豆",
    consumedAt: "2026-07-29T07:30:00.000Z",
    recordType: "home",
    rating: null,
    notes: "スーパーで買った無名の豆。詳細は不明。",
  },
];
