import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Share2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import "../features/coffee-records/coffee-records.css";
import { getCurrentUser } from "../services/api/userApi";
import { clearAuthData, getAuthToken } from "../utils/authStorage";
import { isUnauthorizedError } from "../services/api/apiError";
import { useCoffeeRecords } from "../features/coffee-records/hooks/useCoffeeRecords";
import HomeRecordCard from "../features/coffee-records/components/HomeRecordCard";
import { RecordListSkeleton } from "../features/coffee-records/components/RecordListStates";
import { getErrorMessage } from "../utils/errorMessage";

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
 *     日付・評価・記録タイプは一覧画面（RecordCard.jsx）に残っているので
 *     情報としては失われない。Homeは「思い出す」ための場所と位置づけ、
 *     詳しい絞り込みや状態はRecordsPageに譲る。
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

  return (
    <div className="coffee-page mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-ctp-text">
          {getGreeting(t)}
          {user?.name ? t("home.nameSuffix", { name: user.name }) : ""}.
        </h1>
        <p className="mt-1 text-sm text-ctp-subtext0">{t("home.subtitle")}</p>
      </header>

      {/* Record Coffee: 主要CTA。ヘッダーの小さいボタンではなく独立した
          セクションにすることで、Record Firstをより強く表現する */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-ctp-text">
          {t("home.recordCoffeeHeading")}
        </h2>
        <Link
          to="/records/new"
          className="flex flex-col items-center justify-center gap-2 rounded-xl border border-ctp-overlay0/60 py-10 text-ctp-subtext0 transition-colors duration-150 hover:border-ctp-overlay0 hover:text-ctp-text focus:outline-none focus:ring-2 focus:ring-ctp-blue/50"
        >
          <Plus size={24} aria-hidden="true" />
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

      {!isLoading && records.length > 0 && (
        <Link
          to="/graph"
          className="mt-6 flex items-center justify-between gap-3 rounded-xl border border-ctp-surface1 bg-ctp-mantle px-4 py-3 transition-colors duration-150 hover:border-ctp-overlay0"
        >
          <span className="flex items-center gap-2 text-sm text-ctp-text">
            <Share2 size={16} aria-hidden="true" className="text-ctp-lavender" />
            {t("home.viewConnections")}
          </span>
          <span className="text-xs text-ctp-subtext0">{t("home.goToGraph")}</span>
        </Link>
      )}
    </div>
  );
}

export default HomePage;
