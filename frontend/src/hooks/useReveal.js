import { useCallback, useEffect, useRef, useState } from "react";

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
