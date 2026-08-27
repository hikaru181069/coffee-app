import { Link } from "react-router-dom";
import { Coffee, Droplets, MapPin, Star, Store } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatConsumedAtShort, hasCoffeeDetails, recordTypeLabel } from "../utils/recordFormat";
import { entityDetailPath } from "../../graph/utils/entityLink";
import { useReveal } from "../../../hooks/useReveal";
import { revealDelayClass } from "../../../utils/revealDelay";

/** タグ1個分の共通見た目。エンティティ詳細ページへのLinkとして使う */
const tagClass =
  "inline-flex items-center gap-1 rounded-full border border-transparent bg-surface-1 px-2 py-0.5 text-[11px] text-text-secondary transition-all duration-150 hover:-translate-y-px hover:border-line/60 hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-primary/50";

/**
 * 一覧に並ぶ記録1件のカード。
 *
 * 一覧で見せるのは「思い出すのに必要な最小限」だけにする。
 * 全項目を出すとカードが縦に伸びて、スクロール量が増えるわりに
 * 情報が頭に入らない。詳しくは詳細画面で見る。
 *
 * 情報階層: コーヒー名を最も強く、日付/タイプなどのmetadataは弱く、
 * 産地/精製方法/フレーバーのタグは補助情報として下段に置く。
 *
 * カード全体は記録詳細（/records/:id）へ、タグはそれぞれエンティティ
 * 詳細（/entities/:nodeId）へと、Linkが二重になる。<a>の入れ子は不正な
 * DOMになり実際にクリックが誤動作する（Reactはparseではなく
 * document.createElementでDOMを組むため、ブラウザの構文修復が働かず
 * 入れ子がそのまま残る。クリック時はイベントが内側→外側へbubbleし、
 * 外側Linkのnavigateが後から実行されて上書きしてしまう）。
 *
 * そのため、カード全体用のLinkは absolute inset-0 の透明なリンク
 * （stretched link）として敷く。CSSのスタッキング順では、非positioned
 * （position: static）の要素は positioned 要素より先に描画され、その上に
 * positioned要素が乗る。tagは自分専用のクリック領域が要るのでラップ
 * するdivに `relative` を付けてpositioned側へ引き上げ、stretched link
 * より前面に出す。逆にタイトル側のdivは意図的に`relative`を付けず
 * static のままにしてあり、クリックが下の stretched link まで素通り
 * して記録詳細へ飛ぶ（両方に`relative`を付けるとタイトル側もtag側と
 * 同じpositioned層に乗り、DOM順で後にあるほうが勝ってstretched link
 * を覆ってしまい、タイトルクリックが反応しなくなる）。
 */
function RecordCard({ record, index = 0 }) {
  const { t, i18n } = useTranslation();
  const flavors = record.flavors ?? [];
  const [ref, isVisible] = useReveal();

  return (
    <li
      ref={ref}
      className={`reveal ${isVisible ? "visible" : ""} ${revealDelayClass(index)} relative rounded-2xl border border-surface-2 bg-raised p-5 shadow-elevated transition-all duration-200 hover:-translate-y-px hover:border-line hover:bg-surface-1/40 sm:p-6`}
    >
      <Link
        to={`/records/${record.id}`}
        aria-label={record.title}
        className="absolute inset-0 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-text sm:text-[17px]">{record.title}</h3>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
            <span className="font-mono">{formatConsumedAtShort(record.consumedAt, i18n.language)}</span>
            <span aria-hidden="true">·</span>
            {/* 記録タイプはアイコンと文字の両方で示す（色だけで区別しない） */}
            <span className="inline-flex items-center gap-1">
              {record.recordType === "cafe" ? (
                <Store size={12} aria-hidden="true" />
              ) : (
                <Coffee size={12} aria-hidden="true" />
              )}
              {recordTypeLabel(record.recordType, t)}
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
          <span className="inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-surface-1 px-2 py-1 text-xs font-semibold text-warn">
            <Star size={12} aria-hidden="true" fill="currentColor" strokeWidth={0} />
            <span className="font-mono">{record.rating}</span>
            <span className="sr-only">{t("records.outOf5Sr")}</span>
          </span>
        )}
      </div>

      {(record.origin || record.process || flavors.length > 0) && (
        <div className="relative mt-4 flex flex-wrap items-center gap-1.5">
          {record.origin && (
            <Link to={entityDetailPath("origin", record.origin.id)} className={tagClass}>
              <MapPin size={11} aria-hidden="true" />
              {record.origin.name}
            </Link>
          )}
          {record.process && (
            <Link to={entityDetailPath("process", record.process.id)} className={tagClass}>
              <Droplets size={11} aria-hidden="true" />
              {record.process.name}
            </Link>
          )}
          {/* フレーバーは多いと横に溢れるので3件までにする */}
          {flavors.slice(0, 3).map((flavor) => (
            <Link key={flavor.id} to={entityDetailPath("flavor", flavor.id)} className={tagClass}>
              {flavor.name}
            </Link>
          ))}
          {flavors.length > 3 && (
            <span className="text-[11px] text-text-tertiary">+{flavors.length - 3}</span>
          )}
        </div>
      )}

      {!hasCoffeeDetails(record) && (
        <p className="mt-2 text-xs text-text-tertiary">{t("records.detailEmptyHint")}</p>
      )}
    </li>
  );
}

export default RecordCard;
