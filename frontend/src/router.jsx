/* eslint-disable react-refresh/only-export-components -- ルート定義ファイルのため、Fast Refresh対象のコンポーネントファイルとしては扱わない（lazy()の代入・フォールバック用コンポーネントがrouterのexportと同居する。ToastContext.jsxの同種の対応を参照） */
import { lazy, Suspense } from "react";
import { Route, createBrowserRouter, createRoutesFromElements } from "react-router-dom";
import { useTranslation } from "react-i18next";

import AppLayout from "./App";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ProfilePage from "./pages/ProfilePage";
import LandingPage from "./pages/LandingPage";
import RecordsPage from "./pages/RecordsPage";
import RecordFormPage from "./pages/RecordFormPage";
import RecordDetailPage from "./pages/RecordDetailPage";
import NotFoundPage from "./pages/NotFoundPage";

// GraphPageはreact-force-graph-2d（canvas描画・物理演算）を含み、
// 他の画面より明確に重い。このルートを開かないユーザーにその分を
// 読み込ませないよう、遅延読み込みにする。
const GraphPage = lazy(() => import("./pages/GraphPage"));
// WorldMapPageも同じ理由（world-atlasの地図データが740KB程度あり、
// 常設ナビに無くStatsからのリンクでしか開かれないページのため）で
// 遅延読み込みにする。
const WorldMapPage = lazy(() => import("./pages/WorldMapPage"));
// 2026-08、メインバンドルが1.24MB(gzip 186KB)まで増えていた監査を受け、
// GraphPage/WorldMapPageに続いて遅延読み込みにした。いずれもリンク経由
// でしか開かれず（常設ナビに無い。docs/design.md「Main Navigation」）、
// 初回に訪れるとは限らないページのため
const EntityDetailPage = lazy(() => import("./pages/EntityDetailPage"));
const DiagnosisPage = lazy(() => import("./pages/DiagnosisPage"));
// StatsPageは常設ナビの項目だがGraphPageと同じ扱いにした。理由は
// GraphPage/WorldMapPageと同じ判断基準（重さではなく「初回に必ず開くとは
// 限らない」）に合わせたもので、record作成・編集（RecordFormPage）や
// 一覧（RecordsPage）のような中心動線（docs/product.md「Record First」）
// は対象外にしている
const StatsPage = lazy(() => import("./pages/StatsPage"));

/**
 * 遅延読み込み中（チャンクのダウンロード待ち）のフォールバック。
 *
 * createRoutesFromElements に渡すJSXはモジュール読み込み時に組み立てる
 * ただの要素の記述であり、useTranslation()自体はこのコンポーネントが
 * 実際にレンダーされた瞬間（Suspenseがフォールバックした瞬間）にしか
 * 呼ばれない。そのためコンポーネント外（このファイルのトップレベル）で
 * ルート定義を組み立てても問題ない。
 */
function LazyPageFallback() {
  const { t } = useTranslation();
  return <p className="p-6 text-center text-sm text-text-tertiary">{t("common.loading")}</p>;
}

/**
 * アプリのルート定義。
 *
 * 2026-08、記録編集フォームの「保存忘れ確認」を全ナビゲーション経路
 * （ヘッダーの戻るリンク・キャンセルボタンだけでなく、ナビバーの他リンクや
 * ブラウザの戻る/進むボタンも含む）で一様に検知するため、React Routerの
 * `useBlocker`が必要になった。`useBlocker`はデータルーター
 * （createBrowserRouter）でしか動作しないため、従来の
 * `<BrowserRouter><App /></BrowserRouter>`（宣言的モード）から移行した。
 *
 * ルート定義自体は以前App.jsxのAnimatedRoutesが持っていたものをそのまま
 * 移植している（並び順も維持。/records/newを/records/:recordIdより先に
 * 置く理由などは各コメントを参照）。共通シェル（Navbar・BottomTabBar・
 * ページ遷移アニメーション）はApp.jsxのAppLayoutが担う（AnimatedRoutesが
 * 持っていたrouter/コンポーネントが混在すると、Vite Fast Refreshが
 * 効かなくなるため、ルート定義はこのファイルへ分離した）。
 */
export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppLayout />}>
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
        <Route
          path="/entities/:nodeId"
          element={
            <Suspense fallback={<LazyPageFallback />}>
              <EntityDetailPage />
            </Suspense>
          }
        />

        <Route
          path="/graph"
          element={
            <Suspense fallback={<LazyPageFallback />}>
              <GraphPage />
            </Suspense>
          }
        />

        <Route
          path="/stats"
          element={
            <Suspense fallback={<LazyPageFallback />}>
              <StatsPage />
            </Suspense>
          }
        />

        {/* 記録から判定する「コーヒータイプ」診断。常設ナビには含めない
            （Navbar.jsx・BottomTabBar.jsxのタブ数を増やさない方針。
            docs/design.md「Main Navigation」参照）。Home画面のDiscoverCard・
            Statsページからのリンク経由でのみ到達する */}
        <Route
          path="/diagnosis"
          element={
            <Suspense fallback={<LazyPageFallback />}>
              <DiagnosisPage />
            </Suspense>
          }
        />

        {/* 訪れた産地を世界地図上でハイライトする。Diagnosisと同じ理由で
            常設ナビには含めない。Statsページの「Collection」セクションの
            リンク経由でのみ到達する */}
        <Route
          path="/map"
          element={
            <Suspense fallback={<LazyPageFallback />}>
              <WorldMapPage />
            </Suspense>
          }
        />

        <Route path="/profile" element={<ProfilePage />} />

        {/* 存在しないURL。未ログインならProtectedRouteが先に/landingへ
            リダイレクトするため、ここへ来るのはログイン済みユーザーのみ */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Route>,
  ),
);
