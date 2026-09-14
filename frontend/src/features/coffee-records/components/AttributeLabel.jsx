import { getNodeVisual } from "../../graph/utils/nodeVisuals";

/**
 * FormFieldのlabelに、知識グラフの属性種別アイコンを添える。
 *
 * RecordDetailPage.jsxのProperty Gridと同じ組み合わせ（種別ごとの
 * アイコン・色、`utils/nodeVisuals.js`）を記録フォームの入力欄にも
 * 反映し、「選ぶ」段階から記録詳細・グラフで見る見た目と地続きにする
 * （2026-09、記録体験のUI/UX再設計）。
 */
function AttributeLabel({ type, children }) {
  const { icon: Icon, colorClass } = getNodeVisual(type);

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon size={14} aria-hidden="true" className={colorClass} />
      {children}
    </span>
  );
}

export default AttributeLabel;
