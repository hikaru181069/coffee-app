import * as graphService from "../services/coffee/graphService.js";
import { validateGraphQuery } from "../validators/graphQueryValidator.js";
import { validationError } from "../utils/AppError.js";

/**
 * 知識グラフの controller。
 *
 * coffeeRecordController.js と同じ方針: req からの値の取り出し・検証・
 * serviceの呼び出し・応答だけを行う。try/catchは書かない
 * （Express 5 が reject を errorHandler へ渡す）。
 */

/** GET /api/graph */
export const getGraph = async (req, res) => {
  const { valid, details, query } = validateGraphQuery(req.query);
  if (!valid) throw validationError(details);

  const graph = await graphService.buildGraphForUser(req.user._id, query);

  res.status(200).json(graph);
};

/**
 * GET /api/graph/nodes/:nodeId/records
 *
 * :nodeId は "origin:507f..." のような stable ID。
 * URLエンコードされて届くが、Expressのルーターが自動でデコードする。
 */
export const getNodeRecords = async (req, res) => {
  const { valid, details, query } = validateGraphQuery(req.query);
  if (!valid) throw validationError(details);

  const records = await graphService.getRelatedRecords(req.user._id, req.params.nodeId, query);

  res.status(200).json({ data: records });
};
