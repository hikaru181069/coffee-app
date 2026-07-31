"""
/matchup/predict エンドポイント
投手と打者のシーズン成績から、この対戦での「予想成績」を推定して返す。

予測モデル:
  - 予想打率 = 打者の実際の打率 を投手の質スコアで補正
  - 三振確率 = 投手のK率 と 打者の推定被K率 を平均
  - 四球確率 = 投手のBB率 と 打者の推定BB率 を平均
  - HR確率   = 打者のHR/PA率 を投手の質で補正

データの流れ:
  Express → /matchup/predict
    - 投手スタッツ + 打者スタッツ
    - リーグ分布（パーセンタイル計算に使用）
  FastAPI → 予想成績 + アドバンテージ判定 + インサイト文 → 返す

注意: これは統計的な近似モデルです。
  精密な予測には Statcast データや機械学習モデルが必要です。
  ポートフォリオとして「傾向を示す」用途で使用してください。
"""

from fastapi import APIRouter
from pydantic import BaseModel

from core.math_utils import calc_percentile

router = APIRouter()


# ── リクエストモデル ────────────────────────────────────────────────────────────

class MatchupPitcher(BaseModel):
    playerId: int
    name: str = ""
    era: float = 4.00
    whip: float = 1.30
    strikeouts: float = 0
    walks: float = 0
    wins: float = 0
    innings: float = 0


class MatchupBatter(BaseModel):
    playerId: int
    name: str = ""
    avg: float = 0.250
    ops: float = 0.700
    homeRuns: float = 0
    stolenBases: float = 0
    rbi: float = 0


class PitcherLeagueDist(BaseModel):
    era: list[float] = []
    whip: list[float] = []
    strikeouts: list[float] = []
    walks: list[float] = []
    innings: list[float] = []


class BatterLeagueDist(BaseModel):
    avg: list[float] = []
    ops: list[float] = []
    homeRuns: list[float] = []


class MatchupPredictRequest(BaseModel):
    pitcher: MatchupPitcher
    batter: MatchupBatter
    pitcherLeague: PitcherLeagueDist = PitcherLeagueDist()
    batterLeague: BatterLeagueDist = BatterLeagueDist()


# ── レスポンスモデル ────────────────────────────────────────────────────────────

class MatchupPredictResponse(BaseModel):
    # 予想成績
    expectedBA: float        # 予想打率
    kProbability: int        # 三振確率 (0-100)
    bbProbability: int       # 四球確率 (0-100)
    hrProbabilityPerPA: int  # 1打席あたりHR確率 (0-100)
    # 優劣
    advantage: str           # "pitcher" | "batter" | "even"
    advantageScore: int      # 0-100 (50=互角、>50=投手有利)
    # 各選手のリーグ内品質スコア (0-100)
    pitcherQualityScore: int
    batterQualityScore: int
    insight: str


# ── エンドポイント ──────────────────────────────────────────────────────────────

