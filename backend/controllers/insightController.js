import * as insightService from "../services/coffee/insightService.js";

/**
 * Insightの controller。
 *
 * graphController.js と同じ方針: req からの値の取り出し・serviceの呼び出し・
 * 応答だけを行う。クエリパラメータは持たない（insightService.js参照）。
 */

/** GET /api/insights */
export const getInsights = async (req, res) => {
  const insights = await insightService.buildInsightsForUser(req.user._id);

  res.status(200).json({ data: insights });
};
