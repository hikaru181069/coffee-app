"""
/recommend/future-stars — Rising Stars（cosine similarity）
"""

import numpy as np
from collections import Counter
from fastapi import APIRouter
from pydantic import BaseModel

from core.math_utils import (
    cosine_similarity,
    build_hitter_pct_funcs,
    hitter_percentile_vector,
    position_score,
    STAT_WEIGHT,
    POS_WEIGHT,
)

router = APIRouter()


# ── /recommend/future-stars モデル ─────────────────────────────────────────────

class FutureStarStats(BaseModel):
    ops: float = 0
    homeRuns: float = 0
    stolenBases: float = 0
    avg: float = 0
    rbi: float = 0


class FavoriteFutureStarPlayer(BaseModel):
    playerId: int
    fullName: str = ""
    position: str = ""
    stats: FutureStarStats = FutureStarStats()


class YoungPlayerCandidate(BaseModel):
    playerId: int
    name: str = ""
    team: str = ""
    position: str = ""
    age: int = 0
    ops: float = 0
    homeRuns: float = 0
    stolenBases: float = 0
    avg: float = 0
    rbi: float = 0
    oaa: float = 0


class FutureStarRequest(BaseModel):
    favoritePlayers: list[FavoriteFutureStarPlayer]
    candidates: list[YoungPlayerCandidate] = []
    topN: int = 5


class FutureStar(BaseModel):
    playerId: int
    fullName: str
    organization: str
    level: str
    position: str
    age: int
    stats: FutureStarStats
    similarity: float
    similarityPercentage: int
    reasons: list[str]
    type: str = "rising"
    isExperimental: bool = False


class FutureStarResponse(BaseModel):
    futureStars: list[FutureStar]


def rising_star_reasons(candidate: YoungPlayerCandidate) -> list[str]:
    reasons = []
    if candidate.ops >= 0.850:
        reasons.append("Elite OPS")
    elif candidate.ops >= 0.780:
        reasons.append("Strong OPS profile")
    if candidate.homeRuns >= 25:
        reasons.append("Power hitter")
    elif candidate.homeRuns >= 15:
        reasons.append("Emerging power")
    if candidate.stolenBases >= 20:
        reasons.append("Speed threat")
    if candidate.avg >= 0.290:
        reasons.append("High contact rate")
    if candidate.rbi >= 70:
        reasons.append("Run producer")
    if candidate.age <= 23:
        reasons.append("Under 24 years old")
    elif candidate.age <= 25:
        reasons.append("Under 26 years old")
    if candidate.position in {"OF", "SS", "CF", "2B"}:
        reasons.append(f"Premium {candidate.position} profile")
    return reasons[:4] if reasons else ["Young MLB player"]


@router.post("/recommend/future-stars", response_model=FutureStarResponse)
def recommend_future_stars(req: FutureStarRequest):
    """
    お気に入り選手の平均プロフィールに近い若手 MLB 選手を返す。
    正規化: 候補プールの実際の分布からパーセンタイルを計算する（固定値を使わない）。
    """
    if not req.favoritePlayers or not req.candidates:
        return FutureStarResponse(futureStars=[])

    # 候補プール全体の分布から正規化関数を構築する
    pct_funcs = build_hitter_pct_funcs(req.candidates)

    # お気に入り選手の平均ベクトルをパーセンタイル空間で計算する
    fav_vectors = [hitter_percentile_vector(p.stats, pct_funcs) for p in req.favoritePlayers]
    target_vec  = np.mean(fav_vectors, axis=0) if fav_vectors else np.zeros(5, dtype=float)

    # お気に入りの中で最も多いポジションを代表ポジションとして使う
    pos_counts   = Counter(p.position for p in req.favoritePlayers if p.position)
    fav_position = pos_counts.most_common(1)[0][0] if pos_counts else ""

    scored = []
    for candidate in req.candidates:
        stat_sim = max(0.0, cosine_similarity(target_vec, hitter_percentile_vector(candidate, pct_funcs)))
        blended  = STAT_WEIGHT * stat_sim + POS_WEIGHT * position_score(fav_position, candidate.position)
        scored.append((candidate, blended))

    scored.sort(key=lambda item: item[1], reverse=True)
    limit = max(1, min(req.topN, len(req.candidates)))

    return FutureStarResponse(
        futureStars=[
            FutureStar(
                playerId=candidate.playerId,
                fullName=candidate.name,
                organization=candidate.team,
                level="MLB",
                position=candidate.position,
                age=candidate.age,
                stats=FutureStarStats(
                    ops=candidate.ops,
                    homeRuns=candidate.homeRuns,
                    stolenBases=candidate.stolenBases,
                    avg=candidate.avg,
                    rbi=candidate.rbi,
                ),
                similarity=round(similarity, 4),
                similarityPercentage=round(similarity * 100),
                reasons=rising_star_reasons(candidate),
            )
            for candidate, similarity in scored[:limit]
        ]
    )
