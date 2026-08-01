import { useTranslation } from "react-i18next";

/**
 * ラベル・入力欄・エラーメッセージをまとめる枠。
 *
 * docs/design.md の UI Rules に対応する:
 *   - 任意項目を必須に見せない → 必須のときだけ「必須」を出す
 *   - 色だけで状態を表現しない → エラーは赤色に加えて文言でも示す
 *
 * エラーメッセージは入力欄のすぐ下に出す（prompts/03 の Form UX）。
 * 画面上部にまとめて出すと、どの欄の話か分からなくなる。
 */
function FormField({ id, label, required = false, hint, error, children }) {
  const { t } = useTranslation();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = hint ? `${id}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-ctp-text">
        {label}
        {required ? (
          <span className="rounded bg-ctp-surface1 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ctp-subtext1">
            {t("common.required")}
          </span>
        ) : (
          <span className="text-[11px] font-normal text-ctp-subtext0">{t("common.optional")}</span>
        )}
      </label>

      {hint && (
        <p id={hintId} className="text-xs text-ctp-subtext0">
          {hint}
        </p>
      )}

      {/* aria-describedby / aria-invalid を子へ渡せるよう、
          呼び出し側が id と aria 属性を付ける前提にしている */}
      {children}

      {error && (
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs text-ctp-red">
          <span aria-hidden="true">⚠</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  );
}

export default FormField;
