import { useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion as Motion } from "framer-motion";
import { ChevronDown } from "lucide-react";

const MARGIN = 8;

/**
 * 「コーヒーキャンバス」の任意項目1つぶんの、小さいボタン＋ポップオーバー。
 *
 * 2026-09、記録体験の作り直しで追加した。フレーバー・農園・品種・
 * 精製方法・焙煎度・ロースター名・店名・メモといった任意項目を、
 * 従来のようにインラインで全展開すると、実データの件数（フレーバー
 * 41種等）でキャンバスが縦に長くなり過ぎてしまう。代わりに各項目を
 * 「現在値を示す小さいボタン」だけにし、クリックしたときだけその場に
 * 小さなポップオーバーを開いて編集する。ボタンの帯は項目数が増えても
 * 折り返すだけなので、キャンバス本体の高さがほぼ変わらない
 * （Artifactモックアップ「Coffee Canvas v2」で検証済み）。
 *
 * ポップオーバーはボタンの実座標（getBoundingClientRect）を基準に
 * position:fixedで置く。画面右端・下端に収まらない場合は自動で
 * 左寄せ／上向きへ切り替える（ユーザーからの「位置が不自然」という
 * 指摘を受けた対応）。位置計算はペイント前に終わらせたいので
 * useEffectではなくuseLayoutEffectを使う。
 *
 * 開閉のアニメーションはFramer Motionの本物のバネ物理
 * （`type: "spring"`）。このアプリの記録フォームで既に使っている質感
 * （DiscoveryBadge.jsx等）と揃えている。
 */
function PropertyButton({ icon: Icon, label, valueLabel, hasValue, disabled = false, children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, openUpward: false });
  const buttonRef = useRef(null);
  const popRef = useRef(null);

  useLayoutEffect(() => {
    if (!isOpen) return undefined;

    const computePosition = () => {
      if (!buttonRef.current || !popRef.current) return;

      const btnRect = buttonRef.current.getBoundingClientRect();
      const popRect = popRef.current.getBoundingClientRect();

      let left = btnRect.left;
      if (left + popRect.width > window.innerWidth - MARGIN) {
        left = Math.max(MARGIN, btnRect.right - popRect.width);
      }

      const openUpward = btnRect.bottom + popRect.height + MARGIN > window.innerHeight - MARGIN;
      const top = openUpward
        ? Math.max(MARGIN, btnRect.top - popRect.height - MARGIN)
        : btnRect.bottom + MARGIN;

      setPosition({ top, left, openUpward });
    };

    computePosition();

    const handlePointerDown = (event) => {
      if (buttonRef.current?.contains(event.target) || popRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", computePosition);
    window.addEventListener("scroll", computePosition, true);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", computePosition);
      window.removeEventListener("scroll", computePosition, true);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-1.5 rounded-full border bg-surface-1 px-3 py-1.5 text-sm transition-colors duration-150 hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-60 ${
          isOpen ? "border-primary bg-surface-2" : "border-line/60"
        }`}
      >
        {Icon && <Icon size={14} aria-hidden="true" className="text-text-tertiary" />}
        <span className="text-text-tertiary">{label}</span>
        <span className={`max-w-[9rem] truncate ${hasValue ? "font-medium text-text" : "text-text-tertiary"}`}>
          {valueLabel}
        </span>
        <ChevronDown
          size={12}
          aria-hidden="true"
          className={`text-text-tertiary transition-transform duration-150 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <Motion.div
            ref={popRef}
            role="dialog"
            initial={{ opacity: 0, scale: 0.96, y: position.openUpward ? 6 : -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: position.openUpward ? 6 : -6 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            style={{ position: "fixed", top: position.top, left: position.left, zIndex: 30 }}
            className="max-h-[min(320px,60vh)] w-max min-w-[220px] max-w-[min(88vw,22rem)] overflow-y-auto rounded-2xl border border-surface-2 bg-raised p-3.5 shadow-panel"
          >
            {children}
          </Motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default PropertyButton;
