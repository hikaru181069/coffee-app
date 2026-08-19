import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getOriginAccentClass } from "../utils/originAccent";
import { hasCoffeeDetails } from "../utils/recordFormat";
import { useReveal } from "../../../hooks/useReveal";
import { revealDelayClass } from "../../../utils/revealDelay";

/**
 * Home画面専用の記録カード。
 *
 * 一覧画面（RecordCard.jsx）とは意図的に見た目を変えている。
 * Homeは「最近何を飲んだか」を思い出すための場所なので、日付・
 * 記録タイプよりも産地・銘柄・精製方法・フレーバーという「その一杯を
 * 特徴づける情報」を優先して見せる（Figmaデザインに基づく、2026-08時点の
 * Home画面の再設計）。日付や記録タイプは一覧・詳細（RecordCard.jsx /
 * RecordDetailPage.jsx）側に残っているため、ここで削っても情報は失われない。
 *
 * 評価(★)はdocs/design.mdのInformation Hierarchyで「①名前と体験」の次に
 * 来る「②評価と感想」にあたるため、タイトルと同じ行に復活させている
 * （③つながりにあたる産地・フレーバーより先に見せる）。
 *
 * 産地・品種・精製方法・フレーバーなどが1つも無い記録は、
 * docs/knowledge-graph.md のグラフ生成上ノード・エッジを一切生まない
 * （Record Firstで最小入力を許すほど、Connect Automaticallyが働かない
 * 記録が増えてしまう）。カードを空白のまま見せると気づけないため、
 * RecordDetailPage.jsxと同じヒント文（records.detailEmptyHint）を出す。
 */
function HomeRecordCard({ record, index = 0 }) {
  const { t } = useTranslation();
  const flavors = record.flavors ?? [];
  const [ref, isVisible] = useReveal();

  return (
    <li>
      <Link
        ref={ref}
        to={`/records/${record.id}`}
        className={`reveal ${isVisible ? "visible" : ""} ${revealDelayClass(index)} block h-full rounded-2xl border border-surface-2 bg-raised p-4 shadow-elevated transition-colors duration-150 hover:border-line focus:outline-none focus:ring-2 focus:ring-primary/50 sm:p-5`}
      >
        {record.origin && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-3 w-0.5 rounded-full ${getOriginAccentClass(record.origin.name)}`}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-text-tertiary">
              {record.origin.name}
            </span>
          </div>
        )}

        <div className="mt-2 flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-bold text-text">{record.title}</h3>
          {record.rating !== null && (
            <span className="inline-flex flex-shrink-0 items-center gap-0.5 text-xs font-semibold text-warn">
              <Star size={12} aria-hidden="true" fill="currentColor" strokeWidth={0} />
              <span className="font-mono">{record.rating}</span>
              <span className="sr-only">{t("records.outOf5Sr")}</span>
            </span>
          )}
        </div>

        {record.process && (
          <p className="mt-1 text-sm text-text-tertiary">{record.process.name}</p>
        )}

        {flavors.length > 0 && (
          <p className="mt-2 truncate text-xs text-text-secondary">
            {flavors.map((flavor) => flavor.name).join(" • ")}
          </p>
        )}

        {!hasCoffeeDetails(record) && (
          <p className="mt-2 text-xs text-text-tertiary">{t("records.detailEmptyHint")}</p>
        )}
      </Link>
    </li>
  );
}

export default HomeRecordCard;
