import * as searchService from "../services/coffee/searchService.js";
import { validateRecordFilterQuery } from "../validators/recordFilterValidator.js";
import { validationError } from "../utils/AppError.js";

/**
 * 横断検索の controller。
 *
 * graphController.js / insightController.js と同じ方針: req からの値の
 * 取り出し・serviceの呼び出し・応答だけを行う。
 * クエリが空・未指定でもエラーにはせず、空の結果を返す
 * （searchBuilder.js が空クエリを空配列として扱うため）。
 *
 * 2026-08、検索ボックスとフィルターの併用に対応した。RecordsPage.jsxの
 * 記録一覧フィルター（recordFilterValidator.js、産地・精製方法・
 * 評価・期間等）をそのまま受け取り、アクティブなフィルターの範囲内で
 * 横断検索する。titleフィルターは使わない（検索クエリ自体がtitleも
 * 見るため、二重に絞り込む必要が無い）。
 */

/** GET /api/search?q=... */
export const search = async (req, res) => {
  // ?q=a&q=b のように同じキーを複数指定すると、Expressはreq.query.qを
  // 配列にする。文字列以外は「未指定」と同じ空クエリとして扱う
  // （searchBuilder.jsの.trim()が配列に対して呼ばれ500になっていたため）
  const q = typeof req.query.q === "string" ? req.query.q : "";

  const { details, filter } = validateRecordFilterQuery(req.query);
  if (details.length > 0) throw validationError(details);

  const results = await searchService.searchForUser(req.user._id, q, filter);

  res.status(200).json({ data: results });
};
