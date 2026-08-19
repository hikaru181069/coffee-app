import { readFileSync } from "node:fs";
import path from "node:path";

import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { buildOriginDiscovery, buildDiscoverTeaser } from "../../core/discover/discoverBuilder.js";
import { notFoundError } from "../../utils/AppError.js";

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

const ORIGIN_NODE_PREFIX = "origin:";

// CQIデータは一度読み込んだら終わりの静的ファイル（docs/features.md「Discover」）。
// リクエストのたびにファイルI/Oが発生しないよう、モジュールスコープに
// キャッシュする（プロセスの生存期間中は不変のため、TTLや再読み込みは
// 持たない）
let cachedCqiDataset = null;

const loadCqiDataset = () => {
  if (!cachedCqiDataset) {
    const filePath = path.join(import.meta.dirname, "../../data/cqiDatabase.json");
    cachedCqiDataset = JSON.parse(readFileSync(filePath, "utf-8"));
  }
  return cachedCqiDataset;
};

/**
 * 産地ノード1件について、まだ試していない産地の提案を返す
 * （GET /discover/nodes/:nodeId）。
 *
 * origin以外のnodeId（"process:..." など）は、CQIデータがCountry×
 * Processingの1軸しか持たないため対象外とし、空の提案を返す（404には
 * しない。「対応していない種別」であって「存在しない」わけではないため）。
 * origin:のIDでも、自分の記録に無い産地IDなら404にする
 * （docs/entity-detail.mdの404方針と同じ: 存在の有無を漏らさない）。
 */
export const getOriginDiscovery = async (userId, nodeId) => {
  const records = await coffeeRecordRepository.findAllForUser(userId);
  const serialized = serializeCoffeeRecords(records);

  if (!nodeId.startsWith(ORIGIN_NODE_PREFIX)) {
    return { suggestions: [] };
  }

  const originId = nodeId.slice(ORIGIN_NODE_PREFIX.length);
  const originRecord = serialized.find((record) => record.origin?.id === originId);
  if (!originRecord) {
    throw notFoundError("指定されたノードが見つかりません");
  }

  const cqiDataset = loadCqiDataset();

  return buildOriginDiscovery(serialized, cqiDataset, originRecord.origin.name);
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
