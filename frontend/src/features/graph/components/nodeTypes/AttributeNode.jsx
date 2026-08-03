import NodeHandles from "./nodeHandles";
import { getNodeVisual } from "../../utils/nodeVisuals";

/**
 * 属性ノード（産地・農園・品種・精製方法・焙煎度・フレーバー）。
 *
 * 6種類すべてを1つのコンポーネントで扱う。data.type に応じて
 * utils/nodeVisuals.js からアイコン・色を引くだけで、種別ごとに
 * ほぼ同じ見た目のコンポーネントを6つ作らずに済む。
 *
 * recordノード（円形）とは形を変え、角丸の四角にしている。
 * 「色だけで種別を区別しない」ため、アイコンに加えて形もrecordと
 * 変えている（docs/design.md の UI Rules）。
 */
function AttributeNode({ data, selected }) {
  const visual = getNodeVisual(data.type);
  const Icon = visual.icon;
  const recordCount = data.metadata.recordCount ?? 0;

  return (
    <div
      className={`flex max-w-[120px] items-center gap-1.5 rounded-lg border bg-ctp-mantle px-2 py-1.5 shadow-sm transition-shadow ${
        selected ? `border-ctp-blue ring-2 ${visual.ringClass}` : "border-ctp-surface1"
      }`}
      title={data.label}
    >
      <NodeHandles />
      <Icon size={14} aria-hidden="true" className={`flex-shrink-0 ${visual.colorClass}`} strokeWidth={1.75} />
      <span className="truncate text-[10px] font-medium text-ctp-text">{data.label}</span>
      {recordCount > 1 && (
        <span className="flex-shrink-0 rounded-full bg-ctp-surface0 px-1 font-mono text-[8px] text-ctp-subtext0">
          {recordCount}
        </span>
      )}
    </div>
  );
}

export default AttributeNode;
