import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronRight, Share2, Star } from "lucide-react";

import { useEntityDetail } from "../features/graph/hooks/useEntityDetail";
import { getNodeVisual } from "../features/graph/utils/nodeVisuals";
import { getNodeTextColorClass, getNodeTintBgClass } from "../features/graph/utils/nodeColor";
import { formatConsumedAtShort } from "../features/coffee-records/utils/recordFormat";
import { getErrorMessage } from "../utils/errorMessage";
import { cardClass, secondaryButtonClass } from "../features/coffee-records/components/formStyles";
import DiscoverSuggestions from "../features/discover/components/DiscoverSuggestions";
import BackLink from "../components/BackLink";
import CoffeeLoader from "../components/CoffeeLoader";
import { KpiStrip, KpiTile } from "../components/KpiStrip";
import { wideContainerClass } from "../styles/pageContainer";

/**
 * エンティティ詳細ページ。
 *
 * docs/features.md「Entity Detail」参照。産地・農園・品種・精製方法・焙煎度・
 * フレーバー・カフェのどの種別でも同じページで表示する（typeで見た目を
 * 切り替えるgetNodeVisualと同じパターン。種別ごとに個別ページは作らない）。
 *
 * 知識グラフをただの可視化ではなくナビゲーションにする機能:
 * 関連する属性（RelatedAttributeGroup）のチップ自体もこのページへの
 * Linkにしており、産地→品種→フレーバーとエンティティ間を渡り歩ける。
 *
 * 2026-08、この「渡り歩き」を繰り返すと、元の場所へ戻るのに単純な
 * 「← Back」（navigate(-1)）を何度も押す必要があるという指摘を受けた。
 * そこで、実際にたどってきたエンティティの経路を`location.state.trail`
 * として次のページへ運び、パンくず風の`EntityTrail`で表示するように
 * した。アプリの固定的な階層を示す一般的なパンくずとは違い、この
 * セッションで実際にチップをたどった経路をそのまま積み上げるだけなので、
 * 「複数の場所から来るページに固定パンくずを付けると実態と食い違う」
 * という問題は起きない（検索結果・Stats・RecordDetailなど、チップ経由
 * 以外からこのページへ来た場合はtrailが空のままなので、従来通り
 * `<BackLink />`を表示する）。
 *
 * 2026-08、上記の直後に「パンくずの先頭タグを押すと`<BackLink />`に
 * 戻るが、そこから『戻る』を押すとパンくず（直前にいたエンティティ）
 * へ戻ってしまう」という指摘を受けた。原因は、チップ・パンくず経由の
 * 遷移が`navigate()`の既定動作（履歴を積む＝push）だったため、渡り歩く
 * たびにブラウザ履歴が積み上がり、`navigate(-1)`が「渡り歩く前の場所」
 * ではなく「1つ前に見ていたエンティティ」に戻ってしまうこと。
 * `RelatedAttributeGroup`・`EntityTrail`のLinkに`replace`を付け、渡り歩く
 * 操作を常に履歴の置き換えにした。これにより渡り歩いた経路そのものは
 * 1つの履歴エントリの中で更新され続け、`navigate(-1)`は常に「渡り歩き
 * 全体を始める前にいたページ」（Stats・検索結果・RecordDetail等）へ
 * 戻る。エンティティ間の移動自体はパンくず・チップのクリックで行うため、
 * 履歴を積まなくても操作性は変わらない。
 */
