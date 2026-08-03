import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { useTranslation } from "react-i18next";

import { getOriginAccentClass } from "../utils/originAccent";

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
 */
function HomeRecordCard({ record }) {
  const { t } = useTranslation();
  const flavors = record.flavors ?? [];

  return (
    <li>
      <Link
        to={`/records/${record.id}`}
        className="block h-full rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors duration-150 hover:border-ctp-overlay0 focus:outline-none focus:ring-2 focus:ring-ctp-blue/50 sm:p-5"
      >
        {record.origin && (
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-3 w-0.5 rounded-full ${getOriginAccentClass(record.origin.name)}`}
            />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ctp-subtext0">
              {record.origin.name}
            </span>
          </div>
        )}

        <div className="mt-2 flex items-start justify-between gap-2">
          <h3 className="truncate text-base font-bold text-ctp-text">{record.title}</h3>
          {record.rating !== null && (
            <span className="inline-flex flex-shrink-0 items-center gap-0.5 text-xs font-semibold text-ctp-yellow">
              <Star size={12} aria-hidden="true" fill="currentColor" strokeWidth={0} />
              <span className="font-mono">{record.rating}</span>
              <span className="sr-only">{t("records.outOf5Sr")}</span>
            </span>
          )}
        </div>

        {record.process && (
          <p className="mt-1 text-sm text-ctp-subtext0">{record.process.name}</p>
        )}

        {flavors.length > 0 && (
          <p className="mt-2 truncate text-xs text-ctp-subtext1">
            {flavors.map((flavor) => flavor.name).join(" • ")}
          </p>
        )}
      </Link>
    </li>
  );
}

export default HomeRecordCard;
