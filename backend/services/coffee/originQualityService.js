import * as masterDataRepository from "../../repositories/masterDataRepository.js";
import { loadCqiDataset } from "../../data/cqiDataset.js";
import { resolveOriginNameFromNodeId } from "./originLookup.js";
import {
  getQualityScoresForOrigin,
  getQualityScoresForAllOrigins,
} from "../../core/originQuality/originQualityBuilder.js";

/**
 * Origin Qualityのユースケース。
 *
 * discoverService.js と同じ構成: core/originQuality/originQualityBuilder.js
 * （純粋関数）とDB問い合わせをつなぐ。graphBuilder.jsへは依存しない
 * （discoverServiceと同じ理由。知識グラフ生成ロジックを変更しない）。
 *
 * 2026-08、Originモデルへ直接アクセスしていたのを他のserviceと同じ
 * masterDataRepository経由へ揃えた。
 */

/**
 * 産地ノード1件について、精製方法ごとの品質スコアを返す
 * （GET /origin-quality/nodes/:nodeId）。
 *
 * origin以外のnodeIdは対象外として空配列を返す（404にしない。
 * discoverService.getOriginDiscoveryと同じ方針）。CQIデータに無い産地
 * （20産地に含まれない）の場合もエラーにはせず、単に空配列になる。
 */
export const getOriginQuality = async (userId, nodeId) => {
  const originName = await resolveOriginNameFromNodeId(userId, nodeId);
  if (!originName) {
    return { originLabel: null, scores: [] };
  }

  const cqiDataset = loadCqiDataset();
  return { originLabel: originName, scores: getQualityScoresForOrigin(cqiDataset, originName) };
};

/**
 * CQIデータに含まれる全産地の平均品質スコアを返す（GET /origin-quality）。
 *
 * World Mapの色分け用。ログインユーザーの記録には依存しない（静的な
 * CQI参照データとOriginマスターだけから決まる）が、他のAPI同様
 * 認証は必須にする（backend/routes/originQualityRoutes.js参照）。
 *
 * countryCodeはWorld Map側（frontend/src/features/map/utils/countryCodes.js
 * のALPHA2_TO_NUMERIC）が地図の国と突き合わせるために必要なため、
 * Originマスターから引いて添える。対応するOriginドキュメントが無い
 * （seedデータに無い）場合や、countryCode未設定の場合はnullのまま返し、
 * フロントエンド側でその産地を除外する（visitedOrigins.jsと同じ
 * 「対応が無ければハイライトしないだけ」という壊れ方）。
 */
export const getAllOriginQualityScores = async () => {
  const cqiDataset = loadCqiDataset();
  const scores = getQualityScoresForAllOrigins(cqiDataset);

  const origins = await masterDataRepository.findByNames(
    "origins",
    scores.map((score) => score.originName),
    { select: "name countryCode" },
  );
  const countryCodeByName = new Map(origins.map((origin) => [origin.name, origin.countryCode]));

  return {
    origins: scores.map((score) => ({
      ...score,
      countryCode: countryCodeByName.get(score.originName) ?? null,
    })),
  };
};
