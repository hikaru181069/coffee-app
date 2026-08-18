import { useEffect, useState } from "react";
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
// GraphPreviewは以前はreact-force-graph-2dを縮小描画しておりlazy importが
// 必要だったが、静的なイラスト+件数表示へ変更した際に依存が無くなった
// ため、他のコンポーネントと同じ通常のimportに戻した。
import GraphPreview from "../features/graph/components/GraphPreview";
import DiscoverCard from "../features/discover/components/DiscoverCard";

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
 *
 * 2026-08、Insight機能（docs/insights.md）を追加した。グラフは見る側が
 * 自分で関係性を読み取る必要があるため、アプリ側から意味のある一文
 * （InsightBanner）をGraphPreviewの上に配置し、発見体験を後押しする。
 *
 * 2026-08、GraphPreviewの中身を、実データの縮小描画から静的なイラスト+
 * 見出し+タグライン+ノード数・つながり数の実数字へ変更した。160px程度の
 * 高さでは実データを描いてもノードが小さすぎて読めず、「知識ベース感」を
 * 伝える役割を果たせていなかったため（features/graph/components/
 * GraphPreview.jsxのコメント参照）。
 *
 * 2026-08、`lg`以上の2カラム化（メイン列/サイドバー列）を一度試したが、
 * ユーザー判断により撤回し、元の1カラム縦積み（CTA→Recent Records→
 * Insight→GraphPreviewの順）へ戻した。
 *
 * 2026-08、CTA・Recent Recordsは1カラムのまま、Insight（左）と
 * GraphPreview（右）だけを横並びにした。最初はユーザー指定通り固定px幅
 * （400px/1000px）で実装したが、コンテナ幅に収まらず横スクロールが
 * 発生する画面幅があったため、コンテナいっぱいに広がる（fill container）
 * よう`flex-[2]`/`flex-[5]`（400:1000と同じ2:5の比率）へ変更した。
 * 高さは両カードとも400pxで揃えたまま。
 *
 * 2026-08、Discover機能（docs/discover.md）を追加した際、最初はHome画面
 * 下部に控えめな1行のテキストリンク（Discoverへの導線）を別途置いたが、
 * 「見つけにくい」という指摘と、「Record→Connect→Discoverという
 * プロダクトの方向性をHome画面でも明確にしたい」という要望から、
 * InsightBanner（Insightの一文）とその導線を1枚の「Discover」カード
 * （`DiscoverCard.jsx`）へ統合した。裏側のデータ・ロジック（Insight＝
 * MongoDBのみ、Discover＝MongoDB+静的CQIデータ）はそれぞれ独立したまま
 * で、統合したのはあくまで見せ方だけ（`DiscoverCard.jsx`のコメント参照）。
 */

const RECENT_RECORDS_LIMIT = 6;

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
  // RecordsPageの役割なので、ここでは最小限のfilterで6件に絞る
  const { records, isLoading, error } = useCoffeeRecords({
    page: 1,
    limit: RECENT_RECORDS_LIMIT,
    recordType: "",
    ratingMin: "",
  });

  // 記録がすでにあるユーザーには、毎回大きなCTAを出す必要が無い
  const isRepeatVisitor = !isLoading && records.length > 0;

  return (
    <div className="coffee-page mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6">
      <header className="mb-6">
        <h1 className="text-xl font-bold text-text">
          {getGreeting(t)}
          {user?.name ? t("home.nameSuffix", { name: user.name }) : ""}.
        </h1>
        <p className="mt-1 text-sm text-text-tertiary">{t("home.subtitle")}</p>
      </header>

      {/* Record Coffee: 主要CTA。初回（記録が無い）は独立したセクションとして
          大きく見せ、Record Firstを強く表現する。すでに記録があるリピーター
          には、同じ強さで毎回出す必要が無いため小さいボタンへ縮小する */}
      <section className="mb-6">
        {!isRepeatVisitor && (
          <h2 className="mb-3 text-sm font-semibold text-text">
            {t("home.recordCoffeeHeading")}
          </h2>
        )}
        <Link
          to="/records/new"
          className={`flex items-center justify-center gap-2 rounded-xl border border-line/60 text-text-tertiary transition-colors duration-150 hover:border-line hover:text-text focus:outline-none focus:ring-2 focus:ring-primary/50 ${
            isRepeatVisitor ? "py-3" : "flex-col py-10"
          }`}
        >
          <Plus size={isRepeatVisitor ? 18 : 24} aria-hidden="true" />
          <span className="text-sm">{t("home.recordTodayCta")}</span>
        </Link>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text">{t("home.recentRecords")}</h2>
          <Link
            to="/records"
            className="text-xs text-text-tertiary underline underline-offset-2 hover:text-text"
          >
            {t("common.viewAll")}
          </Link>
        </div>

        {isLoading && <RecordListSkeleton count={3} />}
        {!isLoading && error && (
          <p className="text-sm text-danger">{getErrorMessage(error, t)}</p>
        )}
        {!isLoading && !error && records.length === 0 && (
          <p className="rounded-xl border border-dashed border-line/60 px-4 py-6 text-center text-sm text-text-tertiary">
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

      {/* Discoverカード（左）とGraphPreview（右）を横並びに配置。固定px幅だと
          コンテナ幅に収まらず横スクロールが発生していたため、コンテナの
          幅いっぱいに広がるよう、元の400:1000の比率（2:5）でflex-growさせる。
          高さは両カードとも400pxで揃える。DiscoverCardはInsightの一文と
          Discoverの導線を1枚のカードにまとめたもの（ユーザーと相談して決定）。
          `lg`未満は横並びのままだとDiscoverCardが極端に狭くなり文章が
          1文字ずつ折り返る不具合が実機で確認されたため、`lg`未満は
          縦積み（高さ固定を外し、それぞれ内容に応じた高さにする） */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-row">
        <div className="min-w-0 lg:h-[400px] lg:flex-[2]">
          <DiscoverCard />
        </div>
        <div className="h-[400px] min-w-0 lg:flex-[5]">
          <GraphPreview />
        </div>
      </div>
    </div>
  );
}

export default HomePage;
