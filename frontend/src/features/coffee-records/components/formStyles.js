/**
 * フォーム要素の共通クラス。
 *
 * 同じTailwindのクラスをJSXへ何度も書くと、変更のたびに
 * 全箇所を直すことになるのでここへ集約する。
 *
 * 既存のダークテーマのトークン（ctp-*、frontend/src/index.css の @theme）を
 * そのまま使う。配色の刷新は Phase 6 の担当で、
 * 機能実装と混ぜない（prompts/03 の Constraints）。
 */

const BASE_CONTROL =
  "w-full rounded-lg border bg-ctp-surface0 px-3 py-2 text-sm text-ctp-text " +
  "placeholder:text-ctp-subtext0/60 transition-colors duration-150 " +
  "focus:outline-none focus:ring-2 focus:ring-ctp-blue/50 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/** エラーのある欄は枠線でも示す（色だけに頼らないよう、文言も別途出す） */
export const controlClass = (hasError) =>
  `${BASE_CONTROL} ${hasError ? "border-ctp-red" : "border-ctp-overlay0/60 hover:border-ctp-overlay0"}`;

export const textareaClass = (hasError) => `${controlClass(hasError)} min-h-24 resize-y`;

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-ctp-blue px-4 py-2 " +
  "text-sm font-semibold text-white transition-colors duration-150 " +
  "hover:bg-ctp-blue/85 focus:outline-none focus:ring-2 focus:ring-ctp-blue/50 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-ctp-overlay0/60 " +
  "bg-transparent px-4 py-2 text-sm font-medium text-ctp-subtext1 " +
  "transition-colors duration-150 hover:border-ctp-overlay0 hover:text-ctp-text " +
  "focus:outline-none focus:ring-2 focus:ring-ctp-blue/50 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-ctp-red px-4 py-2 " +
  "text-sm font-semibold text-ctp-crust transition-colors duration-150 " +
  "hover:bg-ctp-red/85 focus:outline-none focus:ring-2 focus:ring-ctp-red/50 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const cardClass =
  "rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 sm:p-5";
