import { Outlet, useLocation } from "react-router-dom";
import { ToastProvider } from "./contexts/ToastContext";
import "./App.css";
import Navbar from "./components/Navbar";
import BottomTabBar from "./components/BottomTabBar";

// 未ログイン向けの3ページ。通常のNavbar（Home/Records/Graph/Stats）は
// 認証必須のページへのリンクのため、ここでは出さず、各ページ自身が
// 軽量なAuthNav（components/AuthNav.jsx）を表示する
// （2026-08、以前は/landingのみ対象だったが、Login/Registerでも同じ
// 理由で通常のNavbarを出すべきではないことが分かり対象を広げた）。
const PUBLIC_PATHS = ["/landing", "/login", "/register"];

/**
 * アプリ共通のシェル（Navbar・BottomTabBar・ページ遷移アニメーション）。
 *
 * ルート定義自体はrouter.jsxが持ち、このコンポーネントはそこから
 * レイアウトのルート要素として使われる（`<Outlet />`が実際のページを
 * 描画する）。
 *
 * 2026-08、`<BrowserRouter>`（宣言的モード）から`createBrowserRouter`
 * （データルーターモード）へ移行した際、以前この1ファイル
 * （旧App.jsx）が持っていた「ルート定義（AnimatedRoutes）」と
 * 「共通シェル（App）」のうち、ルート定義側をrouter.jsxへ分離した。
 * router（非コンポーネントの値）とコンポーネントを同じファイルから
 * exportすると、Vite Fast Refreshが効かなくなる（eslint.config.jsの
 * react-refresh/only-export-componentsにも反する）ため。
 */
function AppLayout() {
  const location = useLocation();
  const isPublicPage = PUBLIC_PATHS.includes(location.pathname);

  return (
    <ToastProvider>
      {!isPublicPage && <Navbar />}
      <main className={isPublicPage ? "" : "pt-14 pb-16 md:pb-0"}>
        {/* ページ遷移アニメーション。
            location.key を React の key に渡すことで、ページが変わるたびに
            コンポーネントが再マウントされ、CSS アニメーション
            (page-transition) が毎回リセットされる。Navbar はこのdivの外に
            あるため、ナビ時にちらつかない。

            注意: この仕組みは setSearchParams などURLを書き換える操作でも
            location.key が変わり、意図せずページ全体を再マウントさせる
            （features/graph/pages/GraphPage.jsx で実際に踏んだ）。
            URLだけを書き換えたい場合は window.history.replaceState を使うこと。 */}
        <div key={location.key} className="page-transition">
          <Outlet />
        </div>
      </main>
      {!isPublicPage && <BottomTabBar />}
    </ToastProvider>
  );
}

export default AppLayout;
