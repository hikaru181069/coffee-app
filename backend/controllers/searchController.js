import * as searchService from "../services/coffee/searchService.js";

/**
 * 横断検索の controller。
 *
 * graphController.js / insightController.js と同じ方針: req からの値の
 * 取り出し・serviceの呼び出し・応答だけを行う。
 * クエリが空・未指定でもエラーにはせず、空の結果を返す
 * （searchBuilder.js が空クエリを空配列として扱うため）。
 */

/** GET /api/search?q=... */
export const search = async (req, res) => {
  const results = await searchService.searchForUser(req.user._id, req.query.q);

  res.status(200).json({ data: results });
};
