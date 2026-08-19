import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";

import { useEntityDetail } from "../features/graph/hooks/useEntityDetail";
import { getNodeVisual } from "../features/graph/utils/nodeVisuals";
import { formatConsumedAtShort } from "../features/coffee-records/utils/recordFormat";
import { getErrorMessage } from "../utils/errorMessage";
import { cardClass, secondaryButtonClass } from "../features/coffee-records/components/formStyles";
import DiscoverSuggestions from "../features/discover/components/DiscoverSuggestions";
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
      <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
        <EntityDetailSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
        <p className="text-sm text-danger">{getErrorMessage(error, t)}</p>
      </div>
    );
  }

  if (!detail) return null;

  const visual = getNodeVisual(detail.type);
  const Icon = visual.icon;
  const relatedTypes = Object.keys(detail.relatedAttributes);

  return (
    <div className="coffee-page mx-auto w-full max-w-[900px] px-4 py-6 sm:px-6">
      <header className="mb-6">
        <div className="flex items-center gap-2">
          <Icon size={16} aria-hidden="true" className={visual.colorClass} />
          <span className="text-xs text-text-tertiary">{t(visual.labelKey)}</span>
        </div>
        <h1 className="mt-1 text-xl font-bold text-text">{detail.label}</h1>
      </header>

      <section className="mb-6 grid grid-cols-3 gap-3">
        <StatCard
          label={t("entityDetail.recordCount")}
          value={t("search.recordCount", { count: detail.recordCount })}
        />
        <StatCard
          label={t("entityDetail.avgRating")}
          value={
            detail.avgRating != null ? (
              <span className="inline-flex items-center gap-1">
                <Star size={14} aria-hidden="true" fill="currentColor" strokeWidth={0} className="text-warn" />
                {detail.avgRating}
              </span>
            ) : (
              "—"
            )
          }
        />
        <StatCard
          label={t("entityDetail.lastConsumed")}
          value={detail.lastConsumedAt ? formatConsumedAtShort(detail.lastConsumedAt, i18n.language) : "—"}
        />
      </section>

      <Link
        to={`/graph?focus=${encodeURIComponent(detail.id)}`}
        className={`${secondaryButtonClass} mb-6`}
      >
        {t("entityDetail.viewInGraph")}
      </Link>

      {detail.type === "origin" && <DiscoverSuggestions nodeId={detail.id} />}

      {relatedTypes.length > 0 && (
        <section className="mb-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-text">{t("entityDetail.relatedHeading")}</h2>
          {relatedTypes.map((type) => (
            <RelatedAttributeGroup key={type} type={type} items={detail.relatedAttributes[type]} t={t} />
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-text">{t("entityDetail.recordsHeading")}</h2>
        <ul className="flex flex-col gap-2">
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
          <p className="mt-1 truncate text-xs text-text-secondary">{record.notesExcerpt}</p>
        )}
      </Link>
    </li>
  );
}

/** 統計1件のカード（記録数・平均評価・最終記録日） */
function StatCard({ label, value }) {
  return (
    <div className={cardClass}>
      <p className="text-xs text-text-tertiary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}

/**
 * 関連する属性1種別分のグループ（例: フレーバー → Berry, Floral, Citrus）。
 * チップ自体をそのエンティティの詳細ページへのLinkにする。
 */
function RelatedAttributeGroup({ type, items, t }) {
  const visual = getNodeVisual(type);

  return (
    <div>
      <p className="mb-2 text-xs text-text-tertiary">{t(visual.labelKey)}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={`/entities/${encodeURIComponent(item.id)}`}
            className="inline-flex items-center gap-1 rounded-full bg-surface-1 px-3 py-1 text-xs text-text-secondary transition-colors duration-150 hover:bg-surface-2 hover:text-text"
          >
            {item.label}
            <span className="font-mono text-text-tertiary">{item.count}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * 読み込み中のエンティティ詳細ページ。実際の構成
 * （header→統計カード3枚→グラフで見るボタン→関連属性チップ→関連記録一覧）
 * と同じ形の骨格を出す（StatCard/RelatedAttributeGroupと同じくページ
 * ローカルなヘルパー。entity-detail専用のfeatureディレクトリが無いため）。
 */
function EntityDetailSkeleton() {
  const { t } = useTranslation();
  return (
    <div aria-busy="true" aria-label={t("common.loading")}>
      <div className="mb-6 flex flex-col gap-2">
        <div className="skeleton-block h-3 w-16 rounded" />
        <div className="skeleton-block h-6 w-40 rounded" />
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={cardClass}>
            <div className="skeleton-block h-3 w-14 rounded" />
            <div className="skeleton-block mt-2 h-4 w-10 rounded" />
          </div>
        ))}
      </div>

      <div className="skeleton-block mb-6 h-9 w-36 rounded-lg" />

      <div className="mb-6 flex flex-col gap-4">
        <div className="skeleton-block h-4 w-24 rounded" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="skeleton-block h-7 w-20 rounded-full" />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="skeleton-block h-4 w-28 rounded" />
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className="skeleton-block h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default EntityDetailPage;
