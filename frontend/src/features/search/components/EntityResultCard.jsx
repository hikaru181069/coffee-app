import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getNodeVisual } from "../../graph/utils/nodeVisuals";

/**
 * 検索でヒットした属性（産地・農園・品種・精製方法・焙煎度・フレーバー・
 * カフェ）1件のカード。
 *
 * docs/search.md参照。「エチオピア / 8件の記録 / よく関連するフレーバー：
 * ベリー、フローラル」のように、件数と共起する属性を添えて知識ベース感を
 * 出す。エンティティ詳細ページ（docs/entity-detail.md）へのLinkにする。
 * 知識グラフをただの可視化ではなくナビゲーションにする方針
 * （2026-08、`/graph?focus=`から変更）。
 */
function EntityResultCard({ entity }) {
  const { t } = useTranslation();
  const visual = getNodeVisual(entity.type);
  const Icon = visual.icon;

  return (
    <Link
      to={`/entities/${encodeURIComponent(entity.id)}`}
      className="block rounded-xl border border-surface-2 bg-raised p-4 transition-colors duration-150 hover:border-line focus:outline-none focus:ring-2 focus:ring-primary/50"
    >
      <div className="flex items-center gap-2">
        <Icon size={16} aria-hidden="true" className={visual.colorClass} />
        <span className="text-xs text-text-tertiary">{t(visual.labelKey)}</span>
      </div>

      <h3 className="mt-1 text-base font-bold text-text">{entity.label}</h3>

      <p className="mt-1 text-sm text-text-tertiary">
        {t("search.recordCount", { count: entity.recordCount })}
      </p>

      {entity.relatedLabels.length > 0 && (
        <p className="mt-1 text-xs text-text-secondary">
          {t(`search.related.${entity.relatedType}`, { labels: entity.relatedLabels.join(" • ") })}
        </p>
      )}
    </Link>
  );
}

export default EntityResultCard;
