import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { dangerButtonClass, secondaryButtonClass } from "./formStyles";

/**
 * 取り消せない操作の確認ダイアログ。削除で使う。
 *
 * docs/design.md の UI Rules「削除には確認を入れる」に対応する。
 *
 * window.confirm を使わない理由:
 *   - 見た目をアプリに合わせられない
 *   - ブラウザによっては抑制されて何も出ないことがある
 *   - 何を消すのか（記録のタイトル）を示せない
 *
 * 実装で気をつけた点:
 *   - Escキーで閉じられる
 *   - 開いたときにキャンセル側へフォーカスを当てる。
 *     破壊的な操作にいきなりフォーカスを当てると、Enter連打で消えてしまう
 *   - 背景のスクロールを止める
 */
function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isProcessing = false,
  onConfirm,
  onCancel,
}) {
  const { t } = useTranslation();
  const resolvedConfirmLabel = confirmLabel ?? t("common.deleteConfirmLabel");
  const resolvedCancelLabel = cancelLabel ?? t("common.cancel");
  const cancelButtonRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    cancelButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !isProcessing) onCancel();
    };

    document.addEventListener("keydown", handleKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, isProcessing, onCancel]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={description ? "confirm-dialog-description" : undefined}
        className="w-full max-w-sm rounded-xl border border-ctp-surface1 bg-ctp-mantle p-5 shadow-xl"
      >
        <h2 id="confirm-dialog-title" className="text-base font-semibold text-ctp-text">
          {title}
        </h2>
        {description && (
          <p id="confirm-dialog-description" className="mt-2 text-sm text-ctp-subtext1">
            {description}
          </p>
        )}

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            ref={cancelButtonRef}
            onClick={onCancel}
            disabled={isProcessing}
            className={secondaryButtonClass}
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={dangerButtonClass}
          >
            {isProcessing ? t("common.deleting") : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmDialog;
