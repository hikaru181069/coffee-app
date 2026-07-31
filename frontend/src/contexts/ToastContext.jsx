// [Phase 5] Toast notification system
// React Context を使ってアプリ全体からトースト通知を呼び出せるようにする。
// Props として親から子へ関数を渡す「prop drilling」を避けるために Context を採用。
// どのページからも useToast() を呼ぶだけで通知を出せる。

import { createContext, useCallback, useContext, useRef, useState } from "react";

const ToastContext = createContext(null);

// モジュールスコープの ID カウンター
// React の state の外に置くことで、再レンダリングをトリガーせずに一意な ID を発番できる
let nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // タイマー ID を ref で管理する理由:
  // - state に入れると不要な再レンダリングが発生する
  // - ref はレンダリングに影響しない「メモ帳」として使う
  const timersRef = useRef({});

  // leaving: true にすることで CSS の退場アニメーションを先に走らせてから
  // 実際に DOM から削除する（いきなり消えるのを防ぐ）
  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      delete timersRef.current[id];
    }, 300); // CSS のアウトアニメーション時間（280ms）に合わせて 300ms 待つ
  }, []);

  // useCallback: addToast 関数の参照を安定させる
  // 依存配列に dismiss を入れることで dismiss が変わったときだけ再生成される
  const addToast = useCallback(
    (message, type = "info", duration = 3000) => {
      const id = ++nextId;
      setToasts((prev) => [...prev, { id, message, type, leaving: false }]);
      // duration ms 後に自動で消す
      timersRef.current[id] = setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss],
  );

  return (
    // Context の value に addToast と dismiss を渡す
    // children のどのコンポーネントからでも useToast() で取得できる
    <ToastContext.Provider value={{ addToast, dismiss }}>
      {children}
      {/* トースト UI は Provider の中に直接置く → App.jsx を汚さない */}
      <div className="toast-container" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div
            key={t.id}
            // leaving: true のとき toast--leaving クラスが付き退場アニメーションが始まる
            className={`toast toast--${t.type}${t.leaving ? " toast--leaving" : ""}`}
            role="status"
          >
            {/* type に応じてアイコンを切り替え */}
            <span className="toast-icon">
              {t.type === "success" && "✓"}
              {t.type === "error" && "✕"}
              {t.type === "info" && "i"}
              {t.type === "warn" && "!"}
            </span>
            <span className="toast-message">{t.message}</span>
            {/* 手動で閉じるボタン */}
            <button
              type="button"
              className="toast-close"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// カスタムフック: Context を取得するための薄いラッパー
// ToastProvider の外で呼ばれた場合にわかりやすいエラーを出す
export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside ToastProvider");
  return ctx;
};
