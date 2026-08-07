import * as discoverService from "../services/coffee/discoverService.js";

/**
 * Discoverのcontroller。
 *
 * insightController.js / graphController.js と同じ方針: req からの値の
 * 取り出し・serviceの呼び出し・応答だけを行う。
 */

/** GET /api/discover/nodes/:nodeId */
export const getNodeDiscovery = async (req, res) => {
  const result = await discoverService.getOriginDiscovery(req.user._id, req.params.nodeId);

  res.status(200).json({ data: result });
};

/** GET /api/discover （Home画面用の1件の導線） */
export const getTeaser = async (req, res) => {
  const result = await discoverService.getHomeTeaser(req.user._id);

  res.status(200).json({ data: result });
};

/** GET /api/discover/all （Discover専用ページ用の全産地一覧） */
export const getAllDiscoveries = async (req, res) => {
  const result = await discoverService.getAllOriginDiscoveries(req.user._id);

  res.status(200).json({ data: result });
};
