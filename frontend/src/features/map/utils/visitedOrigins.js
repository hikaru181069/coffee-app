import { ALPHA2_TO_NUMERIC } from "./countryCodes";

/**
 * グラフのoriginノード（GET /api/graph?nodeTypes=origin）から、
 * world-atlasのtopojson id（ISO numeric）をキーにした訪問済み産地の
 * Mapを作る。専用のAPIは持たず、既存のGraph APIをそのまま使う
 * （docs/knowledge-graph.mdの「グラフは都度計算する」方針と同じく、
 * 世界地図専用のデータも持たない）。
 *
 * countryCodeが無い（未設定の）originや、ALPHA2_TO_NUMERICに対応が
 * 無い産地は除外する（地図上でハイライトされないだけで、エラーには
 * ならない）。DB/HTTP非依存の純粋関数。
 *
 * @param {Array} originNodes graph.nodesをtype === "origin"で絞り込んだ配列
 * @returns {Map<string, {id: string, label: string, recordCount: number}>}
 */
export const buildVisitedByNumericId = (originNodes) => {
  const map = new Map();

  for (const node of originNodes) {
    const countryCode = node.metadata?.countryCode;
    const numericId = countryCode ? ALPHA2_TO_NUMERIC[countryCode] : null;
    if (!numericId) continue;

    map.set(numericId, {
      id: node.id,
      label: node.label,
      recordCount: node.metadata.recordCount,
    });
  }

  return map;
};