function EntityDetailPage() {
  const { nodeId } = useParams();
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const trail = location.state?.trail ?? [];
  const { detail, isLoading, error } = useEntityDetail(nodeId);

  // 2026-09、パンくず/BackLink（location.state.trailだけで決まり、
  // detailのfetchを必要としない）をローディング判定より前に出し、
  // 読み込み中も「戻る」導線が消えないようにした
  const backNav = trail.length > 0 ? <EntityTrail trail={trail} current={null} t={t} /> : <BackLink />;

  if (isLoading) {
    return (
      <div className={wideContainerClass}>
        {backNav}
        <div className="mt-3">
          <CoffeeLoader size="lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={wideContainerClass}>
        {backNav}
        <p className="mt-3 text-sm text-danger">{getErrorMessage(error, t)}</p>
      </div>
    );
  }

  if (!detail) return null;

  const visual = getNodeVisual(detail.type);
  const Icon = visual.icon;
  // このエンティティ自身（detail.type + detail.label）の色。産地・
  // フレーバーは値ごとの個別色を使う（utils/nodeColor.js参照。Graph画面で
  // 見るこのノードと同じ色にするため、種別共通のvisual.colorClassでは
  // なくこちらを使う）
  const entityColorClass = getNodeTextColorClass({ type: detail.type, label: detail.label });
  const relatedTypes = Object.keys(detail.relatedAttributes);
  const nextTrail = [...trail, { id: detail.id, label: detail.label }];

  // 2026-09、「種別ごとの内訳」カード用の集計。個々の値（例: Berry/Floral）
  // ではなく種別（例: flavor）単位の合計のため、値ごとの個別色ではなく
  // 型共通色（getNodeVisual）を使う（docs/design.md「値ごとの個別色と
  // 型共通色の一貫性」の、集計値・複数値の集合は型共通色のままという
  // 方針に沿う）
  const relatedTypeBreakdown = relatedTypes
    .map((type) => ({
      type,
      total: detail.relatedAttributes[type].reduce((sum, item) => sum + item.count, 0),
    }))
    .sort((a, b) => b.total - a.total);
  const maxRelatedTotal = Math.max(...relatedTypeBreakdown.map((entry) => entry.total), 1);

  return (
    <div className={`${wideContainerClass} lg:flex lg:h-[calc(100vh-3.5rem)] lg:flex-col`}>
      {trail.length > 0 ? <EntityTrail trail={trail} current={detail.label} t={t} /> : <BackLink />}
      <header className="mt-3 mb-6">
        <div className="flex items-center gap-2">
          <Icon size={16} aria-hidden="true" className={entityColorClass} />
          <span className="text-xs text-text-tertiary">{t(visual.labelKey)}</span>
        </div>
        <h1 className="mt-1 text-xl font-bold text-text">{detail.label}</h1>
      </header>

      {/* 2026-08、「ページが少し寂しい」という指摘を受け、アイコンバッジ
          付きのKPI表示を追加した。記録数はこのエンティティ自身の
          ノード種別アイコン・色（visual）を再利用し、平均評価・最後に
          飲んだ日はStatsページのOverviewStats.jsxと同じ配色にした。
          2026-09、ダッシュボード風の作り直しで、Artifactモックの区切り線
          付き統計ストリップ（`KpiStrip`/`KpiTile`、components/KpiStrip.jsx）
          へ差し替えた。あわせて関連する種別数（何種類の属性とつながって
          いるか）のタイルを追加した。単一のノード種別に対応しないため、
          lastConsumedと同じ中立色（text-tertiary）にしている */}
      <KpiStrip>
        <KpiTile
          label={t("entityDetail.recordCount")}
          value={t("search.recordCount", { count: detail.recordCount })}
          icon={Icon}
          iconColorClass={entityColorClass}
        />
        <KpiTile
          label={t("entityDetail.avgRating")}
          value={detail.avgRating ?? "—"}
          icon={Star}
          iconColorClass="text-warn"
        />
        <KpiTile
          label={t("entityDetail.lastConsumed")}
          value={detail.lastConsumedAt ? formatConsumedAtShort(detail.lastConsumedAt, i18n.language) : "—"}
          icon={Calendar}
          iconColorClass="text-text-tertiary"
        />
        <KpiTile
          label={t("entityDetail.relatedTypesCount")}
          value={relatedTypes.length}
          icon={Share2}
          iconColorClass="text-text-tertiary"
        />
      </KpiStrip>

      {/* ── ダッシュボード本体 ───────────────────────
          2026-09、「entitiesページをダッシュボード風にする」再設計
          （RecordDetailPage.jsxと同じ方針）。lg以上では2カラム（関連する
          属性・記録を扱う列/操作・提案を扱う列）のグリッドにし、ページ
          自体の高さをビューポートに収める。関連する属性・関連する記録は
          件数が伸びやすいため内部スクロールにし、操作リンク・Discover
          提案は内容量が決まっているため自然な高さのまま置く。lg未満
          （モバイル）ではこの制約を外し、従来通り1カラムで縦にスクロール
          する。 */}
      <div className="mt-6 flex flex-col gap-6 lg:flex-1 lg:min-h-0 lg:grid lg:grid-cols-[1.6fr_1fr] lg:gap-5">
        {/* ── メイン列: 関連する属性・記録 ─────────────── */}
        <div className="flex flex-col gap-6 lg:min-h-0 lg:gap-4 lg:overflow-y-auto lg:pr-1">
          {relatedTypes.length > 0 && (
            <section className={`${cardClass} lg:flex lg:min-h-0 lg:flex-1 lg:flex-col`}>
              <h2 className="text-base font-semibold text-text">{t("entityDetail.relatedHeading")}</h2>
              <div className="mt-5 flex flex-col gap-5 lg:grid lg:min-h-0 lg:flex-1 lg:grid-cols-2 lg:gap-x-6 lg:gap-y-5 lg:overflow-y-auto lg:pr-1">
                {relatedTypes.map((type) => (
                  <RelatedAttributeGroup
                    key={type}
                    type={type}
                    items={detail.relatedAttributes[type]}
                    t={t}
                    trail={nextTrail}
                  />
                ))}
              </div>
            </section>
          )}

          <section className={`${cardClass} lg:flex lg:min-h-0 lg:flex-1 lg:flex-col`}>
            <h2 className="text-base font-semibold text-text">{t("entityDetail.recordsHeading")}</h2>
            <div className="mt-4 overflow-x-auto lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:pr-1">
              <table className="w-full min-w-[28rem] border-collapse text-left">
                <thead>
                  <tr className="border-b border-surface-2 text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    <th className="pb-2 pr-4 font-semibold">{t("entityDetail.recordsTableTitle")}</th>
                    <th className="pb-2 pr-4 font-semibold">{t("entityDetail.recordsTableDate")}</th>
                    <th className="pb-2 pr-4 font-semibold">{t("entityDetail.recordsTableRating")}</th>
                    <th className="pb-2 font-semibold">{t("entityDetail.recordsTableNotes")}</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.records.map((record) => (
                    <RelatedRecordRow key={record.id} record={record} language={i18n.language} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        {/* ── サイドバー列: 内訳・操作・Discover提案 ─────────── */}
        <div className="flex flex-col gap-6 lg:min-h-0 lg:gap-4 lg:overflow-y-auto lg:pr-1">
          {relatedTypeBreakdown.length > 0 && (
            <section className={cardClass}>
              <h2 className="text-base font-semibold text-text">{t("entityDetail.breakdownHeading")}</h2>
              <div className="mt-4 flex flex-col gap-3">
                {relatedTypeBreakdown.map(({ type, total }) => {
                  const typeVisual = getNodeVisual(type);
                  return (
                    <div key={type} className="flex items-center gap-3">
                      <span className="flex w-20 flex-shrink-0 items-center gap-1.5 truncate text-xs text-text-secondary">
                        <span className={`h-2 w-2 flex-shrink-0 rounded-full ${typeVisual.solidBgClass}`} />
                        {t(typeVisual.labelKey)}
                      </span>
                      <div className="h-1.5 flex-1 bg-surface-1">
                        <div
                          className={`h-full ${typeVisual.solidBgClass}`}
                          style={{ width: `${(total / maxRelatedTotal) * 100}%` }}
                        />
                      </div>
                      <span className="w-6 flex-shrink-0 text-right font-mono text-xs text-text-tertiary">
                        {total}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          <div className="flex flex-wrap gap-2">
            <Link to={`/graph?focus=${encodeURIComponent(detail.id)}`} className={secondaryButtonClass}>
              {t("entityDetail.viewInGraph")}
            </Link>
            {/* 世界地図は産地専用の機能（docs/features.md「World Map」）のため、
                産地ノードを見ているときだけ導線を出す。地図側にその国だけへ
                フォーカスする仕組みは無く、地図全体を開くだけ（Graphの
                ?focus=のような絞り込みは今回のスコープ外） */}
            {detail.type === "origin" && (
              <Link to="/map" className={secondaryButtonClass}>
                {t("entityDetail.viewOnMap")}
              </Link>
            )}
          </div>

          {detail.type === "origin" && <DiscoverSuggestions nodeId={detail.id} />}
        </div>
      </div>
    </div>
  );
}

/**
 * 関連記録一覧の1行。
 *
 * 2026-09、Artifactモックに合わせてカード形式（`<li>`+`<Link>`）から
 * 表形式（`<tr>`+`<td>`）へ変更した。行のスクロールイン演出（reveal）は
 * `transform`が`<tr>`で仕様上不安定なため今回は付けていない
 * （個々のカードだった頃だけの演出だったので、機能的な後退ではない）。
 */
function RelatedRecordRow({ record, language }) {
  return (
    <tr className="border-b border-surface-1 last:border-none">
      <td className="max-w-0 py-2.5 pr-4">
        <Link
          to={`/records/${record.id}`}
          className="block truncate text-sm font-medium text-text transition-colors duration-150 hover:text-text-secondary hover:underline"
        >
          {record.title}
        </Link>
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4 font-mono text-xs text-text-tertiary">
        {formatConsumedAtShort(record.consumedAt, language)}
      </td>
      <td className="whitespace-nowrap py-2.5 pr-4">
        {record.rating !== null && (
          <span className="inline-flex items-center gap-0.5 font-mono text-xs text-warn">
            <Star size={10} aria-hidden="true" fill="currentColor" strokeWidth={0} />
            {record.rating}
          </span>
        )}
      </td>
      <td className="max-w-0 py-2.5 text-xs italic text-text-tertiary">
        {record.notesExcerpt && <span className="block truncate">{record.notesExcerpt}</span>}
      </td>
    </tr>
  );
}

/**
 * 関連する属性1種別分のグループ（例: フレーバー → Berry, Floral, Citrus）。
 * チップ自体をそのエンティティの詳細ページへのLinkにする。
 *
 * 2026-08、「小さくて見づらい。目玉のGraph機能につながる部分なので
 * 目立たせる価値がある」という指摘を受けた。以前は`visual`（種別の
 * アイコン・色）をグループ見出しの翻訳にしか使っておらず、肝心の
 * チップ自体は無彩色のままだった。GraphFilters.jsxのノード種別ボタンと
 * 同じ「アイコン＋色」をグループ見出しに追加し、チップ自体も文字・
 * パディングを拡大してRecordCard.jsxのタグと同じホバー時の浮き上がりを
 * 加えた。Graph画面のフィルター・凡例と同じ視覚言語を再利用することで、
 * 新しい色を増やさずに「これはグラフのノードである」という一貫性を
 * 伝える。
 *
 * 2026-08、バックエンド（entityDetailBuilder.js）の種別ごと5件上限を
 * 撤廃したのにあわせ、フロントエンドでは最初の5件だけ表示し、それ以上
 * あれば「もっと見る」ボタンで残りを展開する（追加のAPIリクエストは
 * 発生しない。既に全件受け取っているため）。
 */
const INITIAL_VISIBLE_RELATED_COUNT = 5;

function RelatedAttributeGroup({ type, items, t, trail }) {
  const visual = getNodeVisual(type);
  const Icon = visual.icon;
  const [isExpanded, setIsExpanded] = useState(false);

  const visibleItems = isExpanded ? items : items.slice(0, INITIAL_VISIBLE_RELATED_COUNT);
  const hiddenCount = items.length - visibleItems.length;

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5">
        <Icon size={14} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
        <p className="text-sm font-medium text-text-secondary">{t(visual.labelKey)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {visibleItems.map((item) => (
          <Link
            key={item.id}
            to={`/entities/${encodeURIComponent(item.id)}`}
            state={{ trail }}
            replace
            className={`inline-flex items-center gap-1.5 rounded-none border border-transparent px-3.5 py-1.5 text-sm font-medium transition-all duration-150 hover:-translate-y-px hover:border-line/60 ${getNodeTintBgClass({ type, label: item.label })} ${getNodeTextColorClass({ type, label: item.label })}`}
          >
            {item.label}
            <span className="font-mono text-xs text-text-tertiary">{item.count}</span>
          </Link>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center gap-1.5 rounded-none border border-dashed border-line/60 px-3.5 py-1.5 text-sm text-text-tertiary transition-colors duration-150 hover:border-line hover:text-text"
          >
            {t("entityDetail.showMoreRelated", { count: hiddenCount })}
          </button>
        )}
      </div>
    </div>
  );
}

/**
 * 実際にたどってきたエンティティの経路を見せるパンくず。
 * 過去の各エンティティはLink（クリックするとそこまでで打ち切った
 * trailを持って戻る）、現在のエンティティ名だけプレーンテキスト。
 */
function EntityTrail({ trail, current, t }) {
  return (
    <nav aria-label={t("entityDetail.trailAriaLabel")} className="flex flex-wrap items-center gap-1.5 text-sm">
      {trail.map((crumb, index) => (
        <span key={crumb.id} className="flex items-center gap-1.5">
          <Link
            to={`/entities/${encodeURIComponent(crumb.id)}`}
            state={{ trail: trail.slice(0, index) }}
            replace
            className="text-text-tertiary transition-colors duration-150 hover:text-text"
          >
            {crumb.label}
          </Link>
          <ChevronRight size={14} aria-hidden="true" className="flex-shrink-0 text-line" />
        </span>
      ))}
      <span className="truncate text-text-secondary">{current}</span>
    </nav>
  );
}

export default EntityDetailPage;
