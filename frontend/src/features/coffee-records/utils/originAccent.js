/**
 * 産地ごとのアクセントカラー。
 *
 * 「その国を示すアクセント」として、HomeRecordCard.jsx の産地名の
 * 横に置く縦バーの色や、World Map・Graphの産地ノードの色を、産地ごとに
 * 変える。
 *
 * 2026-08、以前はここを産地名のハッシュ値から7色パレットへ割り当てる
 * 方式にしていた（同じ名前なら常に同じ色になり、産地が増えてもマスター側
 * の追加作業なしに自動で色が付くという利点があった）。しかし「色の衝突が
 * 気になる」「地理的にまとまりのある色にしたい」「重複は避けたい」という
 * 指摘を受け、ハッシュによる自動割り当てをやめ、20産地それぞれへ手動で
 * 決め打ちした対応表（`ORIGIN_NAME_TO_HEX`）へ切り替えた。
 *
 * 配色の考え方: 産地を4地域（東アフリカ／南米／中米+メキシコ／
 * アジア・中東）にグルーピングし、地域ごとに1つの色相を割り当てる。
 * 同じ地域の産地は同じ色相のまま、明度・彩度だけを段階的に変えて
 * 20件すべてを重複なく区別できるようにした（既存のCatppuccin Mocha
 * アクセント色と同じパステル寄りの明度帯 L67〜85% に収めている）。
 *
 * 産地マスターにcolorフィールドを追加する案もあったが、見た目だけの
 * 目的でバックエンドのスキーマを変える必要性は薄いため、フロントエンド
 * だけで完結する対応表にした。
 *
 * 【保守上の注意】この対応表はハッシュ方式と違って自動では増えない。
 * `backend/seeds/data/origins.js`へ新しい産地を追加したときは、
 * `frontend/src/features/map/utils/countryCodes.js`（地図の国コード
 * 対応表）と同様に、この`ORIGIN_NAME_TO_HEX`にも1行手動で追加すること。
 * 追加を忘れても、フォールバック（中立グレー）が使われるだけでエラーには
 * ならない。
 *
 * primary（主要アクション）とdanger（エラー・危険操作）は、
 * このアプリの他の箇所で意味を持たせているため、この対応表からは
 * 意図的に外している。
 */

/** 産地名 → 個別の色（HEX）。地域ごとにグループ化してある */
const ORIGIN_NAME_TO_HEX = {
  // 東アフリカ（オレンジ系）
  Ethiopia: "#ead8c8",
  Kenya: "#e8cdb5",
  Rwanda: "#e7bf9d",
  Burundi: "#e8b487",
  Tanzania: "#eaa76c",

  // 南米（グリーン系）
  Colombia: "#d3eac8",
  Brazil: "#c6e8b5",
  Peru: "#b6e79d",
  Bolivia: "#a7e887",
  Ecuador: "#96ea6c",

  // 中米+メキシコ（ブルー系）
  Guatemala: "#c8deea",
  "Costa Rica": "#bad9e8",
  Panama: "#acd3e7",
  "El Salvador": "#9dcee7",
  Honduras: "#8dc9e7",
  Nicaragua: "#7dc4e8",
  Mexico: "#6cc0ea",

  // アジア・中東（パープル系）
  Indonesia: "#dcc8ea",
  Yemen: "#c89de7",
  India: "#b56cea",
};

/** 対応表に無い産地名（追加し忘れ）のためのフォールバック */
const FALLBACK_HEX = "#6c7086";

