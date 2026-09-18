import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { motion as Motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { cardClass, primaryButtonClass } from "./formStyles";
import CoffeeLoader from "../../../components/CoffeeLoader";
import { formatConsumedAtShort } from "../utils/recordFormat";
import { getNodeVisual } from "../../graph/utils/nodeVisuals";
import { getNodeSolidBgClass } from "../../graph/utils/nodeColor";
import { entityDetailPathFromNodeId } from "../../graph/utils/entityLink";

// CoffeeLoaderのドリップ(1.15s)×4=液面サイクル1周ぶん（コンポーネント側の
// コメント参照）。この画面の冒頭だけ、この1サイクルを「淹れている」演出
// として再生してから発見一覧を見せる
const BREW_INTRO_MS = 4600;

/**
 * 発見1件ぶんの行。属性種別のアイコン・色は知識グラフと同じ対応表を使う。
 *
 * 2026-09、記録体験の再設計・第3弾。indexに応じた遅延で、上から順に
 * カスケード表示する（Framer Motion）
 */
function DiscoveryRow({ discovery, index }) {
  const { t } = useTranslation();
  const { icon: Icon } = getNodeVisual(discovery.nodeType);
  // 2026-09、「デザイン・テーマの統一」レビューで、DiscoveryBadge.jsxと
  // 同じ理由（旧スタイル・種別共通色のまま）が見つかったため、同じ対応
  // （塗りつぶした円+暗色アイコン、origin・flavorは値ごとの個別色）にした
  const badgeBgClass = getNodeSolidBgClass({ type: discovery.nodeType, label: discovery.label });

  const message =
    discovery.type === "firstAppearance"
      ? t("discoveries.firstAppearance", { label: discovery.label })
      : t("discoveries.milestone", { label: discovery.label, count: discovery.recordCount });

  const rowDelay = 0.15 + index * 0.08;

  return (
    <Motion.div
      className="flex items-center gap-3 py-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 26, delay: rowDelay }}
    >
      <Motion.span
        className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${badgeBgClass}`}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 16, delay: rowDelay + 0.1 }}
      >
        <Icon size={16} aria-hidden="true" className="text-on-inverse" />
      </Motion.span>
      <p className="flex-1 text-sm text-text">{message}</p>
      <Link
        to={entityDetailPathFromNodeId(discovery.nodeId)}
        className="flex-shrink-0 text-xs font-medium text-text-secondary underline underline-offset-2 transition-colors duration-150 hover:text-text"
      >
        {t("discoveries.viewConnection")}
      </Link>
    </Motion.div>
  );
}

/**
 * 記録を保存した直後、詳細ページへ遷移する前に挟む「発見」画面。
 *
 * 保存によって新しく生まれたつながり・達成したマイルストーン
 * （backend/core/discoveries/discoveryBuilder.js）を見せる。
 * ゲーミフィケーション演出（バッジ・紙吹雪・効果音・数字のカウント
 * アップ等）は入れない。テキストと知識グラフの既存アイコン・色だけで
 * 構成する（2026-09、記録体験の再設計）。
 *
 * 2026-09・第3弾: カード全体の入場、発見の各行のカスケード表示、
 * アイコンバッジのポップにFramer Motion（本物のバネ物理）を使う。
 * 新しい色・新しいUI要素は追加していない。
 *
 * discoveries.length === 0 のときはRecordFormPage.jsx側でこの
 * コンポーネント自体を描画しない（従来通り保存演出→即座に詳細ページへ
 * 遷移する）。
 *
 * 2026-09、この画面の冒頭にCoffeeLoader（コーヒーのドリップ+液面
 * アニメーション）を1サイクル（4.6秒）だけ再生してから、記録・発見一覧を
 * 見せるようにした。「コーヒーが淹れ上がって、発見が明らかになる」という
 * 一連の流れを表現する狙い（ユーザーと相談して決定）。発見が無い普通の
 * 保存（RecordForm.jsxのボタン内`PourIcon`のみ）にまでこの演出を挟むと
 * 保存のたびに待たされて煩わしくなるため、この画面（発見が1件以上ある
 * ときだけ）に限定している。`prefers-reduced-motion`では即座に本体を表示
 * する（RecordFormPage.jsxの`isJustSaved`判定と同じ方式）。
 */
function SaveDiscoveryReveal({ record, discoveries, onContinue }) {
  const { t, i18n } = useTranslation();

  const [isBrewing, setIsBrewing] = useState(
    () => !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );

  useEffect(() => {
    if (!isBrewing) return undefined;
    const timer = setTimeout(() => setIsBrewing(false), BREW_INTRO_MS);
    return () => clearTimeout(timer);
  }, [isBrewing]);

  if (isBrewing) {
    return (
      <Motion.div
        className={`${cardClass} flex flex-col items-center`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <CoffeeLoader size="lg" label={t("discoveries.brewingLabel")} />
      </Motion.div>
    );
  }

  return (
    <Motion.div
      className={`${cardClass} flex flex-col gap-5`}
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 24 }}
    >
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
        {discoveries.map((discovery, index) => (
          <DiscoveryRow key={discovery.nodeId} discovery={discovery} index={index} />
        ))}
      </div>

      <Motion.button
        type="button"
        onClick={onContinue}
        whileHover={{ scale: 1.04, y: -2 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 22 }}
        className={`${primaryButtonClass} self-end`}
      >
        {t("discoveries.continue")}
      </Motion.button>
    </Motion.div>
  );
}

export default SaveDiscoveryReveal;
