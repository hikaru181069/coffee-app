import { Coffee } from "lucide-react";

import { getArchetypeColorClass } from "../utils/archetypeVisuals";
import TasteRadarChart from "../../coffee-records/components/TasteRadarChart";

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
 *
 * 2026-08、診断の「強化」に対応した。焙煎度×フレーバーcategoryという
 * 主軸の判定はそのままに、判定の根拠（焙煎度・フレーバーそれぞれの
 * 一致件数）と、判定そのものには使っていない補足情報（よく選ぶ精製方法・
 * 品種、6軸の味覚評価の平均）をあわせて表示する
 * （backend/core/diagnosis/diagnosisBuilder.js参照）。補足情報は
 * データが無ければ（3件未満・同率首位）該当行ごと非表示にする。
 *
 * 2026-08、DiagnosisPage.jsxの3セクションを`cardClass`（枠線+背景+影の
 * カード）へ統一した際、このカード自体がセクションの`cardClass`の中へ
 * 二重に入れ子になった。StatCard.jsxの`flat`propと同じ理由で、
 * ネストされた内側のカードには影を付けない。
 */
function ArchetypeCard({ archetype, t, flat = false }) {
  if (!archetype) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-line/60 px-6 py-10 text-center">
        <Coffee size={28} aria-hidden="true" className="text-text-tertiary" strokeWidth={1.5} />
        <p className="text-sm text-text-tertiary">{t("diagnosis.archetype.empty")}</p>
      </div>
    );
  }

  const hasTasteProfile = Object.values(archetype.tasteProfile).some((value) => value !== null);

  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-2xl border border-surface-2 bg-raised p-6 text-center ${flat ? "" : "shadow-elevated"}`}
    >
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

      <div className="mt-2 flex flex-col items-center gap-1 text-xs text-text-tertiary">
        <p>{t("diagnosis.archetype.sampleSizeRoast", { count: archetype.roastSampleSize })}</p>
        {archetype.categorySampleSize !== null && (
          <p>{t("diagnosis.archetype.sampleSizeCategory", { count: archetype.categorySampleSize })}</p>
        )}
        {archetype.dominantProcess && (
          <p>
            {t("diagnosis.archetype.dominantProcessLabel", {
              label: archetype.dominantProcess.label,
              count: archetype.dominantProcess.count,
            })}
          </p>
        )}
        {archetype.dominantVariety && (
          <p>
            {t("diagnosis.archetype.dominantVarietyLabel", {
              label: archetype.dominantVariety.label,
              count: archetype.dominantVariety.count,
            })}
          </p>
        )}
      </div>

      {hasTasteProfile && (
        <div className="mt-4 w-full max-w-xs">
          <p className="text-xs font-semibold text-text-tertiary">{t("diagnosis.archetype.tasteProfileHeading")}</p>
          <TasteRadarChart record={archetype.tasteProfile} />
        </div>
      )}
    </div>
  );
}

export default ArchetypeCard;
