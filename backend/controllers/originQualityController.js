import * as originQualityService from "../services/coffee/originQualityService.js";

/**
 * Origin Qualityのcontroller。
 *
 * discoverController.js / insightController.js と同じ方針: req からの値の
 * 取り出し・serviceの呼び出し・応答だけを行う。
 */

/** GET /api/origin-quality/nodes/:nodeId */
export const getNodeQuality = async (req, res) => {
  const result = await originQualityService.getOriginQuality(req.user._id, req.params.nodeId);

  res.status(200).json({ data: result });
};

/** GET /api/origin-quality （World Map用、CQIデータの全産地分） */
export const getAllQuality = async (req, res) => {
  const result = await originQualityService.getAllOriginQualityScores();

  res.status(200).json({ data: result });
};
