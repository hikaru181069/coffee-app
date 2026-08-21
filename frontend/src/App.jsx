import { lazy, Suspense } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ProtectedRoute from "./components/ProtectedRoute";
import { ToastProvider } from "./contexts/ToastContext";
import "./App.css";
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import BottomTabBar from "./components/BottomTabBar";
import ProfilePage from "./pages/ProfilePage";
import LandingPage from "./pages/LandingPage";

import RecordsPage from "./pages/RecordsPage";
import RecordFormPage from "./pages/RecordFormPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import EntityDetailPage from "./pages/EntityDetailPage";
import StatsPage from "./pages/StatsPage";
import NotFoundPage from "./pages/NotFoundPage";
// GraphPageはreact-force-graph-2d（canvas描画・物理演算）を含み、
// 他の画面より明確に重い。このルートを開かないユーザーにその分を
// 読み込ませないよう、遅延読み込みにする。
const GraphPage = lazy(() => import("./pages/GraphPage"));

// ページ遷移アニメーション。
// location.key を React の key に渡すことで、ページが変わるたびにコンポーネントが
// 再マウントされ、CSS アニメーション (page-transition) が毎回リセットされる。
// Navbar は AnimatedRoutes の外にあるため、ナビ時にちらつかない。
//
// 注意: この仕組みは setSearchParams などURLを書き換える操作でも
// location.key が変わり、意図せずページ全体を再マウントさせる
// （features/graph/pages/GraphPage.jsx で実際に踏んだ）。
// URLだけを書き換えたい場合は window.history.replaceState を使うこと。
function AnimatedRoutes() {
  const { t } = useTranslation();
  const location = useLocation();
  return (
    <div key={location.key} className="page-transition">
      <Routes>
        {/* Public routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/" element={<HomePage />} />

          {/* 記録の一覧・作成・詳細・編集。
              /records/new を /records/:recordId より先に置く。
              後ろにすると "new" が recordId として解釈されてしまう */}
          <Route path="/records" element={<RecordsPage />} />
          <Route path="/records/new" element={<RecordFormPage />} />
          <Route path="/records/:recordId" element={<RecordDetailPage />} />
          <Route path="/records/:recordId/edit" element={<RecordFormPage />} />

          {/* 知識グラフの属性ノード（産地・農園・品種・精製方法・焙煎度・
              フレーバー・カフェ）1件の詳細ページ。nodeIdは"origin:507f..."
              のようなstable ID（URLエンコードして渡す） */}
          <Route path="/entities/:nodeId" element={<EntityDetailPage />} />

          <Route
            path="/graph"
            element={
              <Suspense
                fallback={
                  <p className="p-6 text-center text-sm text-text-tertiary">{t("common.loading")}</p>
                }
              >
                <GraphPage />
              </Suspense>
            }
          />

          <Route path="/stats" element={<StatsPage />} />

          <Route path="/profile" element={<ProfilePage />} />

          {/* 存在しないURL。未ログインならProtectedRouteが先に/landingへ
              リダイレクトするため、ここへ来るのはログイン済みユーザーのみ */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </div>
  );
}

// 未ログイン向けの3ページ。通常のNavbar（Home/Records/Graph/Stats）は
// 認証必須のページへのリンクのため、ここでは出さず、各ページ自身が
// 軽量なAuthNav（components/AuthNav.jsx）を表示する
// （2026-08、以前は/landingのみ対象だったが、Login/Registerでも同じ
// 理由で通常のNavbarを出すべきではないことが分かり対象を広げた）。
const PUBLIC_PATHS = ["/landing", "/login", "/register"];

function App() {
  const location = useLocation();
  const isPublicPage = PUBLIC_PATHS.includes(location.pathname);

  return (
    <ToastProvider>
      {!isPublicPage && <Navbar />}
      <main className={isPublicPage ? "" : "pt-14 pb-16 md:pb-0"}>
        <AnimatedRoutes />
      </main>
      {!isPublicPage && <BottomTabBar />}
    </ToastProvider>
  );
}

export default App;
