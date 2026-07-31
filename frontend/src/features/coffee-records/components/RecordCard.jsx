import { Link } from "react-router-dom";
import { Coffee, MapPin, Star, Store } from "lucide-react";

import { formatConsumedAtShort, recordTypeLabel } from "../utils/recordFormat";

/**
 * 一覧に並ぶ記録1件のカード。
 *
 * 一覧で見せるのは「思い出すのに必要な最小限」だけにする。
 * 全項目を出すとカードが縦に伸びて、スクロール量が増えるわりに
 * 情報が頭に入らない。詳しくは詳細画面で見る。
 */
function RecordCard({ record }) {
  const flavors = record.flavors ?? [];

  return (
    <li>
      <Link
        to={`/records/${record.id}`}
        className="block rounded-xl border border-ctp-surface1 bg-ctp-mantle p-4 transition-colors duration-150 hover:border-ctp-overlay0 focus:outline-none focus:ring-2 focus:ring-ctp-blue/50"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold text-ctp-text">{record.title}</h3>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ctp-subtext0">
              <span>{formatConsumedAtShort(record.consumedAt)}</span>
              <span aria-hidden="true">·</span>
              {/* 記録タイプはアイコンと文字の両方で示す（色だけで区別しない） */}
              <span className="inline-flex items-center gap-1">
                {record.recordType === "cafe" ? (
                  <Store size={12} aria-hidden="true" />
                ) : (
                  <Coffee size={12} aria-hidden="true" />
                )}
                {recordTypeLabel(record.recordType)}
              </span>
              {record.cafeName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">{record.cafeName}</span>
                </>
              )}
            </p>
          </div>

          {record.rating !== null && (
            <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-ctp-surface0 px-2 py-1 text-xs font-semibold text-ctp-yellow">
              <Star size={12} aria-hidden="true" fill="currentColor" strokeWidth={0} />
              {record.rating}
              <span className="sr-only">段階中5</span>
            </span>
          )}
        </div>

        {(record.origin || flavors.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {record.origin && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ctp-surface0 px-2 py-0.5 text-[11px] text-ctp-subtext1">
                <MapPin size={11} aria-hidden="true" />
                {record.origin.name}
              </span>
            )}
            {/* フレーバーは多いと横に溢れるので3件までにする */}
            {flavors.slice(0, 3).map((flavor) => (
              <span
                key={flavor.id}
                className="rounded-full bg-ctp-surface0 px-2 py-0.5 text-[11px] text-ctp-subtext1"
              >
                {flavor.name}
              </span>
            ))}
            {flavors.length > 3 && (
              <span className="text-[11px] text-ctp-subtext0">+{flavors.length - 3}</span>
            )}
          </div>
        )}
      </Link>
    </li>
  );
}

export default RecordCard;
