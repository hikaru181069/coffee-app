import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { getNodeVisual } from "../utils/nodeVisuals";
import { entityDetailPath } from "../utils/entityLink";
import { buildRecordConnectionsLayout } from "../utils/recordConnectionsLayout";

/**
 * Record Detail の Connectionsセクション。記録を中心に、直接つながる
 * 知識グラフのノード（Origin/Process/RoastLevel/Flavor）を1-hopの
 * ハブ&スポーク図で見せる。ノードはGraph画面・エンティティ詳細ページと
 * 同じアイコン・配色（getNodeVisual）で、クリックするとそのエンティティ
 * 詳細ページへ遷移する（以前のチップ一覧と同じ遷移先）。
 *
 * 接続線はレイアウト計算（recordConnectionsLayout.js）に従って敷いた
 * 装飾用のSVG（aria-hidden）。実際にフォーカス・クリックできるのは
 * 記録タイトル以外の各ノード（通常のLink要素）のみで、上に
 * 見出し（records.connectionsHeading）が既にあるため、この図自体へ
 * 追加のaria-labelは付けていない（role="img"にすると子のLinkが
 * スクリーンリーダーから見えなくなってしまうため）。
 */
function RecordConnectionsDiagram({ record }) {
  const { t } = useTranslation();
  const layout = buildRecordConnectionsLayout({
    origin: record.origin,
    process: record.process,
    roastLevel: record.roastLevel,
    flavors: record.flavors ?? [],
  });
  const recordVisual = getNodeVisual("record");
  const RecordIcon = recordVisual.icon;

  return (
    <div>
      <div className="relative mx-auto aspect-square w-full max-w-sm">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden="true">
          {layout.edges.map((edge, index) => (
            <line
              key={index}
              x1={edge.x1}
              y1={edge.y1}
              x2={edge.x2}
              y2={edge.y2}
              className="stroke-surface-2"
              strokeWidth="0.6"
            />
          ))}
        </svg>

        {/* 中心: この記録自身 */}
        <div
          className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1"
          style={{ left: `${layout.center.x}%`, top: `${layout.center.y}%` }}
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-surface-1 ring-2 ring-surface-2">
            <RecordIcon size={18} aria-hidden="true" className={recordVisual.colorClass} strokeWidth={1.75} />
          </span>
          {/* 中心ノードだけは省略されすぎないよう、他ノードより広い幅で2行まで許容する */}
          <span
            className="line-clamp-2 max-w-[10rem] text-center text-[11px] font-medium leading-tight text-text"
            title={record.title}
          >
            {record.title}
          </span>
        </div>

        {layout.nodes.map((node) => (
          <ConnectionNode key={`${node.type}-${node.id}`} node={node} />
        ))}
      </div>

      {layout.flavorOverflowCount > 0 && (
        <p className="mt-2 text-center text-xs text-text-tertiary">
          {t("records.connectionsFlavorOverflow", { count: layout.flavorOverflowCount })}
        </p>
      )}
    </div>
  );
}

/**
 * 図に浮かぶノード1個分。中心以外（Origin/Process/RoastLevel/Flavor）で使う。
 *
 * hover/focus時に「{label} → {種別}」形式のTooltipを出す
 * （例: "Ethiopia → Origin"）。種別のラベルはGraph画面の凡例などと
 * 同じ`graph.nodeTypes.*`翻訳キー（getNodeVisual経由）を再利用し、
 * このTooltipだけの独自表記は作らない（UIとAPIで用語を統一する方針）。
 * ネイティブのtitle属性は使わない（表示までの遅延がある・スタイルを
 * 合わせられないため、アプリの見た目に合わせた自前のTooltipにした）。
 */
function ConnectionNode({ node }) {
  const { t } = useTranslation();
  const visual = getNodeVisual(node.type);
  const Icon = visual.icon;

  return (
    <Link
      to={entityDetailPath(node.type, node.id)}
      className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 focus:outline-none"
      style={{ left: `${node.x}%`, top: `${node.y}%` }}
    >
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md border border-surface-2 bg-raised px-2 py-1 text-[10px] text-text-secondary opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        <span className="font-medium text-text">{node.label}</span>
        <span className="mx-1 text-text-tertiary" aria-hidden="true">→</span>
        {t(visual.labelKey)}
      </span>

      <span className="flex h-8 w-8 items-center justify-center rounded-full border border-transparent bg-surface-1 transition-all duration-150 group-hover:-translate-y-0.5 group-hover:border-line/60 group-hover:bg-surface-2 group-focus-visible:ring-2 group-focus-visible:ring-primary/50">
        <Icon size={14} aria-hidden="true" className={visual.colorClass} strokeWidth={1.75} />
      </span>
      <span className="max-w-[4.5rem] truncate text-[10px] text-text-secondary transition-colors duration-150 group-hover:text-text">
        {node.label}
      </span>
    </Link>
  );
}

export default RecordConnectionsDiagram;
