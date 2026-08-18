/**
 * フォーム要素の共通クラス。
 *
 * 同じTailwindのクラスをJSXへ何度も書くと、変更のたびに
 * 全箇所を直すことになるのでここへ集約する。
 *
 * ダークテーマのトークン（frontend/src/index.css の @theme）をそのまま使う。
 * 2026-08、Linear実測値からモス系の差し色へ配色を刷新した際に、トークン名も
 * ctp-* からセマンティックな名前（primary/danger等）へ改名した
 * （prompts/design/00-design-principles.md 6.1参照）。
 */

const BASE_CONTROL =
  "w-full rounded-lg border bg-surface-1 px-3 py-2 text-sm text-text " +
  "placeholder:text-text-tertiary/60 transition-colors duration-150 " +
  "focus:outline-none focus:ring-2 focus:ring-primary/50 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/** エラーのある欄は枠線でも示す（色だけに頼らないよう、文言も別途出す） */
export const controlClass = (hasError) =>
  `${BASE_CONTROL} ${hasError ? "border-danger" : "border-line/60 hover:border-line"}`;

export const textareaClass = (hasError) => `${controlClass(hasError)} min-h-24 resize-y`;

export const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 " +
  "text-sm font-semibold text-base transition-colors duration-150 " +
  "hover:bg-primary/85 focus:outline-none focus:ring-2 focus:ring-primary/50 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-line/60 " +
  "bg-transparent px-4 py-2 text-sm font-medium text-text-secondary " +
  "transition-colors duration-150 hover:border-line hover:text-text " +
  "focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-60";

export const dangerButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2 " +
  "text-sm font-semibold text-base transition-colors duration-150 " +
  "hover:bg-danger/85 focus:outline-none focus:ring-2 focus:ring-danger/50 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export const cardClass =
  "rounded-xl border border-surface-2 bg-raised p-4 sm:p-5";
