import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildOriginDiscovery, buildDiscoverTeaser } from "../../core/discover/discoverBuilder.js";
import { loadCqiDataset } from "../../data/cqiDataset.js";
import { resolveOriginNameFromNodeId } from "./originLookup.js";

/**
 * Discoverのユースケース。
 *
 * graphService.js / insightService.js と同じ構成: core/discover/
 * discoverBuilder.js（純粋関数）と repository（DB問い合わせ）をつなぐ。
 *
 * core/graph/graphBuilder.jsへは依存しない。知識グラフ生成ロジックを
 * 一切変更しない・依存も増やさないという方針のため、ノードの実在確認も
 * 自分のCoffeeRecordから直接判定する（buildGraphを経由しない）。
 */

/**
 * 産地ノード1件について、まだ試していない産地の提案を返す
 * （GET /discover/nodes/:nodeId）。
 *
 * origin以外のnodeId（"process:..." など）は、CQIデータがCountry×
 * Processingの1軸しか持たないため対象外とし、空の提案を返す（404には
 * しない。「対応していない種別」であって「存在しない」わけではないため）。
 * origin:のIDでも、自分の記録に無い産地IDなら404にする
 * （docs/entity-detail.mdの404方針と同じ: 存在の有無を漏らさない。
 * resolveOriginNameFromNodeIdが担う）。
 */
export const getOriginDiscovery = async (userId, nodeId) => {
  // resolveOriginNameFromNodeIdの内部でも同じfindAllForUserを呼んでおり、
  // ここで2回READが走る。記録数がデモ規模である前提（docs/database.md
  // 「MVPレベルなら毎回計算しても時間的問題はない」）のもとで、
  // nodeId解決ロジックをoriginQualityService.jsと共有する再利用性を優先した
  const originName = await resolveOriginNameFromNodeId(userId, nodeId);
  if (!originName) {
    return { suggestions: [] };
  }

  const records = await coffeeRecordRepository.findAllForUser(userId);
  const serialized = serializeCoffeeRecords(records);
  const cqiDataset = loadCqiDataset();

  return buildOriginDiscovery(serialized, cqiDataset, originName);
};

/**
 * Home画面用の、全産地を横断した提案1件を返す（GET /discover）。
 *
 * docs/features.md「Discover」の「Home Teaser」参照。Entity Detailページへの導線を
 * Home画面にも作るための集計。フィルターは持たない（insightServiceと
 * 同じ方針。「自分の記録全体から」の集計のため）。
 */
export const getHomeTeaser = async (userId) => {
  const records = await coffeeRecordRepository.findAllForUser(userId);
  const serialized = serializeCoffeeRecords(records);
  const cqiDataset = loadCqiDataset();

  return buildDiscoverTeaser(serialized, cqiDataset);
};
