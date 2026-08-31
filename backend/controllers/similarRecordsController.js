import * as similarRecordsService from "../services/coffee/similarRecordsService.js";

/**
 * Similar Recordsのcontroller。
 *
 * discoverController.js / graphController.js と同じ方針: req からの値の
 * 取り出し・serviceの呼び出し・応答だけを行う。
 */

/** GET /api/similar-records/:recordId */
export const getSimilarRecords = async (req, res) => {
  const result = await similarRecordsService.getSimilarRecords(req.user._id, req.params.recordId);

  res.status(200).json({ data: result });
};
