import { Award } from "lucide-react";
import { useTranslation } from "react-i18next";

import { useOriginQuality } from "../hooks/useOriginQuality";
import { cardClass } from "../../coffee-records/components/formStyles";

// CQIデータ全体（backend/data/cqiDatabase.json）の品質スコアの実測レンジは
// 81〜87.2（2026-08時点）。バーの幅をこのレンジぴったりにすると、1件しか
// 精製方法が無い産地のバーが常に満杯・逆に僅差の産地同士が潰れて見える
// ため、少し余白を持たせた固定レンジで正規化する。産地によって基準が
// ぶれないよう、動的な最小・最大ではなく固定値にしている
const SCORE_DOMAIN = { min: 78, max: 90 };

const scoreToBarWidthPercent = (score) => {
  const clamped = Math.min(SCORE_DOMAIN.max, Math.max(SCORE_DOMAIN.min, score));
  return ((clamped - SCORE_DOMAIN.min) / (SCORE_DOMAIN.max - SCORE_DOMAIN.min)) * 100;
};

/**
 * Entity Detailページ（産地）専用の「品質スコア」セクション。
 *
 * docs/features.md「Origin Quality」参照。Discover（同じCQIデータを
 * 使った「まだ試していない産地」の提案）とは別の問いに答える機能で、
 * features/discover/ とは完全に独立している。「この産地自体の特徴は
 * 何か」を、精製方法ごとの品質スコアという形でそのまま見せるだけで、
 * 他産地への提案・比較は行わない。
 *
 * CQIデータに無い産地（20産地に含まれない）・読み込み中・エラー時は
 * 何も表示しない（DiscoverSuggestions.jsxと同じ「静かな道具」の方針。
 * この要素が無くてもEntity Detailページとして成立する）。
 */
function OriginQualityScores({ nodeId }) {
  const { t } = useTranslation();
  const { scores, isLoading, error } = useOriginQuality(nodeId);

  if (isLoading || error || scores.length === 0) return null;

  return (
    <section className={`${cardClass} mb-6`}>
      <div className="mb-3 flex items-center gap-2">
        <Award size={16} aria-hidden="true" className="text-warn" />
        <h2 className="text-sm font-semibold text-text">{t("originQuality.heading")}</h2>
      </div>

      <ul className="flex flex-col gap-3">
        {scores.map((score) => (
          <li key={score.processLabel}>
            <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-text">{score.processLabel}</span>
              <span className="font-mono text-xs text-text-tertiary">
                {score.avgQualityScore.toFixed(1)}
                <span className="ml-1.5">{t("originQuality.sampleSize", { count: score.sampleSize })}</span>
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full bg-warn/70"
                style={{ width: `${scoreToBarWidthPercent(score.avgQualityScore)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-text-tertiary">{t("originQuality.sourceNote")}</p>
    </section>
  );
}

export default OriginQualityScores;
