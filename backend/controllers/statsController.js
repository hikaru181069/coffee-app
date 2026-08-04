import * as statsService from "../services/coffee/statsService.js";

/**
 * 統計の controller。
 *
 * graphController.js / insightController.js と同じ方針: req からの値の
 * 取り出し・serviceの呼び出し・応答だけを行う。クエリパラメータは持たない
 * （statsService.js参照）。
 */

/** GET /api/stats */
export const getStats = async (req, res) => {
  const stats = await statsService.buildStatsForUser(req.user._id);

  res.status(200).json({ data: stats });
};
