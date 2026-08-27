import { Coffee } from "lucide-react";

import { getArchetypeColorClass } from "../utils/archetypeVisuals";

/**
 * 診断された「コーヒータイプ」を見せるカード。
 *
 * archetypeがnull（記録不足・焙煎度が同率首位など。
 * core/diagnosis/diagnosisBuilder.js参照）のときは、次の行動が
 * わかる空状態にする（docs/design.md「空状態には次の行動を示す」）。
 *
 * タイプごとの色はGraph画面のノードカラーを再利用する
 * （utils/archetypeVisuals.js参照。診断はグラフの属性から導かれるため、
 * 色の語彙も共有し一貫性を持たせる）。
 */
function ArchetypeCard({ archetype, t }) {
  if (!archetype) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line/60 px-6 py-10 text-center">
        <Coffee size={28} aria-hidden="true" className="text-text-tertiary" strokeWidth={1.5} />
        <p className="text-sm text-text-tertiary">{t("diagnosis.archetype.empty")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-surface-2 bg-raised p-6 text-center shadow-elevated">
      <Coffee
        size={28}
        aria-hidden="true"
        className={getArchetypeColorClass(archetype.type)}
        strokeWidth={1.5}
      />
      <p className="mt-1 text-lg font-semibold text-text">
        {t(`diagnosis.archetype.${archetype.type}.title`)}
      </p>
      <p className="max-w-md text-sm text-text-secondary">
        {t(`diagnosis.archetype.${archetype.type}.description`)}
      </p>
      <p className="mt-2 text-xs text-text-tertiary">
        {t("diagnosis.archetype.sampleSize", { count: archetype.sampleSize })}
      </p>
    </div>
  );
}

export default ArchetypeCard;
