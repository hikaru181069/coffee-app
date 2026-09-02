import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { notFoundError } from "../../utils/AppError.js";

const ORIGIN_NODE_PREFIX = "origin:";

/**
 * 産地ノードのnodeIdから、そのユーザー自身の記録に基づいて産地名を解決する。
 *
 * discoverService.jsが使う。Origin.findByIdのようにIDを直接Mongoへ渡さず、
 * 必ず自分のCoffeeRecordを経由する。理由は2つ:
 *   - 他ユーザーの産地・存在しないIDを弾ける
 *     （docs/entity-detail.mdの404方針「存在の有無を漏らさない」と同じ）
 *   - 不正な形式のIDを渡されてもMongooseのCastErrorにならない
 *     （serializedのorigin.idとの単純な文字列比較のため）
 *
 * @returns {string|null} nodeIdが"origin:"始まりでなければnull
 * @throws 自分の記録に存在しない産地ノードなら404
 */
export const resolveOriginNameFromNodeId = async (userId, nodeId) => {
  if (!nodeId.startsWith(ORIGIN_NODE_PREFIX)) return null;

  const records = await coffeeRecordRepository.findAllForUser(userId);
  const serialized = serializeCoffeeRecords(records);

  const originId = nodeId.slice(ORIGIN_NODE_PREFIX.length);
  const originRecord = serialized.find((record) => record.origin?.id === originId);
  if (!originRecord) {
    throw notFoundError("指定されたノードが見つかりません");
  }

  return originRecord.origin.name;
};
