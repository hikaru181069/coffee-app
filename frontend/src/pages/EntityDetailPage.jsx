import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, ChevronRight, Star } from "lucide-react";

import { useEntityDetail } from "../features/graph/hooks/useEntityDetail";
import { getNodeVisual } from "../features/graph/utils/nodeVisuals";
import { getNodeTextColorClass, getNodeTintBgClass } from "../features/graph/utils/nodeColor";
import { formatConsumedAtShort } from "../features/coffee-records/utils/recordFormat";
import { getErrorMessage } from "../utils/errorMessage";
import { cardClass, secondaryButtonClass } from "../features/coffee-records/components/formStyles";
import DiscoverSuggestions from "../features/discover/components/DiscoverSuggestions";
import BackLink from "../components/BackLink";
import CoffeeLoader from "../components/CoffeeLoader";
import StatCard from "../components/StatCard";
import { contentContainerClass } from "../styles/pageContainer";
import { useReveal } from "../hooks/useReveal";
import { revealDelayClass } from "../utils/revealDelay";

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

  if (isLoading) {
    return (
      <div className={contentContainerClass}>
        <CoffeeLoader size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={contentContainerClass}>
        <BackLink />
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
  const entityTintBgClass = getNodeTintBgClass({ type: detail.type, label: detail.label });
  const relatedTypes = Object.keys(detail.relatedAttributes);
  const nextTrail = [...trail, { id: detail.id, label: detail.label }];

  return (
    <div className={contentContainerClass}>
      {trail.length > 0 ? <EntityTrail trail={trail} current={detail.label} t={t} /> : <BackLink />}
      <header className="mt-3 mb-6">
        <div className="flex items-center gap-2">
          <Icon size={16} aria-hidden="true" className={entityColorClass} />
          <span className="text-xs text-text-tertiary">{t(visual.labelKey)}</span>
        </div>
        <h1 className="mt-1 text-xl font-bold text-text">{detail.label}</h1>
      </header>

      {/* 2026-08、「ページが少し寂しい」という指摘を受け、Statsページの
          StatCard.jsxと同じアイコンバッジ+flex-wrapのカードにした
          （components/StatCard.jsxとして共有化。以前はこのページ専用の
          ローカルなStatCardを持っていた）。記録数はこのエンティティ自身の
          ノード種別アイコン・色（visual）を再利用し、平均評価・最後に
          飲んだ日はStatsページのOverviewStats.jsxと同じ配色にした */}
      {/* 2026-08、見出しの無いこの統計カード行だけ外枠が無く、他セクション
          （関連する属性・関連する記録・Discover提案）とカード化の扱いが
          揃っていないという指摘を受けた。「見出しの有無」で例外を作らず、
          レポート系ページのコンテンツブロックは一律cardClassで囲む、
          という単純なルールへ統一した（docs/design.md「UI Rules」
          「カード化の使い分け」参照）。StatCardは他cardClassにネストされる
          ため`flat`にする */}
      <section className={`${cardClass} mb-6`}>
        <div className="flex flex-wrap gap-3">
          <StatCard
            label={t("entityDetail.recordCount")}
            value={t("search.recordCount", { count: detail.recordCount })}
            icon={Icon}
            iconColorClass={entityColorClass}
            iconBgClass={entityTintBgClass}
            flat
          />
          <StatCard
            label={t("entityDetail.avgRating")}
            value={detail.avgRating ?? "—"}
            icon={Star}
            iconColorClass="text-warn"
            iconBgClass="bg-warn/15"
            flat
          />
          <StatCard
            label={t("entityDetail.lastConsumed")}
            value={detail.lastConsumedAt ? formatConsumedAtShort(detail.lastConsumedAt, i18n.language) : "—"}
            icon={Calendar}
            iconColorClass="text-text-tertiary"
            iconBgClass="bg-surface-2"
            flat
          />
        </div>
      </section>

      <div className="mb-6 flex flex-wrap gap-2">
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

      {relatedTypes.length > 0 && (
        <section className={`${cardClass} mb-6`}>
          <h2 className="text-base font-semibold text-text">{t("entityDetail.relatedHeading")}</h2>
          <div className="mt-5 flex flex-col gap-5">
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

      <section className={cardClass}>
        <h2 className="text-base font-semibold text-text">{t("entityDetail.recordsHeading")}</h2>
        <ul className="mt-4 flex flex-col gap-2">
          {detail.records.map((record, index) => (
            <RelatedRecordRow key={record.id} record={record} index={index} language={i18n.language} />
          ))}
        </ul>
      </section>
    </div>
  );
}

/** 関連記録一覧の1行。スクロールインで段階的にカスケード表示する */
function RelatedRecordRow({ record, index, language }) {
  const [ref, isVisible] = useReveal();

  return (
    <li ref={ref} className={`reveal ${isVisible ? "visible" : ""} ${revealDelayClass(index)}`}>
      <Link
        to={`/records/${record.id}`}
        className="block rounded-lg border border-surface-2 px-3 py-2 transition-colors duration-150 hover:border-line"
      >
        <p className="truncate text-sm font-medium text-text">{record.title}</p>
        <p className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
          <span className="font-mono">{formatConsumedAtShort(record.consumedAt, language)}</span>
          {record.rating !== null && (
            <span className="flex items-center gap-0.5 text-warn">
              <Star size={10} aria-hidden="true" fill="currentColor" strokeWidth={0} />
              <span className="font-mono">{record.rating}</span>
            </span>
          )}
        </p>
        {record.notesExcerpt && (
          <p className="mt-1 truncate text-xs italic text-text-secondary">{record.notesExcerpt}</p>
        )}
      </Link>
    </li>
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
            className={`inline-flex items-center gap-1.5 rounded-full border border-transparent px-3.5 py-1.5 text-sm font-medium transition-all duration-150 hover:-translate-y-px hover:border-line/60 ${getNodeTintBgClass({ type, label: item.label })} ${getNodeTextColorClass({ type, label: item.label })}`}
          >
            {item.label}
            <span className="font-mono text-xs text-text-tertiary">{item.count}</span>
          </Link>
        ))}
        {hiddenCount > 0 && (
          <button
            type="button"
            onClick={() => setIsExpanded(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line/60 px-3.5 py-1.5 text-sm text-text-tertiary transition-colors duration-150 hover:border-line hover:text-text"
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
