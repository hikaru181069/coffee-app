import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import * as masterDataRepository from "../../repositories/masterDataRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildGraph, findRecordIdsConnectedToNode } from "../../core/graph/graphBuilder.js";
import { buildEntityDetail } from "../../core/graph/entityDetailBuilder.js";
import { notFoundError } from "../../utils/AppError.js";

/**
 * 知識グラフのユースケース。
 *
 * core/graph/graphBuilder.js（純粋関数）と repository（DB問い合わせ）を
 * つなぐ役割。グラフ用のコレクションは持たず、CoffeeRecordとマスター
 * データから都度導出する（docs/database.md の Graph Persistence）。
 */

const NOTES_EXCERPT_LENGTH = 60;

/**
 * notesのキーワード（flavorAlias付き）をflavorノードへ統合するための
 * Flavorマスター索引を作る（graphBuilder.jsのcollectAttributeRefs参照）。
 *
 * findMany("flavors")はlean docsを返すため、保存時に生成済みの
 * normalizedNameをそのままキーに使える（graphBuilder.js側で
 * normalizeName()を再計算するのと同じ正規化なので、一致条件がずれない）。
 */
const loadFlavorsByNormalizedName = async () => {
  const flavors = await masterDataRepository.findMany("flavors");
  return new Map(
    flavors.map((flavor) => [flavor.normalizedName, { id: String(flavor._id), name: flavor.name }]),
  );
};

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
  const [records, flavorsByNormalizedName] = await Promise.all([
    coffeeRecordRepository.findAllForUser(userId, recordFilter),
    loadFlavorsByNormalizedName(),
  ]);
  const serialized = serializeCoffeeRecords(records);

  return buildGraph(serialized, { nodeTypes, flavorsByNormalizedName });
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
  const [records, flavorsByNormalizedName] = await Promise.all([
    coffeeRecordRepository.findAllForUser(userId, recordFilter),
    loadFlavorsByNormalizedName(),
  ]);
  const serialized = serializeCoffeeRecords(records);

  const graph = buildGraph(serialized, { flavorsByNormalizedName });

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

/**
 * 属性ノード1件の詳細（統計・関連属性・関連記録）を返す
 * （GET /graph/nodes/:nodeId）。
 *
 * getRelatedRecordsと違い、フィルターは受け取らない。エンティティ詳細
 * ページは「そのノードについて知っていること全体」を見せる場所であり、
 * 画面側の絞り込み状態を引き継ぐ性質のものではないため。
 *
 * 知識グラフをただの可視化ではなくナビゲーションにする機能
 * （docs/entity-detail.md）。産地・農園・品種・精製方法・焙煎度・
 * フレーバー・カフェのどの種別でも同じ関数で扱える。
 */
export const getNodeDetail = async (userId, nodeId) => {
  const [records, flavorsByNormalizedName] = await Promise.all([
    coffeeRecordRepository.findAllForUser(userId),
    loadFlavorsByNormalizedName(),
  ]);
  const serialized = serializeCoffeeRecords(records);
  const graph = buildGraph(serialized, { flavorsByNormalizedName });

  const detail = buildEntityDetail(graph, serialized, nodeId);
  if (!detail) {
    throw notFoundError("指定されたノードが見つかりません");
  }

  const { connectedRecords, ...rest } = detail;

  return {
    ...rest,
    records: connectedRecords
      .slice()
      .sort((a, b) => new Date(b.consumedAt) - new Date(a.consumedAt))
      .map((record) => ({
        id: record.id,
        title: record.title,
        consumedAt: record.consumedAt,
        rating: record.rating,
        notesExcerpt: excerptNotes(record.notes),
      })),
  };
};
