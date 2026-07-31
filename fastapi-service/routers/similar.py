"""
/similar エンドポイント
レガシーの類似選手 API。現在は /discover/similar に移行済みだが後方互換のため残す。
"""

from fastapi import APIRouter
from pydantic import BaseModel

from core.math_utils import (
    cosine_similarity,
    build_hitter_pct_funcs,
    build_pitcher_pct_funcs,
    hitter_percentile_vector,
    pitcher_percentile_vector,
    position_score,
    STAT_WEIGHT,
    POS_WEIGHT,
)

router = APIRouter()


class SimilarPlayer(BaseModel):
    playerId: int
    playerType: str = "hitter"
    position: str = ""
    # 野手スタッツ
    ops: float = 0
    homeRuns: float = 0
    stolenBases: float = 0
    avg: float = 0
    rbi: float = 0
    oaa: float = 0
    # 投手スタッツ
    era: float = 0
    whip: float = 0
    strikeouts: float = 0
    walks: float = 0
    wins: float = 0
    innings: float = 0


class SimilarRequest(BaseModel):
    target: SimilarPlayer
    candidates: list[SimilarPlayer]
    topN: int = 3


class SimilarResult(BaseModel):
    playerId: int
    similarity: float
    similarityPercentage: int


class SimilarResponse(BaseModel):
    similarPlayerIds: list[int]   # 後方互換
    results: list[SimilarResult]  # スコア付き


@router.post("/similar", response_model=SimilarResponse)
def find_similar_players(request: SimilarRequest):
    """
    類似選手を返す（レガシーエンドポイント）。
    正規化: 候補プール全体の分布からパーセンタイルを計算する（固定値を使わない）。
    """
    is_pitcher = request.target.playerType == "pitcher"
    all_pool   = request.candidates + [request.target]

    if is_pitcher:
        pct_funcs   = build_pitcher_pct_funcs(all_pool)
        make_vector = lambda p: pitcher_percentile_vector(p, pct_funcs)
    else:
        pct_funcs   = build_hitter_pct_funcs(all_pool)
        make_vector = lambda p: hitter_percentile_vector(p, pct_funcs)

    target_vec = make_vector(request.target)
    scored = []
    for c in request.candidates:
        if c.playerId == request.target.playerId:
            continue
        stat_sim = max(0.0, cosine_similarity(target_vec, make_vector(c)))
        blended  = STAT_WEIGHT * stat_sim + POS_WEIGHT * position_score(request.target.position, c.position)
        scored.append((c, blended))
    scored.sort(key=lambda x: x[1], reverse=True)
    top = scored[: request.topN]
    return SimilarResponse(
        similarPlayerIds=[c.playerId for c, _ in top],
        results=[
            SimilarResult(
                playerId=c.playerId,
                similarity=round(sim, 4),
                similarityPercentage=round(sim * 100),
            )
            for c, sim in top
        ],
    )
