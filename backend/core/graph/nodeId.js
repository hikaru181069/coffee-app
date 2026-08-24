/**
 * 知識グラフのノードIDを組み立てる。
 *
 * docs/knowledge-graph.md の「Stable IDs」に従い、
 * 種別プレフィックスを付けて衝突を避ける。
 * 例: origin:507f... と flavor:507f... のように、
 * 異なる種類で偶然同じ値が入っていても別ノードとして扱える。
 *
 * DB・HTTPに依存しない純粋関数。graphBuilder からのみ呼ばれる。
 */

export const recordNodeId = (recordId) => `record:${recordId}`;
export const originNodeId = (originId) => `origin:${originId}`;
export const processNodeId = (processId) => `process:${processId}`;
export const roastLevelNodeId = (roastLevelId) => `roastLevel:${roastLevelId}`;
export const varietyNodeId = (varietyId) => `variety:${varietyId}`;
export const flavorNodeId = (flavorId) => `flavor:${flavorId}`;

/**
 * farmだけは別コレクションを持たず、CoffeeRecord上の文字列（farmName）で
 * 管理している（docs/domain-model.md の「Farm」）。そのため他のように
 * ObjectIdを使えず、正規化した名前をIDにする。
 *
 * 正規化は utils/normalizeName.js と同じ関数を使う必要がある。
 * ここで独自に文字列操作をすると、"Konga Washing Station" と
 * " konga washing station " が別ノードに分かれてしまう
 * （docs/product-principles.md「One Source of Truth」）。
 */
export const farmNodeId = (normalizedFarmName) => `farm:${normalizedFarmName}`;

/**
 * cafeもfarmと同じ理由（別コレクションを持たない自由記述）で、
 * 正規化した名前をIDにする。
 */
export const cafeNodeId = (normalizedCafeName) => `cafe:${normalizedCafeName}`;

/**
 * keywordもfarm/cafeと同じ理由（別コレクションを持たない自由記述由来）で、
 * 正規化した文字列をIDにする。ただしkeywordはnoteKeywordExtractor.jsが
 * 返す辞書のcanonical形がそのまま入るため、揺れの正規化というよりは
 * 「同じcanonicalなら同じID」を保証する目的が主。
 */
export const keywordNodeId = (normalizedKeyword) => `keyword:${normalizedKeyword}`;

/** 2ノード間のエッジIDを組み立てる（同じ組み合わせのエッジが重複しないようにする） */
export const edgeId = (sourceNodeId, targetNodeId) => `${sourceNodeId}-${targetNodeId}`;