@router.post("/matchup/predict", response_model=MatchupPredictResponse)
def matchup_predict(req: MatchupPredictRequest):
    """
    投手 vs 打者の予想成績を算出する。

    アルゴリズム:
      1. 投手の品質スコア = ERA・WHIP・K率 のパーセンタイル加重平均
      2. 打者の品質スコア = AVG・OPS・HR率 のパーセンタイル加重平均
      3. 予想打率 = 打者の実績打率 × (1 - 投手品質による補正)
      4. 三振/四球確率 = 投手のK率・BB率 と 打者側の傾向を平均
      5. HR確率 = 打者のHR/PA率 × 投手品質補正
      6. アドバンテージ = 投手品質 vs 打者品質 の差で判定
    """
    p = req.pitcher
    b = req.batter
    pd = req.pitcherLeague
    bd = req.batterLeague

    # ── 投手品質スコア (0.0-1.0) ─────────────────────────────────────────────
    era_pct  = calc_percentile(p.era,        pd.era,        higher_is_better=False) / 100 if pd.era  else 0.5
    whip_pct = calc_percentile(p.whip,       pd.whip,       higher_is_better=False) / 100 if pd.whip else 0.5
    k_pct    = calc_percentile(p.strikeouts, pd.strikeouts) / 100 if pd.strikeouts else 0.5

    # ERA・WHIP は投球全体の質、Kは奪三振力を表す → 加重平均
    pitcher_quality = era_pct * 0.4 + whip_pct * 0.35 + k_pct * 0.25

    # ── 打者品質スコア (0.0-1.0) ─────────────────────────────────────────────
    avg_pct = calc_percentile(b.avg, bd.avg) / 100 if bd.avg else 0.5
    ops_pct = calc_percentile(b.ops, bd.ops) / 100 if bd.ops else 0.5
    hr_pct  = calc_percentile(b.homeRuns, bd.homeRuns) / 100 if bd.homeRuns else 0.3

    batter_quality = avg_pct * 0.4 + ops_pct * 0.4 + hr_pct * 0.2

    # ── 予想打率 ──────────────────────────────────────────────────────────────
    # 打者の実績打率を基準に、投手品質が高いほど下方修正する。
    # 補正幅: 最大 ±0.060（投手が最高品質ならば -6%、最低ならば +6%）
    pitcher_adj = (pitcher_quality - 0.5) * -0.12
    expected_ba = max(0.100, min(0.450, round(b.avg + pitcher_adj, 3)))

    # ── 三振確率 ──────────────────────────────────────────────────────────────
    # 投手のK/9 → K/PA に換算（1イニング≈2.7打者）
    pitcher_k_rate = p.strikeouts / (p.innings * 2.7) if p.innings > 0 else 0.20
    pitcher_k_rate = min(0.40, max(0.05, pitcher_k_rate))
    # 打者の推定被K率: AVG が低いほど三振が多い傾向（粗い近似）
    batter_k_est = max(0.10, min(0.35, 0.35 - (b.avg - 0.200) * 0.8))
    k_probability = round(min(55, (pitcher_k_rate + batter_k_est) / 2 * 100))

    # ── 四球確率 ──────────────────────────────────────────────────────────────
    # 投手のBB/9 → BB/PA
    pitcher_bb_rate = p.walks / (p.innings * 2.7) if p.innings > 0 else 0.08
    pitcher_bb_rate = min(0.20, max(0.02, pitcher_bb_rate))
    # 打者の推定BB率: OBP - AVG ≈ BB + HBP の近似（過剰簡略化に注意）
    batter_bb_est = max(0.03, min(0.15, (b.ops * 0.38 - b.avg * 0.8)))
    bb_probability = round(min(20, (pitcher_bb_rate + batter_bb_est) / 2 * 100))

    # ── HR確率 (1打席あたり) ─────────────────────────────────────────────────
    # シーズン想定: 162試合 × 約4PA = 648PA
    hr_per_pa = b.homeRuns / 648 if b.homeRuns > 0 else 0.025
    # 投手品質が高いほど HR確率は下がる（最大50%減）
    hr_adj = 1.0 - (pitcher_quality - 0.5) * 0.50
    hr_prob = round(min(12, max(0, hr_per_pa * hr_adj * 100)))

    # ── アドバンテージ判定 ────────────────────────────────────────────────────
    # edgeScore: 50=互角、>50=投手有利、<50=打者有利
    edge_score = round(50 + (pitcher_quality - batter_quality) * 60)
    edge_score = max(10, min(90, edge_score))

    if edge_score >= 58:
        advantage = "pitcher"
    elif edge_score <= 42:
        advantage = "batter"
    else:
        advantage = "even"

    # ── インサイト文 ──────────────────────────────────────────────────────────
    pq = round(pitcher_quality * 100)
    bq = round(batter_quality * 100)

    if advantage == "pitcher":
        insight = (
            f"{p.name} has the edge — elite pitching quality (top {100 - pq}%) "
            f"limits {b.name}'s expected production."
        )
    elif advantage == "batter":
        insight = (
            f"{b.name} has the edge — strong hitting profile (top {100 - bq}%) "
            f"gives the advantage against {p.name}."
        )
    else:
        insight = (
            f"A competitive matchup. {p.name} and {b.name} "
            f"are closely matched in quality."
        )

    return MatchupPredictResponse(
        expectedBA=expected_ba,
        kProbability=k_probability,
        bbProbability=bb_probability,
        hrProbabilityPerPA=hr_prob,
        advantage=advantage,
        advantageScore=edge_score,
        pitcherQualityScore=pq,
        batterQualityScore=bq,
        insight=insight,
    )
