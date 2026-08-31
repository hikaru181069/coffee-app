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
  // ?q=a&q=b のように同じキーを複数指定すると、Expressはreq.query.qを
  // 配列にする。文字列以外は「未指定」と同じ空クエリとして扱う
  // （searchBuilder.jsの.trim()が配列に対して呼ばれ500になっていたため）
  const q = typeof req.query.q === "string" ? req.query.q : "";
  const results = await searchService.searchForUser(req.user._id, q);

  res.status(200).json({ data: results });
};
