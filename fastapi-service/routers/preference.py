"""
/discover/preference エンドポイント
お気に入り・閲覧・DislikeというユーザーのInteraction履歴から「好みの傾向」を計算し、
候補選手ごとの好み一致度(affinityScore)とdislike減点(dislikePenalty)を返す。

Expressが行動履歴(MongoDB由来)とstyleScores(archetypeキャッシュ由来)をまとめてここに渡す。
FastAPIはMongoDBに直接アクセスしない(CLAUDE.mdのArchitecture Boundary参照)。

styleScoresは既に0〜100のパーセンタイルに正規化された少数軸(power/speedなど)のため、
他のルーターのようなコサイン類似度ではなく、値そのものの近さ(ユークリッド距離)で
好み一致度を測る。コサイン類似度は「向き」しか見ないため、例えば
[80,80,80,80](全軸一流)と[40,40,40,40](全軸平凡)を同一とみなしてしまい、
このスケールのデータには不向きなため。
"""

from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

# お気に入り=強いシグナル、閲覧=弱いシグナルとして重み付けする。
# dislikeはここには含めない(好みプロファイルとは別枠でdislikeプロファイルを作る)。
ACTION_WEIGHT = {"favorite": 3, "view": 1}

# 直近の行動ほど重視する(14日で重みが半分になる指数減衰)。
HALF_LIFE_DAYS = 14

# dislike減点の最大値(0〜100スケールのmatchScoreに対して)
MAX_DISLIKE_PENALTY = 10

HITTER_KEYS = ["power", "speed", "contact", "defense"]
PITCHER_KEYS = ["dominance", "control", "durability"]
PLAYER_TYPES = ("hitter", "pitcher")


class InteractionInput(BaseModel):
    mlbPlayerId: int
    playerType: str = "hitter"
    action: str
    createdAt: str
    styleScores: dict[str, float | None] | None = None


class CandidateInput(BaseModel):
    mlbPlayerId: int
    playerType: str = "hitter"
    styleScores: dict[str, float | None] | None = None


class PreferenceRequest(BaseModel):
    interactions: list[InteractionInput] = []
    candidates: list[CandidateInput] = []


class CandidateScore(BaseModel):
    mlbPlayerId: int
    affinityScore: int | None = None
    dislikePenalty: int = 0


class PreferenceResponse(BaseModel):
    scores: list[CandidateScore]


def _keys_for(player_type: str) -> list[str]:
    return PITCHER_KEYS if player_type == "pitcher" else HITTER_KEYS


def _decay_weight(created_at: str) -> float:
    try:
        dt = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    except ValueError:
        return 1.0
    age_days = (datetime.now(timezone.utc) - dt).total_seconds() / 86400
    return 0.5 ** (age_days / HALF_LIFE_DAYS)


def _build_positive_profile(interactions: list[InteractionInput], player_type: str) -> dict | None:
    """favorite/viewの加重平均(パーセンタイル)。dislikeはここに含めない。"""
    keys = _keys_for(player_type)
    sums = {k: 0.0 for k in keys}
    total_weight = 0.0

    for it in interactions:
        if it.action == "dislike" or it.playerType != player_type or not it.styleScores:
            continue
        weight = ACTION_WEIGHT.get(it.action, 1) * _decay_weight(it.createdAt)
        for k in keys:
            sums[k] += (it.styleScores.get(k) or 0) * weight
        total_weight += weight

    if total_weight <= 0:
        return None
    return {k: sums[k] / total_weight for k in keys}


def _build_disliked_profile(interactions: list[InteractionInput], player_type: str) -> dict | None:
    """dislikeしたstyleScoresの単純平均(時間減衰・重み付けなし)。"""
    keys = _keys_for(player_type)
    sums = {k: 0.0 for k in keys}
    count = 0

    for it in interactions:
        if it.action != "dislike" or it.playerType != player_type or not it.styleScores:
            continue
        for k in keys:
            sums[k] += it.styleScores.get(k) or 0
        count += 1

    if count == 0:
        return None
    return {k: sums[k] / count for k in keys}


def _closeness_distance(profile: dict, style_scores: dict, keys: list[str]) -> float:
    """0(全く違う)〜1(完全一致)。ユークリッド距離を0〜1の近さに変換する。"""
    sq_diff_sum = sum(((style_scores.get(k) or 0) - profile.get(k, 0)) ** 2 for k in keys)
    max_dist = (len(keys) * 100 * 100) ** 0.5
    distance = sq_diff_sum ** 0.5
    return max(0.0, 1 - distance / max_dist)


def _score_affinity(profile: dict | None, style_scores: dict | None, player_type: str) -> int | None:
    if profile is None or not style_scores:
        return None
    closeness = _closeness_distance(profile, style_scores, _keys_for(player_type))
    return round(closeness * 100)


def _score_dislike_penalty(disliked_profile: dict | None, style_scores: dict | None, player_type: str) -> int:
    if disliked_profile is None or not style_scores:
        return 0
    closeness = _closeness_distance(disliked_profile, style_scores, _keys_for(player_type))
    return round(closeness * MAX_DISLIKE_PENALTY)


@router.post("/discover/preference", response_model=PreferenceResponse)
def discover_preference(req: PreferenceRequest):
    positive_profiles = {pt: _build_positive_profile(req.interactions, pt) for pt in PLAYER_TYPES}
    disliked_profiles = {pt: _build_disliked_profile(req.interactions, pt) for pt in PLAYER_TYPES}

    scores = [
        CandidateScore(
            mlbPlayerId=c.mlbPlayerId,
            affinityScore=_score_affinity(positive_profiles.get(c.playerType), c.styleScores, c.playerType),
            dislikePenalty=_score_dislike_penalty(disliked_profiles.get(c.playerType), c.styleScores, c.playerType),
        )
        for c in req.candidates
    ]
    return PreferenceResponse(scores=scores)
