"""
/discover/similar エンドポイント
対象選手と類似スタイルの選手を MLB 全体 / 若手プールの2つから返す。
Express 側がリーグ統計キャッシュから候補リストを作成して送信する。
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


class DiscoverTarget(BaseModel):
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
    sprintSpeed: float = 0
    armStrength: float = 0
    # 投手スタッツ
    era: float = 0
    whip: float = 0
    strikeouts: float = 0
    walks: float = 0
    wins: float = 0
    innings: float = 0


class DiscoverCandidate(BaseModel):
    playerId: int
    name: str = ""
    team: str = ""
    position: str = ""
    age: int = 0
    # 野手スタッツ
    ops: float = 0
    homeRuns: float = 0
    stolenBases: float = 0
    avg: float = 0
    rbi: float = 0
    oaa: float = 0
    sprintSpeed: float = 0
    armStrength: float = 0
    # 投手スタッツ
    era: float = 0
    whip: float = 0
    strikeouts: float = 0
    walks: float = 0
    wins: float = 0
    innings: float = 0


class DiscoverRequest(BaseModel):
    target: DiscoverTarget
    mlbCandidates: list[DiscoverCandidate] = []
    youngCandidates: list[DiscoverCandidate] = []
    topN: int = 3


class DiscoverMatch(BaseModel):
    playerId: int
    name: str
    team: str
    position: str
    age: int
    similarity: float
    similarityPercentage: int


class DiscoverResponse(BaseModel):
    mlbSimilar: list[DiscoverMatch]
    youngSimilar: list[DiscoverMatch]


@router.post("/discover/similar", response_model=DiscoverResponse)
def discover_similar(req: DiscoverRequest):
    """
    対象選手と類似スタイルを持つ選手を2つのプールから返す。
    正規化: 候補プール全体の実際の分布からパーセンタイルを計算する（固定値を使わない）。
    野手: OPS/HR/SB/AVG/RBI / 投手: ERA/WHIP/K/BB/W/IP
    """
    is_pitcher = req.target.playerType == "pitcher"

    # 全候補（MLB + 若手 + target）を合わせて分布を計算する
    all_pool = req.mlbCandidates + req.youngCandidates + [req.target]

    if is_pitcher:
        pct_funcs  = build_pitcher_pct_funcs(all_pool)
        make_vector = lambda p: pitcher_percentile_vector(p, pct_funcs)
    else:
        pct_funcs  = build_hitter_pct_funcs(all_pool)
        make_vector = lambda p: hitter_percentile_vector(p, pct_funcs)

    target_vec = make_vector(req.target)

    def rank(candidates: list[DiscoverCandidate]) -> list[DiscoverMatch]:
        scored = []
        for c in candidates:
            if c.playerId == req.target.playerId:
                continue
            stat_sim = max(0.0, cosine_similarity(target_vec, make_vector(c)))
            blended  = STAT_WEIGHT * stat_sim + POS_WEIGHT * position_score(req.target.position, c.position)
            scored.append((c, blended))
        scored.sort(key=lambda x: x[1], reverse=True)
        return [
            DiscoverMatch(
                playerId=c.playerId,
                name=c.name,
                team=c.team,
                position=c.position,
                age=c.age,
                similarity=round(sim, 4),
                similarityPercentage=round(sim * 100),
            )
            for c, sim in scored[: req.topN]
        ]

    return DiscoverResponse(
        mlbSimilar=rank(req.mlbCandidates),
        youngSimilar=rank(req.youngCandidates),
    )
