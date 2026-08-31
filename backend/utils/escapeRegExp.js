/**
 * ユーザー入力を安全にMongoの$regexへ渡すため、正規表現の特殊文字を
 * エスケープする（docs/architecture.md Security）。未検証の入力を
 * そのまま正規表現として渡すと、意図しないパターンマッチや高コストな
 * バックトラック（ReDoS）につながるおそれがある。
 *
 * 2026-08、`masterDataRepository.js`だけが持っていたこの処理を、
 * `recordFilterValidator.js`（記録タイトルの部分一致検索）でも
 * 同じ用途で必要になったため共通化した。
 */
export const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
