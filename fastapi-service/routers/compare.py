"""
/compare/analyze エンドポイント
2選手のスタッツをリーグ分布と照合して「カテゴリ別優劣 + 総合アドバンテージ」を返す。
野手 vs 野手 / 投手 vs 投手 の両方に対応。

データの流れ:
  Express → /compare/analyze
    - 2選手のスタッツ
    - リーグ分布（leagueStatsService のキャッシュ済みデータを再利用）
  FastAPI → パーセンタイル計算 + 優劣判定 + インサイト文生成 → 返す
"""

from fastapi import APIRouter
from pydantic import BaseModel

from core.math_utils import calc_percentile

router = APIRouter()


# ── リクエストモデル ────────────────────────────────────────────────────────────

class ComparePlayerStats(BaseModel):
    playerId: int
    name: str = ""
    playerType: str = "hitter"
    # 野手スタッツ
    ops: float = 0
    homeRuns: float = 0
    stolenBases: float = 0
    avg: float = 0
    rbi: float = 0
    # 投手スタッツ
    era: float = 0
    whip: float = 0
    strikeouts: float = 0
    walks: float = 0
    wins: float = 0
    innings: float = 0


class HitterDistribution(BaseModel):
    ops: list[float] = []
    homeRuns: list[float] = []
    stolenBases: list[float] = []
    avg: list[float] = []
    rbi: list[float] = []


class PitcherDistribution(BaseModel):
    era: list[float] = []
    whip: list[float] = []
    strikeouts: list[float] = []
    walks: list[float] = []
    wins: list[float] = []
    innings: list[float] = []


class CompareRequest(BaseModel):
    player1: ComparePlayerStats
    player2: ComparePlayerStats
    hitterDistribution: HitterDistribution = HitterDistribution()
    pitcherDistribution: PitcherDistribution = PitcherDistribution()


# ── レスポンスモデル ────────────────────────────────────────────────────────────

class CompareResponse(BaseModel):
    player1Percentiles: dict[str, int]
    player2Percentiles: dict[str, int]
    # 各カテゴリの勝者: "player1" | "player2" | "tie"
    categoryWinners: dict[str, str]
    player1Wins: int
    player2Wins: int
    ties: int
    # 総合優劣: "player1" | "player2" | "even"
    overallEdge: str
    # 0-100 スコア（50=互角、>50=player1 有利）
    edgeScore: int
    insight: str


# ── 内部ロジック ────────────────────────────────────────────────────────────────

def _hitter_percentiles(p: ComparePlayerStats, dist: HitterDistribution) -> dict[str, int]:
    return {
        "ops":         calc_percentile(p.ops,         dist.ops),
        "homeRuns":    calc_percentile(p.homeRuns,    dist.homeRuns),
        "stolenBases": calc_percentile(p.stolenBases, dist.stolenBases),
        "avg":         calc_percentile(p.avg,         dist.avg),
        "rbi":         calc_percentile(p.rbi,         dist.rbi),
    }


def _pitcher_percentiles(p: ComparePlayerStats, dist: PitcherDistribution) -> dict[str, int]:
    return {
        "era":        calc_percentile(p.era,        dist.era,        higher_is_better=False),
        "whip":       calc_percentile(p.whip,       dist.whip,       higher_is_better=False),
        "strikeouts": calc_percentile(p.strikeouts, dist.strikeouts),
        "walks":      calc_percentile(p.walks,      dist.walks,      higher_is_better=False),
        "wins":       calc_percentile(p.wins,       dist.wins),
        "innings":    calc_percentile(p.innings,    dist.innings),
    }


def _build_insight(name1: str, name2: str, p1_wins: int, p2_wins: int,
                   p1_pcts: dict, p2_pcts: dict) -> str:
    """優劣の要約文を生成する。"""
    if p1_wins == p2_wins:
        return f"{name1} and {name2} are closely matched across all categories."

    winner, loser = (name1, name2) if p1_wins > p2_wins else (name2, name1)
    winner_pcts = p1_pcts if p1_wins > p2_wins else p2_pcts
    loser_pcts  = p2_pcts if p1_wins > p2_wins else p1_pcts
    gap = abs(p1_wins - p2_wins)

    # 最も差が大きいカテゴリを探して言及する
    biggest_edge_cat = max(
        winner_pcts.keys(),
        key=lambda k: winner_pcts[k] - loser_pcts.get(k, 0)
    )
    cat_labels = {
        "ops": "OPS", "homeRuns": "Power", "stolenBases": "Speed",
        "avg": "Batting Average", "rbi": "RBI",
        "era": "ERA", "whip": "WHIP", "strikeouts": "Strikeouts",
        "walks": "Command", "wins": "Wins", "innings": "Durability",
    }
    cat_label = cat_labels.get(biggest_edge_cat, biggest_edge_cat)

    if gap >= 4:
        return f"{winner} has a commanding edge, particularly in {cat_label}."
    elif gap >= 2:
        return f"{winner} holds the overall edge. {cat_label} is their biggest advantage."
    else:
        return f"{winner} narrowly leads with a slight edge in {cat_label}."


# ── エンドポイント ──────────────────────────────────────────────────────────────

@router.post("/compare/analyze", response_model=CompareResponse)
def compare_analyze(req: CompareRequest):
    """
    2選手のスタッツをリーグパーセンタイルで比較して優劣を返す。

    アルゴリズム:
      1. 各スタッツをリーグ分布でパーセンタイル化（0-100）
      2. カテゴリごとに勝者を判定（5パーセンタイル差以内は tie）
      3. 勝ちカテゴリ数で総合 edgeScore を計算
      4. 最大差のカテゴリを言及したインサイト文を生成
    """
    is_pitcher = req.player1.playerType == "pitcher"

    if is_pitcher:
        p1_pcts = _pitcher_percentiles(req.player1, req.pitcherDistribution)
        p2_pcts = _pitcher_percentiles(req.player2, req.pitcherDistribution)
    else:
        p1_pcts = _hitter_percentiles(req.player1, req.hitterDistribution)
        p2_pcts = _hitter_percentiles(req.player2, req.hitterDistribution)

    category_winners: dict[str, str] = {}
    p1_wins = p2_wins = ties = 0

    for cat in p1_pcts:
        diff = p1_pcts[cat] - p2_pcts[cat]
        if abs(diff) <= 5:
            category_winners[cat] = "tie"
            ties += 1
        elif diff > 0:
            category_winners[cat] = "player1"
            p1_wins += 1
        else:
            category_winners[cat] = "player2"
            p2_wins += 1

    # edgeScore: 50=互角、>50=player1 有利
    total_decided = p1_wins + p2_wins
    if total_decided == 0:
        edge_score = 50
    else:
        edge_score = round(50 + (p1_wins - p2_wins) / total_decided * 50)

    if p1_wins > p2_wins:
        overall_edge = "player1"
    elif p2_wins > p1_wins:
        overall_edge = "player2"
    else:
        overall_edge = "even"

    insight = _build_insight(
        req.player1.name, req.player2.name,
        p1_wins, p2_wins, p1_pcts, p2_pcts
    )

    return CompareResponse(
        player1Percentiles=p1_pcts,
        player2Percentiles=p2_pcts,
        categoryWinners=category_winners,
        player1Wins=p1_wins,
        player2Wins=p2_wins,
        ties=ties,
        overallEdge=overall_edge,
        edgeScore=edge_score,
        insight=insight,
    )
