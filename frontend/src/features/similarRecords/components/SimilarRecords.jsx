import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useSimilarRecords } from "../hooks/useSimilarRecords";
import { formatConsumedAtShort } from "../../coffee-records/utils/recordFormat";
import { cardClass } from "../../coffee-records/components/formStyles";
import { useReveal } from "../../../hooks/useReveal";
import { revealDelayClass } from "../../../utils/revealDelay";

/**
 * 記録詳細ページ専用の「似た記録」セクション。
 *
 * docs/features.md「Similar Records」参照。産地・農園・品種・精製方法・
 * 焙煎度・フレーバー・カフェ・キーワードのうち、この記録と2つ以上の
 * 属性ノードを共有する他の記録を、共有数の多い順に見せる。知識グラフの
 * 共起関係をそのまま使ったルールベースの集計で、AI/NLPは使わない
 * （backend/core/similarRecords/similarRecordsBuilder.js参照）。
 *
 * DiscoverSuggestions.jsxと同じ「静かな道具」の方針で、候補が1つも無い・
 * 読み込み中・エラー時は何も表示しない（この要素が無くても記録詳細
 * ページとして成立する）。
 *
 * 「Discovery Must Be Actionable」（docs/product.md）に従い、共有数の
 * 数字だけでなく実際に共有している属性（例:「Ethiopia」「Washed」）を
 * チップで示し、「なぜ似ているか」が一目で分かるようにしている。
 */
function SimilarRecords({ recordId }) {
  const { t, i18n } = useTranslation();
  const { similarRecords, isLoading, error } = useSimilarRecords(recordId);

  if (isLoading || error || similarRecords.length === 0) return null;

  return (
    <section className={`${cardClass} mt-6`}>
      <h2 className="text-base font-semibold text-text">{t("similarRecords.heading")}</h2>
      <ul className="mt-4 flex flex-col gap-2">
        {similarRecords.map((record, index) => (
          <SimilarRecordRow key={record.id} record={record} index={index} language={i18n.language} />
        ))}
      </ul>
    </section>
  );
}

/** 似た記録1件分。スクロールインで段階的にカスケード表示する（EntityDetailPage.jsxのRelatedRecordRowと同じ演出） */
function SimilarRecordRow({ record, index, language }) {
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
        <div className="mt-1.5 flex flex-wrap gap-1">
          {record.sharedAttributes.map((attribute, attrIndex) => (
            <span
              key={`${attribute.type}-${attribute.label}-${attrIndex}`}
              className="rounded-full bg-surface-1 px-2 py-0.5 text-[11px] text-text-secondary"
            >
              {attribute.label}
            </span>
          ))}
        </div>
      </Link>
    </li>
  );
}

export default SimilarRecords;
