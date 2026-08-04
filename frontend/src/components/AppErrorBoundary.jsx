import { Component } from "react";
import { AlertCircle } from "lucide-react";

/**
 * アプリ全体を覆うエラーバウンダリ。
 *
 * 2026-08、GraphCanvas.jsxのライブラリ移行作業中に「依存関係が
 * 正しく読み込めずGraphPageのレンダーが丸ごと落ちる」障害が起きたとき、
 * エラーバウンダリが1つも無かったため、Navbarを含む画面全体が
 * 何の手がかりも無い真っ黒な画面になった（コンソールにも
 * 見つけにくい形でしかエラーが出ない）。
 *
 * Reactのエラーバウンダリはクラスコンポーネントでしか作れないため、
 * ここだけhookを使わない。i18nextはグローバルなインスタンスとして
 * 初期化されているが（main.jsxのimport "./i18n"）、ここは「何かが
 * 根本から壊れている」ときの最後の砦なので、あえて翻訳に依存しない
 * 固定文言にしている。
 */
class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("AppErrorBoundary caught an error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ctp-base px-4 text-center text-ctp-text">
        <AlertCircle size={32} strokeWidth={1.5} className="text-ctp-red" />
        <div>
          <p className="text-sm font-semibold">問題が発生しました</p>
          <p className="mt-1 text-sm text-ctp-subtext0">
            ページを再読み込みしてもう一度お試しください。
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg border border-ctp-overlay0/60 px-4 py-2 text-sm text-ctp-text transition-colors duration-150 hover:border-ctp-overlay0"
        >
          再読み込み
        </button>
      </div>
    );
  }
}

export default AppErrorBoundary;
