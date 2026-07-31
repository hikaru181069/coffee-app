"""
/scouting-report エンドポイント
選手の成績をリーグ分布と比較してパーセンタイル・強み弱み・比較選手を返す。
Express からリーグ分布データを受け取るため、FastAPI 側は MLB API を叩かない。
"""

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from core.math_utils import (
    cosine_similarity,
    calc_percentile,
    scout_hitter_vector,
    scout_pitcher_vector,
)

router = APIRouter()


# ── 野手モデル ──────────────────────────────────────────────────────────────────

class ScoutingStats(BaseModel):
    ops: float = 0
    homeRuns: float = 0
    stolenBases: float = 0
    avg: float = 0
    rbi: float = 0
    oaa: Optional[float] = None
    sprintSpeed: float = 0
    armStrength: float = 0


class LeagueStatsDistribution(BaseModel):
    ops: list[float] = []
    homeRuns: list[float] = []
    stolenBases: list[float] = []
    avg: list[float] = []
    rbi: list[float] = []
    oaa: list[float] = []
    oaaByPosition: dict[str, list[float]] = {}
    sprintSpeed: list[float] = []
    armStrength: list[float] = []


class LeaguePlayer(BaseModel):
    playerId: int
    name: str = ""
    team: str = ""
    ops: float = 0
    homeRuns: float = 0
    stolenBases: float = 0
    avg: float = 0
    rbi: float = 0
    sprintSpeed: float = 0
    armStrength: float = 0


# ── 投手モデル ──────────────────────────────────────────────────────────────────

class PitcherStats(BaseModel):
    era: float = 0
    whip: float = 0
    strikeouts: float = 0
    walks: float = 0
    wins: float = 0
    innings: float = 0


class PitcherStatsDistribution(BaseModel):
    era: list[float] = []
    whip: list[float] = []
    strikeouts: list[float] = []
    walks: list[float] = []
    wins: list[float] = []
    innings: list[float] = []


class PitcherLeaguePlayer(BaseModel):
    playerId: int
    name: str = ""
    team: str = ""
    era: float = 0
    whip: float = 0
    strikeouts: float = 0
    walks: float = 0
    wins: float = 0
    innings: float = 0


# ── リクエスト / レスポンス ────────────────────────────────────────────────────

class ScoutingReportRequest(BaseModel):
    playerType: str = "hitter"
    playerPosition: str = ""
    playerIdToExclude: int = 0
    # 野手フィールド
    player: ScoutingStats = ScoutingStats()
    leagueStats: LeagueStatsDistribution = LeagueStatsDistribution()
    comparablePlayers: list[LeaguePlayer] = []
    # 投手フィールド
    pitcherPlayer: PitcherStats = PitcherStats()
    pitcherLeagueStats: PitcherStatsDistribution = PitcherStatsDistribution()
    pitcherComparables: list[PitcherLeaguePlayer] = []


class ComparablePlayer(BaseModel):
    playerId: int
    name: str
    team: str
    similarity: float
    similarityPercentage: int


class ScoutingReportResponse(BaseModel):
    percentiles: dict[str, int]
    poolSizes: dict[str, int] = {}
    playerType: str
    strengths: list[str]
    weaknesses: list[str]
    comparablePlayers: list[ComparablePlayer]


# ── 野手ロジック ──────────────────────────────────────────────────────────────

HITTER_TYPE_THRESHOLDS = [
    ("Five-Tool Threat", lambda p: p["ops"] >= 80 and p["homeRuns"] >= 75 and p["stolenBases"] >= 75),
    ("Power Hitter",     lambda p: p["homeRuns"] >= 80 and p["ops"] >= 70),
    ("Speed Threat",     lambda p: p["stolenBases"] >= 80 and p["avg"] >= 70),
    ("RBI Machine",      lambda p: p["rbi"] >= 80 and p["homeRuns"] >= 65),
    ("Contact Hitter",   lambda p: p["avg"] >= 80),
    ("Elite Hitter",     lambda p: p["ops"] >= 85),
    ("Speedster",        lambda p: p["stolenBases"] >= 80),
]

HITTER_STRENGTH_LABELS = {
    "ops":         "Elite OPS",
    "homeRuns":    "Elite Power",
    "stolenBases": "Exceptional Speed",
    "avg":         "High Batting Average",
    "rbi":         "Run Producer",
    "oaa":         "Elite Defender",
    "sprintSpeed": "Elite Sprinter",
    "armStrength": "Strong Arm",
}

HITTER_WEAKNESS_LABELS = {
    "ops":         "Below Average OPS",
    "homeRuns":    "Limited Power",
    "stolenBases": "Below Average Speed",
    "avg":         "Low Batting Average",
    "rbi":         "Low RBI Production",
    "oaa":         "Below Average Defense",
    "sprintSpeed": "Below Average Sprint Speed",
    "armStrength": "Weak Arm",
}


