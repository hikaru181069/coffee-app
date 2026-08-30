import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Calendar, Star } from "lucide-react";

import { useEntityDetail } from "../features/graph/hooks/useEntityDetail";
import { getNodeVisual } from "../features/graph/utils/nodeVisuals";
import { formatConsumedAtShort } from "../features/coffee-records/utils/recordFormat";
import { getErrorMessage } from "../utils/errorMessage";
import { cardClass, secondaryButtonClass } from "../features/coffee-records/components/formStyles";
import DiscoverSuggestions from "../features/discover/components/DiscoverSuggestions";
import BackLink from "../components/BackLink";
import StatCard from "../components/StatCard";
import { contentContainerClass } from "../styles/pageContainer";
import { useReveal } from "../hooks/useReveal";
import { revealDelayClass } from "../utils/revealDelay";

/**
 * エンティティ詳細ページ。
 *
 * docs/entity-detail.md参照。産地・農園・品種・精製方法・焙煎度・
 * フレーバー・カフェのどの種別でも同じページで表示する（typeで見た目を
 * 切り替えるgetNodeVisualと同じパターン。種別ごとに個別ページは作らない）。
 *
 * 知識グラフをただの可視化ではなくナビゲーションにする機能:
 * 関連する属性（RelatedAttributeGroup）のチップ自体もこのページへの
 * Linkにしており、産地→品種→フレーバーとエンティティ間を渡り歩ける。
 */
function EntityDetailPage() {
  const { nodeId } = useParams();
  const { t, i18n } = useTranslation();
  const { detail, isLoading, error } = useEntityDetail(nodeId);

  if (isLoading) {
    return (
      <div className={contentContainerClass}>
        <EntityDetailSkeleton />
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
  const relatedTypes = Object.keys(detail.relatedAttributes);

  return (
    <div className={contentContainerClass}>
      <BackLink />
      <header className="mt-3 mb-6">
        <div className="flex items-center gap-2">
          <Icon size={16} aria-hidden="true" className={visual.colorClass} />
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
            iconColorClass={visual.colorClass}
            iconBgClass={visual.bgTintClass}
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
              <RelatedAttributeGroup key={type} type={type} items={detail.relatedAttributes[type]} t={t} />
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
 */
function RelatedAttributeGroup({ type, items, t }) {
  const visual = getNodeVisual(type);
  const Icon = visual.icon;

  return (
    <div>
      <div className="mb-2.5 flex items-center gap-1.5">
        <Icon size={14} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
        <p className="text-sm font-medium text-text-secondary">{t(visual.labelKey)}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/entities/${encodeURIComponent(item.id)}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-transparent bg-surface-1 px-3.5 py-1.5 text-sm text-text-secondary transition-all duration-150 hover:-translate-y-px hover:border-line/60 hover:bg-surface-2 hover:text-text"
          >
            {item.label}
            <span className="font-mono text-xs text-text-tertiary">{item.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * 読み込み中のエンティティ詳細ページ。実際の構成
 * （header→統計カード3枚→グラフで見るボタン→関連属性チップ→関連記録一覧）
 * と同じ形の骨格を出す（RelatedAttributeGroupと同じくページローカルな
 * ヘルパー。entity-detail専用のfeatureディレクトリが無いため）。
 * 統計カードは共有のcomponents/StatCard.jsxを使うようになった
 * （flex-wrap＋アイコンバッジ）ため、骨格もそれに合わせた形にしている。
 */
function EntityDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <div className="mb-6 flex flex-col gap-2">
        <div className="skeleton-block h-3 w-16 rounded" />
        <div className="skeleton-block h-6 w-40 rounded" />
      </div>

      <div className={`${cardClass} mb-6`}>
        <div className="flex flex-wrap gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="min-w-44 rounded-2xl border border-surface-2 bg-raised p-4">
              <div className="flex items-center gap-3">
                <div className="skeleton-block h-9 w-9 flex-shrink-0 rounded-full" />
                <div>
                  <div className="skeleton-block h-3 w-14 rounded" />
                  <div className="skeleton-block mt-2 h-4 w-10 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="skeleton-block mb-6 h-9 w-36 rounded-lg" />

      <div className={`${cardClass} mb-6`}>
        <div className="skeleton-block h-4 w-32 rounded" />
        <div className="mt-5 flex flex-wrap gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton-block h-8 w-24 rounded-full" />
          ))}
        </div>
      </div>

      <div className={cardClass}>
        <div className="skeleton-block h-4 w-28 rounded" />
        <div className="mt-4 flex flex-col gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton-block h-14 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default EntityDetailPage;
