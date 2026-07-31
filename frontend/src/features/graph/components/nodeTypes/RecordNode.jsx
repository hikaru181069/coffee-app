import { Star } from "lucide-react";
import NodeHandles from "./nodeHandles";
import { getNodeVisual } from "../../utils/nodeVisuals";

/**
 * recordノード。グラフの中心となる「1回のコーヒー体験」。
 *
 * 属性ノード（AttributeNode）と見た目を明確に分ける。
 * 円形（docs/design.md「record: card/circle」）にし、色・アイコンも
 * 属性ノードとは別系統にすることで、パッと見て「これは記録」と
 * 分かるようにする。
 */
function RecordNode({ data, selected }) {
  const visual = getNodeVisual("record");
  const Icon = visual.icon;

  return (
    <div
      className={`flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-full border-2 bg-ctp-mantle p-1 text-center shadow-sm transition-shadow ${
        selected ? `border-ctp-lavender ring-2 ${visual.ringClass}` : "border-ctp-surface1"
      }`}
      title={data.label}
    >
      <NodeHandles />
      <Icon size={14} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
      <span className="line-clamp-2 w-full px-1 text-[9px] font-medium leading-tight text-ctp-text">
        {data.label}
      </span>
      {data.metadata.rating !== null && data.metadata.rating !== undefined && (
        <span className="flex items-center gap-0.5 text-[8px] text-ctp-yellow">
          <Star size={8} aria-hidden="true" fill="currentColor" strokeWidth={0} />
          {data.metadata.rating}
        </span>
      )}
    </div>
  );
}

export default RecordNode;
