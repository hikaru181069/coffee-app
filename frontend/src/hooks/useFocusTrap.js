import { useEffect, useRef } from "react";

/**
 * オーバーレイ系UI（ドロワー・サイドパネル等）のキーボード操作を
 * 一式まとめたhook。
 *
 * features/coffee-records/components/ConfirmDialog.jsxで最初に実装した
 * 「Escapeで閉じる・開いたら中の要素へフォーカスを移す・Tabキーを
 * コンテナ内だけで循環させる・閉じたら元の要素へフォーカスを戻す」を、
 * components/Navbar.jsx（モバイルドロワー）・features/graph/components/
 * NodeDetailPanel.jsx（グラフのサイドパネル）でも同じ形で必要になった
 * ため共通化した。ConfirmDialog.jsx自身は「ボタン2つだけの一度きりの
 * ダイアログ」で、body のスクロールロックなど独自の事情もあるため、
 * 無理に置き換えず既存のまま残している。
 *
 * @param {React.RefObject<HTMLElement>} containerRef フォーカスを閉じ込める要素
 * @param {boolean} isOpen
 * @param {() => void} onClose
 */
export const useFocusTrap = (containerRef, isOpen, onClose) => {
  const triggerElementRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return undefined;

    triggerElementRef.current = document.activeElement;

    const getFocusable = () =>
      containerRef.current?.querySelectorAll(
        'button:not(:disabled), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
      );

    // 開いた瞬間、中の最初のフォーカス可能な要素へ移す。
    // これが無いと、キーボードユーザーはEscape以外に操作の起点を持てない
    // （Tabを押しても背景側の要素から始まってしまう）
    getFocusable()?.[0]?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const focusable = getFocusable();
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      // 開く前にフォーカスがあった要素がまだDOMにあれば、そこへ戻す
      if (triggerElementRef.current && document.contains(triggerElementRef.current)) {
        triggerElementRef.current.focus();
      }
    };
  }, [isOpen, containerRef, onClose]);
};
