/**
 * マスターデータの名前を「比較用の形」へそろえるための正規化。
 *
 * なぜ必要か（docs/product-principles.md「One Source of Truth」）:
 *   ユーザーが "Ethiopia" と "ethiopia " と "Ethiopia" (全角スペース入り) を
 *   別々に登録してしまうと、知識グラフ上で同じ産地が3つのノードに分かれ、
 *   「自分はこの産地をよく選んでいる」という発見ができなくなる。
 *
 *   そこで各マスターは、表示用の name と、比較・重複判定用の normalizedName の
 *   2つを持つ。unique indexは normalizedName にだけ張る。
 *
 * やっていること:
 *   1. 全角スペースを半角へ
 *   2. 前後の空白を除去
 *   3. 連続する空白を1つへ
 *   4. 小文字へ
 *
 * 意図的にやっていないこと:
 *   ハイフンやアクセント記号の除去はしない。
 *   "medium-dark" と "medium dark" は別物として扱いたいケースがあり、
 *   MVPの段階で過度に丸めると、逆に区別できない不具合になるため。
 */
export const normalizeName = (value) => {
  if (typeof value !== "string") return "";

  return value
    .replace(/　/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
};
