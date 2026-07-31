import { validateRecordFilterQuery } from "./recordFilterValidator.js";
import { ATTRIBUTE_NODE_TYPES } from "../core/graph/graphBuilder.js";

/**
 * GET /api/graph のクエリ文字列を検証・変換する。
 *
 * docs/api.md に列挙されているクエリはnodeTypes・recordType・dateFrom・
 * dateTo・ratingMinの5つ。一覧APIと違い、originId/flavorIdでの絞り込みは
 * 持たない（グラフ自体がそれらのノードを探索する画面のため）。
 */

const isMissing = (value) => value === undefined || value === null || value === "";

/**
 * @returns {{ valid: boolean, details: Array, query: { recordFilter: object, nodeTypes: string[]|null } }}
 */
export const validateGraphQuery = (rawQuery = {}) => {
  const details = [];
  let nodeTypes = null;

  if (!isMissing(rawQuery.nodeTypes)) {
    // "origin,flavor" のようなカンマ区切りの1文字列、または配列(?nodeTypes=a&nodeTypes=b)
    // の両方をExpressから受け取れるようにする
    const rawList = Array.isArray(rawQuery.nodeTypes)
      ? rawQuery.nodeTypes
      : String(rawQuery.nodeTypes).split(",");

    const requested = rawList.map((value) => value.trim()).filter((value) => value !== "");
    const invalid = requested.filter((type) => !ATTRIBUTE_NODE_TYPES.includes(type));

    if (invalid.length > 0) {
      details.push({
        field: "nodeTypes",
        message: `nodeTypesは ${ATTRIBUTE_NODE_TYPES.join(" / ")} から指定してください`,
      });
    } else if (requested.length > 0) {
      nodeTypes = requested;
    }
  }

  // recordType・ratingMin・期間の検証は一覧APIと共通。
  // originId/flavorIdはgraphのクエリに含めない（このファイル冒頭の説明を参照）
  const filterResult = validateRecordFilterQuery(rawQuery, {
    includeReferenceFilters: false,
  });
  details.push(...filterResult.details);

  return {
    valid: details.length === 0,
    details,
    query: { recordFilter: filterResult.filter, nodeTypes },
  };
};
