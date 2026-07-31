const Interaction = require("../../models/Interaction");
const { fetchArchetypes } = require("../mlb/archetypeService");
const { fetchDiscoverPreference } = require("../fastApiService");

// 直近何件の行動履歴を見るか(favorite/view側・dislike側それぞれ)
const INTERACTION_LIMIT = 200;

/**
 * ユーザーの行動履歴(お気に入り・閲覧・Dislike)と候補選手のstyleScoresを
 * FastAPIの/discover/preferenceに渡し、候補ごとの好み一致度(affinityScore)と
 * dislike減点(dislikePenalty)を計算してもらう。
 *
 * 計算ロジック本体(重み付き平均・距離計算)はFastAPI側にある
 * (CLAUDE.mdのArchitecture Boundary: 選手特徴量ベースの計算はfastapi-service、
 * backendはMongoDBの行動履歴を取得してAPIリクエストとして渡すだけ)。
 *
 * @param {string} userId
 * @param {Array<{mlbPlayerId: number, playerType: string, styleScores?: object}>} candidates
 * @returns {Promise<Record<number, {affinityScore: number|null, dislikePenalty: number}>>}
 */
const getPreferenceScores = async (userId, candidates) => {
  if (candidates.length === 0) return {};

  const [positiveInteractions, dislikeInteractions, archetypeMap] = await Promise.all([
    Interaction.find({ user: userId, action: { $ne: "dislike" } })
      .sort({ createdAt: -1 })
      .limit(INTERACTION_LIMIT),
    Interaction.find({ user: userId, action: "dislike" })
      .sort({ createdAt: -1 })
      .limit(INTERACTION_LIMIT),
    fetchArchetypes(),
  ]);

  const interactions = [...positiveInteractions, ...dislikeInteractions]
    .map((i) => ({
      mlbPlayerId: Number(i.mlbPlayerId),
      playerType: i.playerType,
      action: i.action,
      createdAt: i.createdAt.toISOString(),
      styleScores: archetypeMap[Number(i.mlbPlayerId)]?.styleScores,
    }))
    .filter((i) => i.styleScores);

  // 履歴が無い(使い始めたばかりの)ユーザーはFastAPIを呼ばずスコア無し扱いにする
  if (interactions.length === 0) return {};

  const result = await fetchDiscoverPreference(interactions, candidates);
  if (!result?.scores) return {};

  return Object.fromEntries(
    result.scores.map((s) => [
      s.mlbPlayerId,
      { affinityScore: s.affinityScore, dislikePenalty: s.dislikePenalty },
    ]),
  );
};

module.exports = { getPreferenceScores };
