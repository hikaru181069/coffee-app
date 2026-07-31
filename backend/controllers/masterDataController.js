import * as masterDataService from "../services/coffee/masterDataService.js";
import { isMasterType } from "../repositories/masterDataRepository.js";
import { validateMasterDataQuery } from "../validators/coffeeRecordQueryValidator.js";
import { notFoundError, validationError } from "../utils/AppError.js";

/**
 * マスターデータの controller。
 *
 * MVPでは読み取りのみ公開する。一般ユーザー向けの作成・更新APIは
 * 提供しない（docs/api.md）。表記揺れを防ぐため、マスターが増えるのは
 * seed か将来の管理機能経由に限る。
 */

/** URLの :type が実在するマスター種別かを確認する */
const requireValidType = (type) => {
  if (!isMasterType(type)) {
    throw notFoundError("指定されたマスターデータは存在しません");
  }
};

/**
 * GET /api/master-data
 *
 * 記録フォームは5種類すべての選択肢を同時に必要とするので、
 * 1リクエストでまとめて返せるようにしている。
 */
export const getAllMasterData = async (req, res) => {
  const data = await masterDataService.listAllMasterData();

  res.status(200).json({ data });
};

/**
 * GET /api/master-data/:type
 *
 * type は origins / varieties / processes / roastLevels / flavors。
 * 選択肢が多いフレーバーや産地を検索で絞り込む用途を想定している。
 */
export const getMasterDataByType = async (req, res) => {
  requireValidType(req.params.type);

  const { valid, details, query } = validateMasterDataQuery(req.query);
  if (!valid) throw validationError(details);

  const data = await masterDataService.listMasterData(req.params.type, query);

  res.status(200).json({ data });
};
