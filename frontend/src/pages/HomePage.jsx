import { lazy, Suspense, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { getCurrentUser } from "../services/api/userApi";
import { clearAuthData, getAuthToken } from "../utils/authStorage";
import { isUnauthorizedError } from "../services/api/apiError";
import { useCoffeeRecords } from "../features/coffee-records/hooks/useCoffeeRecords";
import HomeRecordCard from "../features/coffee-records/components/HomeRecordCard";
import { RecordListSkeleton } from "../features/coffee-records/components/RecordListStates";
import { getErrorMessage } from "../utils/errorMessage";

// GraphPreviewはReact Flowを含み、GraphPageと同じ理由（App.jsxのコメント参照）で
// bundleを太らせる。Home自体は遅延読み込みしていないページなので、
// ここだけlazyにしてReact Flowを初回読み込みから外す。
const GraphPreview = lazy(() => import("../features/graph/components/GraphPreview"));

/**
 * ホーム画面。
 *
 * docs/design.md の Home 構成のうち、MVPで価値が高い3つに絞った:
 *   Welcome（挨拶）/ New Record CTA / Recent Records
 * 「よく登場する産地・フレーバー」のような集計表示は、同じ情報を
 * Graph画面でノードのrecordCountとして既に見られるため、ここでは
 * 重複させずGraphへの導線だけを置く（Progressive Disclosure）。
 *
 * 2026-08、Figmaでの再設計に合わせて構成を変更した:
 *   - New Record CTAを、ヘッダー右上の小さいボタンから
 *     「Record Coffee」という独立したセクション（大きな入力エリア）へ格上げした。
 *     Record First（docs/product-principles.md）をより強く表現するため。
 *   - Recent Recordsのカードは横並びグリッドにし、表示する情報を
 *     産地・銘柄・精製方法・フレーバーに絞った（HomeRecordCard.jsx）。
 *     日付・記録タイプは一覧画面（RecordCard.jsx）に残っているので
 *     情報としては失われない。Homeは「思い出す」ための場所と位置づけ、
 *     詳しい絞り込みや状態はRecordsPageに譲る。
 *
 * 2026-08、知識グラフを「作る」ものではなく「育つ」ものとして位置づける
 * プロダクト方針（docs/vision.md / docs/product-principles.md）に合わせて
 * さらに調整した:
 *   - New Record CTAは、記録が1件も無い最初の訪問時だけ大きく見せる。
 *     すでに記録があるリピーターには、同じCTAを毎回大きく出す必要は無いため
 *     小さいボタンへ縮小する（Progressive Disclosure）。
 *   - Recent Recordsの評価(★)を復活させた。Information Hierarchy
 *     （docs/design.md）で「②評価と感想」は「③つながり」より優先度が高いため。
 *   - 画面下部のGraphへの導線を、テキストだけのバナーから
 *     育っているグラフの縮小プレビュー（GraphPreview）へ差し替えた。
 *     「グラフが育っている」という実感そのものをHomeで見せるため。
 */

const RECENT_RECORDS_LIMIT = 5;

const getGreeting = (t) => {
  const hour = new Date().getHours();
  if (hour < 5) return t("home.greeting.evening");
  if (hour < 12) return t("home.greeting.morning");
  if (hour < 18) return t("home.greeting.afternoon");
  return t("home.greeting.evening");
};

function HomePage() {
  const { t } = useTranslation();
  const [user, setUser] = useState(null);
  const token = getAuthToken();

  useEffect(() => {
    getCurrentUser(token)
      .then(setUser)
      .catch((err) => {
        if (isUnauthorizedError(err)) clearAuthData();
      });
  }, [token]);

  // 最近の記録だけを取る。一覧の全機能（フィルター・ページ送り）は
  // RecordsPageの役割なので、ここでは最小限のfilterで5件に絞る
  const { records, isLoading, error } = useCoffeeRecords({
    page: 1,
    limit: RECENT_RECORDS_LIMIT,
    recordType: "",
    ratingMin: "",
  });

  // 記録がすでにあるユーザーには、毎回大きなCTAを出す必要が無い
  const isRepeatVisitor = !isLoading && records.length > 0;

  return (
    <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-ctp-text">
          {getGreeting(t)}
          {user?.name ? t("home.nameSuffix", { name: user.name }) : ""}.
        </h1>
        <p className="mt-1 text-sm text-ctp-subtext0">{t("home.subtitle")}</p>
      </header>

      {/* Record Coffee: 主要CTA。初回（記録が無い）は独立したセクションとして
          大きく見せ、Record Firstを強く表現する。すでに記録があるリピーター
          には、同じ強さで毎回出す必要が無いため小さいボタンへ縮小する */}
      <section className="mb-6">
        {!isRepeatVisitor && (
          <h2 className="mb-3 text-sm font-semibold text-ctp-text">
            {t("home.recordCoffeeHeading")}
          </h2>
        )}
        <Link
          to="/records/new"
          className={`flex items-center justify-center gap-2 rounded-xl border border-ctp-overlay0/60 text-ctp-subtext0 transition-colors duration-150 hover:border-ctp-overlay0 hover:text-ctp-text focus:outline-none focus:ring-2 focus:ring-ctp-blue/50 ${
            isRepeatVisitor ? "py-3" : "flex-col py-10"
          }`}
        >
          <Plus size={isRepeatVisitor ? 18 : 24} aria-hidden="true" />
          <span className="text-sm">{t("home.recordTodayCta")}</span>
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ctp-text">{t("home.recentRecords")}</h2>
          <Link
            to="/records"
            className="text-xs text-ctp-subtext0 underline underline-offset-2 hover:text-ctp-text"
          >
            {t("common.viewAll")}
          </Link>
        </div>

        {isLoading && <RecordListSkeleton count={3} />}
        {!isLoading && error && (
          <p className="text-sm text-ctp-red">{getErrorMessage(error, t)}</p>
        )}
        {!isLoading && !error && records.length === 0 && (
          <p className="rounded-xl border border-dashed border-ctp-overlay0/60 px-4 py-6 text-center text-sm text-ctp-subtext0">
            {t("records.emptyDesc")}
          </p>
        )}
        {!isLoading && !error && records.length > 0 && (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {records.map((record) => (
              <HomeRecordCard key={record.id} record={record} />
            ))}
          </ul>
        )}
      </section>

      <Suspense fallback={null}>
        <GraphPreview />
      </Suspense>
    </div>
  );
}

export default HomePage;
