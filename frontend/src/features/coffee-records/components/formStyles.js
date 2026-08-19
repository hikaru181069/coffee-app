/**
 * フォーム要素の共通クラス。
 *
 * 同じTailwindのクラスをJSXへ何度も書くと、変更のたびに
 * 全箇所を直すことになるのでここへ集約する。
 *
 * ダークテーマのトークン（frontend/src/index.css の @theme）をそのまま使う。
 * 2026-08、mobbin.comの実測値に合わせて配色・角丸・奥行きを刷新した。
 * 主要ボタンは色を使わず、明背景+暗文字の反転ピルボタン
 * （bg-inverse text-on-inverse rounded-full）に変更した
 * （prompts/design/00-design-principles.md 6.1参照）。
 */

const BASE_CONTROL =
  "w-full rounded-xl border bg-surface-1 px-3 py-2 text-sm text-text " +
  "placeholder:text-text-tertiary/60 transition-colors duration-150 " +
  "focus:outline-none focus:ring-2 focus:ring-primary/50 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/** エラーのある欄は枠線でも示す（色だけに頼らないよう、文言も別途出す） */
export const controlClass = (hasError) =>
  `${BASE_CONTROL} ${hasError ? "border-danger" : "border-line/60 hover:border-line"}`;

export const textareaClass = (hasError) => `${controlClass(hasError)} min-h-24 resize-y`;

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-inverse px-4 py-2 " +
  "text-sm font-semibold text-on-inverse transition-colors duration-150 " +
  "hover:bg-inverse/90 focus:outline-none focus:ring-2 focus:ring-primary/50 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-line/60 " +
  "bg-transparent px-4 py-2 text-sm font-medium text-text-secondary " +
  "transition-colors duration-150 hover:border-line hover:text-text " +
  "focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-danger px-4 py-2 " +
  "text-sm font-semibold text-on-inverse transition-colors duration-150 " +
  "hover:bg-danger/85 focus:outline-none focus:ring-2 focus:ring-danger/50 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const cardClass =
  "rounded-2xl border border-surface-2 bg-raised p-4 shadow-elevated sm:p-5";
