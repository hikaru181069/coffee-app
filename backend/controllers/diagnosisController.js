import * as diagnosisService from "../services/coffee/diagnosisService.js";

/**
 * コーヒー診断の controller。
 *
 * insightController.jsと同じ方針: reqからの値の取り出し・serviceの呼び出し・
 * 応答だけを行う。クエリパラメータは持たない。
 */

/** GET /api/diagnosis */
export const getDiagnosis = async (req, res) => {
  const diagnosis = await diagnosisService.buildDiagnosisForUser(req.user._id);

  res.status(200).json({ data: diagnosis });
};
