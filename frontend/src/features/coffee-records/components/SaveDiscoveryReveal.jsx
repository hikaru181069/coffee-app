import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { cardClass, primaryButtonClass } from "./formStyles";
import { formatConsumedAtShort } from "../utils/recordFormat";
import { getNodeVisual } from "../../graph/utils/nodeVisuals";
import { entityDetailPathFromNodeId } from "../../graph/utils/entityLink";

/** 発見1件ぶんの行。属性種別のアイコン・色は知識グラフと同じ対応表を使う */
function DiscoveryRow({ discovery }) {
  const { t } = useTranslation();
  const { icon: Icon, colorClass, bgTintClass } = getNodeVisual(discovery.nodeType);

  const message =
    discovery.type === "firstAppearance"
      ? t("discoveries.firstAppearance", { label: discovery.label })
      : t("discoveries.milestone", { label: discovery.label, count: discovery.recordCount });

  return (
    <div className="flex items-center gap-3 py-3">
      <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${bgTintClass}`}>
        <Icon size={16} aria-hidden="true" className={colorClass} />
      </span>
      <p className="flex-1 text-sm text-text">{message}</p>
      <Link
        to={entityDetailPathFromNodeId(discovery.nodeId)}
        className="flex-shrink-0 text-xs font-medium text-text-secondary underline underline-offset-2 transition-colors duration-150 hover:text-text"
      >
        {t("discoveries.viewConnection")}
      </Link>
    </div>
  );
}

/**
 * 記録を保存した直後、詳細ページへ遷移する前に挟む「発見」画面。
 *
 * 保存によって新しく生まれたつながり・達成したマイルストーン
 * （backend/core/discoveries/discoveryBuilder.js）を見せる。
 * ゲーミフィケーション演出（バッジ・紙吹雪・効果音・数字のカウント
 * アップ等）は入れない。テキストと知識グラフの既存アイコン・色だけで
 * 構成し、「静かな道具」というトーン（docs/design.md）を保つ
 * （2026-09、記録体験の再設計）。
 *
 * discoveries.length === 0 のときはRecordFormPage.jsx側でこの
 * コンポーネント自体を描画しない（従来通りチェックマーク演出→
 * 即座に詳細ページへ遷移する）。
 */
function SaveDiscoveryReveal({ record, discoveries, onContinue }) {
  const { t, i18n } = useTranslation();

  return (
    <div className={`${cardClass} flex flex-col gap-5`}>
      <div className="flex flex-col gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
          {t("discoveries.savedHeading")}
        </span>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-text">{record.title}</h1>
            <span className="font-mono text-sm text-text-secondary">
              {formatConsumedAtShort(record.consumedAt, i18n.language)}
            </span>
          </div>

          {record.rating !== null && (
            <div className="flex items-center gap-1.5 rounded-full bg-surface-1 px-3 py-1.5">
              {[1, 2, 3, 4, 5].map((score) => (
                <Star
                  key={score}
                  size={14}
                  aria-hidden="true"
                  className={score <= record.rating ? "text-warn" : "text-line"}
                  fill={score <= record.rating ? "currentColor" : "none"}
                  strokeWidth={1.5}
                />
              ))}
              <span className="ml-1 font-mono text-sm font-semibold text-text">
                {record.rating}
                <span className="sr-only"> / 5</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col divide-y divide-line/60 border-y border-line/60">
        {discoveries.map((discovery) => (
          <DiscoveryRow key={discovery.nodeId} discovery={discovery} />
        ))}
      </div>

      <button type="button" onClick={onContinue} className={`${primaryButtonClass} self-end`}>
        {t("discoveries.continue")}
      </button>
    </div>
  );
}

export default SaveDiscoveryReveal;
