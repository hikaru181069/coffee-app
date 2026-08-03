import { Link } from "react-router-dom";

/**
 * Home画面専用の記録カード。
 *
 * 一覧画面（RecordCard.jsx）とは意図的に見た目を変えている。
 * Homeは「最近何を飲んだか」を思い出すための場所なので、日付・評価・
 * 記録タイプよりも産地・銘柄・精製方法・フレーバーという「その一杯を
 * 特徴づける情報」を優先して見せる（Figmaデザインに基づく、2026-08時点の
 * Home画面の再設計）。一覧・詳細で必要な情報（日付や評価）は
 * RecordCard.jsx / RecordDetailPage.jsx側に残っているため、ここで
 * 削っても情報は失われない。
 */
function HomeRecordCard({ record }) {
  const flavors = record.flavors ?? [];

  return (
    <li>
      <Link
        to={`/records/${record.id}`}
        className="block h-full rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors duration-150 hover:border-ctp-overlay0 focus:outline-none focus:ring-2 focus:ring-ctp-blue/50 sm:p-5"
      >
        {record.origin && (
          <div className="flex items-center gap-2">
            <span aria-hidden="true" className="h-3 w-0.5 rounded-full bg-ctp-lavender" />
            <span className="text-[11px] font-semibold uppercase tracking-wide text-ctp-subtext0">
              {record.origin.name}
            </span>
          </div>
        )}

        <h3 className="mt-2 truncate text-base font-bold text-ctp-text">{record.title}</h3>

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
