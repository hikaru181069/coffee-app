import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildGraph, findRecordIdsConnectedToNode } from "../../core/graph/graphBuilder.js";
import { notFoundError } from "../../utils/AppError.js";

/**
 * 知識グラフのユースケース。
 *
 * core/graph/graphBuilder.js（純粋関数）と repository（DB問い合わせ）を
 * つなぐ役割。グラフ用のコレクションは持たず、CoffeeRecordとマスター
 * データから都度導出する（docs/database.md の Graph Persistence）。
 */

const NOTES_EXCERPT_LENGTH = 60;

/** notesの短い抜粋を作る。関連記録一覧でどんな記録か思い出す手がかりにする */
const excerptNotes = (notes) => {
  if (!notes) return "";
  return notes.length > NOTES_EXCERPT_LENGTH
    ? `${notes.slice(0, NOTES_EXCERPT_LENGTH)}…`
    : notes;
};

/**
 * 自分の記録から知識グラフを生成する（docs/knowledge-graph.md の Graph Generation）。
 *
 * @param {string} userId
 * @param {object} query validators/graphQueryValidator.js が返した
 *   { recordFilter, nodeTypes }
 */
export const buildGraphForUser = async (userId, { recordFilter, nodeTypes }) => {
  const records = await coffeeRecordRepository.findAllForUser(userId, recordFilter);
  const serialized = serializeCoffeeRecords(records);

  return buildGraph(serialized, { nodeTypes });
};

/**
 * 指定したノードに関連する記録の一覧を返す（GET /graph/nodes/:nodeId/records）。
 *
 * ノードの実在確認も兼ねる。「自分のグラフの中にそのノードがあるか」で
 * 判定するため、他ユーザーの記録からしか作られないノードIDを渡されても
 * 404になり、存在の有無すら漏れない。
 *
 * recordFilter は /graph を見ているときと同じ絞り込みを渡す想定。
 * 画面をカフェ記録だけに絞っているなら、関連記録もその範囲に揃えるため。
 * nodeTypesは渡さない。ここでは指定ノードへのエッジをすべて見る必要があり、
 * 属性種別を絞ると本来あるはずのエッジまで消えてしまうため。
 */
export const getRelatedRecords = async (userId, nodeId, { recordFilter } = {}) => {
  const records = await coffeeRecordRepository.findAllForUser(userId, recordFilter);
  const serialized = serializeCoffeeRecords(records);

  const graph = buildGraph(serialized);

  const nodeExists = graph.nodes.some((node) => node.id === nodeId);
  if (!nodeExists) {
    throw notFoundError("指定されたノードが見つかりません");
  }

  const connectedRecordIds = findRecordIdsConnectedToNode(graph, nodeId);

  return serialized
    .filter((record) => connectedRecordIds.has(record.id))
    .map((record) => ({
      id: record.id,
      title: record.title,
      consumedAt: record.consumedAt,
      rating: record.rating,
      notesExcerpt: excerptNotes(record.notes),
    }));
};
