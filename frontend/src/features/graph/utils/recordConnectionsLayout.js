/**
 * Record Detail の Connectionsセクション用、1-hopのハブ&スポーク配置を計算する
 * 純粋関数（DOM非依存）。中心(50, 50)に記録ノードを置き、
 * Origin=上／Process=左／RoastLevel=右の固定スロット、Flavorは下側に
 * 幹（trunk）から扇状に分岐させる。座標は0〜100のパーセンテージ空間
 * （SVGのviewBox・CSSのleft/top: %の両方でそのまま使える）。
 *
 * 力学シミュレーション（d3-force等）は使わない。ここで扱うのは
 * 「記録1件 + その直接の接続先（最大でも十数ノード）」という常に
 * 決まった小さな構造で、物理演算が要る問題ではないため
 * （docs/knowledge-graph.mdの一般的なグラフ描画とは別の、記録詳細画面
 * 専用の軽量な図）。
 */

const CENTER = { x: 50, y: 50 };

// 中心からの距離をおよそ17%縮め（36→30）、ノードが中央寄りにまとまる
// ようにしている。他の定数もこの比率（30/36）に合わせて縮小した。
const SINGLE_SLOTS = {
  origin: { x: 50, y: 20 },
  process: { x: 20, y: 50 },
  roastLevel: { x: 80, y: 50 },
};

const FLAVOR_TRUNK_Y = 72;
const FLAVOR_LEAF_Y = 83;
const FLAVOR_SPREAD_PER_NODE = 13;
const MAX_FLAVOR_SPREAD = 57;

/** 図に描く枝の数を抑える。それ以上は図の外に「+N」として示す */
export const MAX_FLAVOR_NODES = 5;

/**
 * @param {object} params
 * @param {{id: string, name: string} | null} params.origin
 * @param {{id: string, name: string} | null} params.process
 * @param {{id: string, name: string} | null} params.roastLevel
 * @param {{id: string, name: string}[]} params.flavors
 * @returns {{ center: {x:number,y:number}, nodes: Array, edges: Array, flavorOverflowCount: number }}
 */
export function buildRecordConnectionsLayout({ origin, process, roastLevel, flavors = [] }) {
  const nodes = [];
  const edges = [];

  if (origin) {
    const pos = SINGLE_SLOTS.origin;
    nodes.push({ type: "origin", id: origin.id, label: origin.name, x: pos.x, y: pos.y });
    edges.push({ x1: CENTER.x, y1: CENTER.y, x2: pos.x, y2: pos.y });
  }
  if (process) {
    const pos = SINGLE_SLOTS.process;
    nodes.push({ type: "process", id: process.id, label: process.name, x: pos.x, y: pos.y });
    edges.push({ x1: CENTER.x, y1: CENTER.y, x2: pos.x, y2: pos.y });
  }
  if (roastLevel) {
    const pos = SINGLE_SLOTS.roastLevel;
    nodes.push({ type: "roastLevel", id: roastLevel.id, label: roastLevel.name, x: pos.x, y: pos.y });
    edges.push({ x1: CENTER.x, y1: CENTER.y, x2: pos.x, y2: pos.y });
  }

  const shownFlavors = flavors.slice(0, MAX_FLAVOR_NODES);
  const flavorOverflowCount = flavors.length - shownFlavors.length;

  if (shownFlavors.length > 0) {
    const trunk = { x: 50, y: FLAVOR_TRUNK_Y };
    edges.push({ x1: CENTER.x, y1: CENTER.y, x2: trunk.x, y2: trunk.y });

    const spread = Math.min(MAX_FLAVOR_SPREAD, shownFlavors.length * FLAVOR_SPREAD_PER_NODE);
    const startX = 50 - spread / 2;
    const step = shownFlavors.length > 1 ? spread / (shownFlavors.length - 1) : 0;

    shownFlavors.forEach((flavor, index) => {
      const x = shownFlavors.length === 1 ? 50 : startX + step * index;
      nodes.push({ type: "flavor", id: flavor.id, label: flavor.name, x, y: FLAVOR_LEAF_Y });
      edges.push({ x1: trunk.x, y1: trunk.y, x2: x, y2: FLAVOR_LEAF_Y });
    });
  }

  return { center: CENTER, nodes, edges, flavorOverflowCount };
}
