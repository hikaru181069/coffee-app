import { useCallback, useEffect, useRef, useState } from "react";

/**
 * 動きは「意味のある変化」の時だけに使う（2026-08、UI/UXレビューで
 * 「初期表示なのに一瞬空白に見える」という指摘を受けて方針を明確化した）。
 *
 * IntersectionObserverは要素が最初からビューポート内にあっても、
 * 発火は必ず次のフレーム以降（非同期）になる。そのため、マウント直後に
 * 画面内へ本来もう見えているはずの要素まで、一瞬フェード演出の空白
 * 状態を経由してしまっていた。マウント時点で既に画面内にある要素は
 * `getBoundingClientRect()`で同期的に判定し、監視せず即座に表示する。
 * オブザーバーを使うのは、まだ画面外にありスクロールで後から現れる
 * 要素だけにする。
 */
export function useReveal({ threshold = 0.1, rootMargin = "0px 0px -48px 0px" } = {}) {
  const [isVisible, setIsVisible] = useState(false);
  const observerRef = useRef(null);

  const ref = useCallback(
    (el) => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const alreadyInViewport = rect.top < window.innerHeight && rect.bottom > 0;
      if (alreadyInViewport) {
        setIsVisible(true);
        return;
      }

      observerRef.current = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observerRef.current?.disconnect();
          }
        },
        { threshold, rootMargin },
      );
      observerRef.current.observe(el);
    },
    [threshold, rootMargin],
  );

  useEffect(() => {
    return () => observerRef.current?.disconnect();
  }, []);

  return [ref, isVisible];
}
