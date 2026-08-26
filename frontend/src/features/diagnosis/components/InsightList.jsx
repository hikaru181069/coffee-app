import { Sparkles } from "lucide-react";

import { describeInsight } from "../../insights/utils/describeInsight";
import { useReveal } from "../../../hooks/useReveal";
import { revealDelayClass } from "../../../utils/revealDelay";

/**
 * Insightの全件をリスト表示する。
 *
 * Home画面のDiscoverCardはinsights[0]だけを表示するが、こちらは
 * insightBuilder.jsが計算した「条件を満たすものすべて」（PRIORITY順）を
 * 見せる（docs/features.md「Coffee Diagnosis」参照）。文言生成は
 * features/insights/utils/describeInsight.jsをそのまま再利用する。
 */
function InsightList({ insights, t }) {
  if (insights.length === 0) {
    return <p className="text-sm text-text-tertiary">{t("diagnosis.insightsEmpty")}</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {insights.map((insight, index) => (
        <InsightRow key={insight.type} insight={insight} index={index} t={t} />
      ))}
    </ul>
  );
}

function InsightRow({ insight, index, t }) {
  const [ref, isVisible] = useReveal();

  return (
    <li
      ref={ref}
      className={`reveal ${isVisible ? "visible" : ""} ${revealDelayClass(index)} flex items-start gap-3 rounded-lg border border-surface-2 bg-raised p-3`}
    >
      <Sparkles size={16} aria-hidden="true" className="mt-0.5 flex-shrink-0 text-text-secondary" />
      <p className="text-sm text-text">{describeInsight(insight, t)}</p>
    </li>
  );
}

export default InsightList;