def _scouting_report_hitter(req: ScoutingReportRequest) -> ScoutingReportResponse:
    p = req.player
    dist = req.leagueStats

    pool_sizes = {
        "ops":         len(dist.ops),
        "homeRuns":    len(dist.homeRuns),
        "stolenBases": len(dist.stolenBases),
        "avg":         len(dist.avg),
        "rbi":         len(dist.rbi),
    }
    percentiles = {
        "ops":         calc_percentile(p.ops,         dist.ops),
        "homeRuns":    calc_percentile(p.homeRuns,    dist.homeRuns),
        "stolenBases": calc_percentile(p.stolenBases, dist.stolenBases),
        "avg":         calc_percentile(p.avg,         dist.avg),
        "rbi":         calc_percentile(p.rbi,         dist.rbi),
    }
    # OAA: ポジション別分布を優先。サンプル数 < 10 なら全体分布にフォールバック
    if p.oaa is not None:
        pos_dist = dist.oaaByPosition.get(req.playerPosition, [])
        oaa_dist = pos_dist if len(pos_dist) >= 10 else dist.oaa
        if oaa_dist:
            percentiles["oaa"] = calc_percentile(p.oaa, oaa_dist)
            pool_sizes["oaa"]  = len(oaa_dist)
    if p.sprintSpeed > 0 and dist.sprintSpeed:
        percentiles["sprintSpeed"] = calc_percentile(p.sprintSpeed, dist.sprintSpeed)
        pool_sizes["sprintSpeed"]  = len(dist.sprintSpeed)
    if p.armStrength > 0 and dist.armStrength:
        percentiles["armStrength"] = calc_percentile(p.armStrength, dist.armStrength)
        pool_sizes["armStrength"]  = len(dist.armStrength)

    player_type = "Solid Regular"
    for type_name, condition in HITTER_TYPE_THRESHOLDS:
        if condition(percentiles):
            player_type = type_name
            break

    strengths  = [HITTER_STRENGTH_LABELS[s]  for s, pct in percentiles.items() if pct >= 80]
    weaknesses = [HITTER_WEAKNESS_LABELS[s]  for s, pct in percentiles.items() if pct <= 30]

    target_vec = scout_hitter_vector(p)
    scored = [
        (lp, max(0.0, cosine_similarity(target_vec, scout_hitter_vector(lp))))
        for lp in req.comparablePlayers
        if lp.playerId != req.playerIdToExclude
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    return ScoutingReportResponse(
        percentiles=percentiles,
        poolSizes=pool_sizes,
        playerType=player_type,
        strengths=strengths,
        weaknesses=weaknesses,
        comparablePlayers=[
            ComparablePlayer(
                playerId=lp.playerId, name=lp.name, team=lp.team,
                similarity=round(sim, 4), similarityPercentage=round(sim * 100),
            )
            for lp, sim in scored[:3]
        ],
    )


# ── 投手ロジック ──────────────────────────────────────────────────────────────

PITCHER_TYPE_THRESHOLDS = [
    ("Ace",             lambda p: p["era"] >= 85 and p["strikeouts"] >= 80),
    ("Power Pitcher",   lambda p: p["strikeouts"] >= 80),
    ("Control Artist",  lambda p: p["walks"] >= 85 and p["era"] >= 70),
    ("Workhorse",       lambda p: p["innings"] >= 80 and p["era"] >= 60),
    ("Veteran Starter", lambda p: p["wins"] >= 75 and p["era"] >= 55),
    ("Relief Pitcher",  lambda p: p["innings"] <= 30),
]

PITCHER_STRENGTH_LABELS = {
    "era":        "Elite ERA",
    "whip":       "Elite WHIP",
    "strikeouts": "High Strikeout Rate",
    "walks":      "Exceptional Control",
    "wins":       "Winning Record",
    "innings":    "Durable Workhorse",
}

PITCHER_WEAKNESS_LABELS = {
    "era":        "High ERA",
    "whip":       "High WHIP",
    "strikeouts": "Low Strikeout Rate",
    "walks":      "Poor Command",
    "wins":       "Win-Loss Concerns",
    "innings":    "Limited Innings",
}


def _scouting_report_pitcher(req: ScoutingReportRequest) -> ScoutingReportResponse:
    p = req.pitcherPlayer
    dist = req.pitcherLeagueStats

    pool_sizes = {
        "era":        len(dist.era),
        "whip":       len(dist.whip),
        "strikeouts": len(dist.strikeouts),
        "walks":      len(dist.walks),
        "wins":       len(dist.wins),
        "innings":    len(dist.innings),
    }
    percentiles = {
        "era":        calc_percentile(p.era,        dist.era,        higher_is_better=False),
        "whip":       calc_percentile(p.whip,       dist.whip,       higher_is_better=False),
        "strikeouts": calc_percentile(p.strikeouts, dist.strikeouts, higher_is_better=True),
        "walks":      calc_percentile(p.walks,      dist.walks,      higher_is_better=False),
        "wins":       calc_percentile(p.wins,       dist.wins,       higher_is_better=True),
        "innings":    calc_percentile(p.innings,    dist.innings,    higher_is_better=True),
    }

    player_type = "Starting Pitcher"
    for type_name, condition in PITCHER_TYPE_THRESHOLDS:
        if condition(percentiles):
            player_type = type_name
            break

    strengths  = [PITCHER_STRENGTH_LABELS[s]  for s, pct in percentiles.items() if pct >= 80]
    weaknesses = [PITCHER_WEAKNESS_LABELS[s]  for s, pct in percentiles.items() if pct <= 30]

    target_vec = scout_pitcher_vector(p)
    scored = [
        (lp, max(0.0, cosine_similarity(target_vec, scout_pitcher_vector(lp))))
        for lp in req.pitcherComparables
        if lp.playerId != req.playerIdToExclude
    ]
    scored.sort(key=lambda x: x[1], reverse=True)

    return ScoutingReportResponse(
        percentiles=percentiles,
        poolSizes=pool_sizes,
        playerType=player_type,
        strengths=strengths,
        weaknesses=weaknesses,
        comparablePlayers=[
            ComparablePlayer(
                playerId=lp.playerId, name=lp.name, team=lp.team,
                similarity=round(sim, 4), similarityPercentage=round(sim * 100),
            )
            for lp, sim in scored[:3]
        ],
    )


@router.post("/scouting-report", response_model=ScoutingReportResponse)
def scouting_report(req: ScoutingReportRequest):
    """野手・投手を自動判別してスカウティングレポートを生成する。"""
    if req.playerType == "pitcher":
        return _scouting_report_pitcher(req)
    return _scouting_report_hitter(req)