// bg-*/fill-*/text-*版は同じ対応表を指す並行オブジェクト（同じキーが
// 同じ色になるよう対応を揃えている）。Tailwindはソースコードに実際に
// 書かれた完全なクラス名の文字列だけを見てCSSを生成するため、
// `` `bg-[${hex}]` ``のようにJS側で文字列結合して作ると検出されず
// CSSが生成されない。そのため3系統ぶん、全クラス名をリテラルで書き出す
// （2026-08、世界地図機能でbgTintClassを追加したときと同じ理由）
const ORIGIN_BG_CLASS_BY_NAME = {
  Ethiopia: "bg-[#ead8c8]",
  Kenya: "bg-[#e8cdb5]",
  Rwanda: "bg-[#e7bf9d]",
  Burundi: "bg-[#e8b487]",
  Tanzania: "bg-[#eaa76c]",
  Colombia: "bg-[#d3eac8]",
  Brazil: "bg-[#c6e8b5]",
  Peru: "bg-[#b6e79d]",
  Bolivia: "bg-[#a7e887]",
  Ecuador: "bg-[#96ea6c]",
  Guatemala: "bg-[#c8deea]",
  "Costa Rica": "bg-[#bad9e8]",
  Panama: "bg-[#acd3e7]",
  "El Salvador": "bg-[#9dcee7]",
  Honduras: "bg-[#8dc9e7]",
  Nicaragua: "bg-[#7dc4e8]",
  Mexico: "bg-[#6cc0ea]",
  Indonesia: "bg-[#dcc8ea]",
  Yemen: "bg-[#c89de7]",
  India: "bg-[#b56cea]",
};

const ORIGIN_FILL_CLASS_BY_NAME = {
  Ethiopia: "fill-[#ead8c8]",
  Kenya: "fill-[#e8cdb5]",
  Rwanda: "fill-[#e7bf9d]",
  Burundi: "fill-[#e8b487]",
  Tanzania: "fill-[#eaa76c]",
  Colombia: "fill-[#d3eac8]",
  Brazil: "fill-[#c6e8b5]",
  Peru: "fill-[#b6e79d]",
  Bolivia: "fill-[#a7e887]",
  Ecuador: "fill-[#96ea6c]",
  Guatemala: "fill-[#c8deea]",
  "Costa Rica": "fill-[#bad9e8]",
  Panama: "fill-[#acd3e7]",
  "El Salvador": "fill-[#9dcee7]",
  Honduras: "fill-[#8dc9e7]",
  Nicaragua: "fill-[#7dc4e8]",
  Mexico: "fill-[#6cc0ea]",
  Indonesia: "fill-[#dcc8ea]",
  Yemen: "fill-[#c89de7]",
  India: "fill-[#b56cea]",
};

const ORIGIN_TEXT_CLASS_BY_NAME = {
  Ethiopia: "text-[#ead8c8]",
  Kenya: "text-[#e8cdb5]",
  Rwanda: "text-[#e7bf9d]",
  Burundi: "text-[#e8b487]",
  Tanzania: "text-[#eaa76c]",
  Colombia: "text-[#d3eac8]",
  Brazil: "text-[#c6e8b5]",
  Peru: "text-[#b6e79d]",
  Bolivia: "text-[#a7e887]",
  Ecuador: "text-[#96ea6c]",
  Guatemala: "text-[#c8deea]",
  "Costa Rica": "text-[#bad9e8]",
  Panama: "text-[#acd3e7]",
  "El Salvador": "text-[#9dcee7]",
  Honduras: "text-[#8dc9e7]",
  Nicaragua: "text-[#7dc4e8]",
  Mexico: "text-[#6cc0ea]",
  Indonesia: "text-[#dcc8ea]",
  Yemen: "text-[#c89de7]",
  India: "text-[#b56cea]",
};

/** 産地名から、その産地専用のアクセントカラー（Tailwindのbg-*クラス）を返す */
export const getOriginAccentClass = (originName) => ORIGIN_BG_CLASS_BY_NAME[originName] ?? "bg-surface-2";

/** 産地名から、その産地専用のアクセントカラー（Tailwindのfill-*クラス。SVG用）を返す */
export const getOriginFillClass = (originName) => ORIGIN_FILL_CLASS_BY_NAME[originName] ?? "fill-surface-2";

/** 産地名から、その産地専用のアクセントカラー（Tailwindのtext-*クラス。アイコン用）を返す */
export const getOriginTextClass = (originName) => ORIGIN_TEXT_CLASS_BY_NAME[originName] ?? "text-text-tertiary";

/**
 * 産地名から、その産地専用のアクセントカラー（生のHEX文字列）を返す。
 * canvas描画（GraphCanvas.jsx）はTailwindクラスを使えず実際の色文字列が
 * 必要なため、Tailwindクラス版とは別にこちらを用意している。
 */
export const getOriginHex = (originName) => ORIGIN_NAME_TO_HEX[originName] ?? FALLBACK_HEX;
