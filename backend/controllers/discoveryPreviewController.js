import * as discoveryPreviewService from "../services/coffee/discoveryPreviewService.js";
import { isObjectIdString } from "../utils/objectId.js";
import { validationError } from "../utils/AppError.js";

/**
 * discoveries/previewのcontroller。
 *
 * discoverController.js / insightController.js と同じ方針:
 * reqからの値の取り出し・serviceの呼び出し・応答だけを行う。
 */

/** POST /api/discoveries/preview */
export const previewDiscovery = async (req, res) => {
  const { originId } = req.body ?? {};

  if (!isObjectIdString(originId)) {
    throw validationError([{ field: "originId", message: "産地を指定してください" }]);
  }

  const result = await discoveryPreviewService.previewOriginDiscovery(req.user._id, originId);

  res.status(200).json({ data: result });
};
