"""
共通の数学ユーティリティ。
cosine_similarity / calc_percentile と、各ルーターが共有するベクトル変換関数を提供する。

依存関係:
  similar.py   → cosine_similarity, build_hitter_pct_funcs, build_pitcher_pct_funcs, percentile_vector
  recommend.py → cosine_similarity, build_hitter_pct_funcs, percentile_vector
  discover.py  → cosine_similarity, build_hitter_pct_funcs, build_pitcher_pct_funcs, percentile_vector
  scouting.py  → cosine_similarity, calc_percentile, scout_hitter_vector, scout_pitcher_vector (固定スケール継続)

パーセンタイルベクトル vs 固定スケールベクトル:
  - 固定スケール (STAT_SCALE): scouting.py の比較選手検索で使用。後方互換のため残す。
  - パーセンタイル (build_*_pct_funcs): 類似選手・推薦計算で使用。候補プールから動的に分布を計算する。

重み付き次元 (HITTER_WEIGHTS / PITCHER_WEIGHTS):
  - パーセンタイルベクトルに乗算して次元の重要度を調整する。
  - コサイン類似度は「方向」を測るため、重みが大きい次元ほど類似度への影響が強くなる。
  - 例: OPS は RBI より重要（RBI はチーム状況に依存）→ OPS の重みを高くする。
"""

import numpy as np


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """
    余弦類似度: 2つのベクトルの「向き」がどれだけ近いかを -1〜1 で返す。
    1.0 = 完全に同じ方向 / 0.0 = 無関係 / -1.0 = 逆方向
    """
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(np.dot(a, b) / (norm_a * norm_b))


def calc_percentile(
    value: float, distribution: list[float], higher_is_better: bool = True
) -> int:
    """値がリーグ分布の何パーセンタイルに相当するかを返す。"""
    if not distribution:
        return 50
    if higher_is_better:
        below = sum(1 for v in distribution if v < value)
        return round(below / len(distribution) * 100)
    else:
        above = sum(1 for v in distribution if v > value)
        return round(above / len(distribution) * 100)


# ── 固定スケールベクトル（scouting.py 専用・後方互換） ────────────────────────
# scouting.py の「比較選手検索」がこれを使っている。
# 新規コードでは使わず、下記のパーセンタイルベクトルを使うこと。

# 固定スケール: [ops, homeRuns, stolenBases, avg, rbi, sprintSpeed, armStrength]
# discovery_vector（レガシー）は先頭5次元のみ使う
STAT_SCALE = np.array([1.2, 60, 80, 0.35, 130, 31.0, 100.0], dtype=float)


def discovery_vector(stats) -> np.ndarray:
    """固定スケール野手ベクトル。scouting.py の後方互換用。新規コードでは使わない。"""
    if isinstance(stats, dict):
        raw = stats
    else:
        raw = stats.model_dump()
    values = np.array(
        [
            raw.get("ops", 0),
            raw.get("homeRuns", 0),
            raw.get("stolenBases", 0),
            raw.get("avg", 0),
            raw.get("rbi", 0),
        ],
        dtype=float,
    )
    return values / np.where(STAT_SCALE[:5] > 0, STAT_SCALE[:5], 1.0)


def scout_hitter_vector(player) -> np.ndarray:
    """固定スケール野手ベクトル。scouting.py 専用。sprintSpeed / armStrength を含む。"""
    values = np.array(
        [
            player.ops,
            player.homeRuns,
            player.stolenBases,
            player.avg,
            player.rbi,
            getattr(player, "sprintSpeed", 0),
            getattr(player, "armStrength", 0),
        ],
        dtype=float,
    )
    return values / np.where(STAT_SCALE > 0, STAT_SCALE, 1.0)


def scout_pitcher_vector(player) -> np.ndarray:
    """固定スケール投手ベクトル。scouting.py 専用。"""
    era_v = max(0.0, (6.0 - player.era) / 6.0)
    whip_v = max(0.0, (2.0 - player.whip) / 2.0)
    k_v = player.strikeouts / 250.0
    bb_v = max(0.0, (120 - player.walks) / 120.0)
    w_v = player.wins / 25.0
    ip_v = player.innings / 220.0
    return np.array([era_v, whip_v, k_v, bb_v, w_v, ip_v], dtype=float)


# ── ポジション類似度 ───────────────────────────────────────────────────────────
# 同じポジション・同じポジショングループほど高いスコアを返す。
# コサイン類似度（スタット）と混合して最終スコアを出す。

POSITION_GROUPS: dict[str, str] = {
    "C": "catcher",
    "1B": "corner_infield",
    "3B": "corner_infield",
    "2B": "middle_infield",
    "SS": "middle_infield",
    "LF": "corner_outfield",
    "RF": "corner_outfield",
    "OF": "corner_outfield",
    "CF": "center_field",
    "DH": "designated_hitter",
    "SP": "starter",
    "RP": "reliever",
    "P": "starter",
}

# スタット類似度 85% + ポジション類似度 15% で最終スコアを構成する
STAT_WEIGHT: float = 0.85
POS_WEIGHT: float = 0.15


def position_score(pos1: str, pos2: str) -> float:
    """
    ポジションの近さを 0〜1 で返す。
    同一ポジション → 1.0 / 同一グループ（例: LF と RF）→ 0.5 / 別グループ → 0.0
    空文字の場合はスコアを付けない（0.0）。
    """
    if not pos1 or not pos2:
        return 0.0
    if pos1 == pos2:
        return 1.0
    g1 = POSITION_GROUPS.get(pos1)
    g2 = POSITION_GROUPS.get(pos2)
    if g1 and g2 and g1 == g2:
        return 0.5
    return 0.0


# ── パーセンタイルベクトル（類似選手・推薦計算用） ────────────────────────────
# 候補プール全体の実際の分布から正規化する。固定値を使わない。
# 「このプールの中で何パーセンタイルか」を 0〜1 に変換し、次元ごとの重みを乗算してベクトルにする。

# 野手重み: [OPS, HR, SB, AVG, RBI, OAA, sprintSpeed, armStrength]
# OPS は打撃総合力として最重要。RBI はチーム打線依存のため最低重み。
# OAA は HR の次に重視（守備スタイルの識別に有効）。
# sprintSpeed は走塁スタイルの識別に有効（SB より速度の絶対値が重要）。
# armStrength は守備スタイルの補完情報。
HITTER_WEIGHTS = np.array([2.0, 1.5, 1.1, 1.0, 0.8, 1.3, 1.2, 0.9], dtype=float)

# 投手重み: [ERA, WHIP, K, BB, W, IP]
# ERA/WHIP を最重視。W（勝利数）はチーム依存度が高いため最低重み。
PITCHER_WEIGHTS = np.array([2.5, 2.0, 1.5, 1.0, 0.5, 1.0], dtype=float)


def build_hitter_pct_funcs(candidates: list) -> dict:
    """
    候補選手リストからスタット分布を計算し、
    各スタットを「プール内パーセンタイル（0〜1）」に変換する関数群を返す。

    呼び出し例:
        pct = build_hitter_pct_funcs(all_candidates)
        vec = hitter_percentile_vector(player, pct)
    """
    ops_dist    = [c.ops for c in candidates]
    hr_dist     = [c.homeRuns for c in candidates]
    sb_dist     = [c.stolenBases for c in candidates]
    avg_dist    = [c.avg for c in candidates]
    rbi_dist    = [c.rbi for c in candidates]
    oaa_dist    = [getattr(c, "oaa", 0) for c in candidates]
    sprint_dist = [getattr(c, "sprintSpeed", 0) for c in candidates]
    arm_dist    = [getattr(c, "armStrength", 0) for c in candidates]

    return {
        "ops":         lambda v: calc_percentile(v, ops_dist,    higher_is_better=True) / 100,
        "hr":          lambda v: calc_percentile(v, hr_dist,     higher_is_better=True) / 100,
        "sb":          lambda v: calc_percentile(v, sb_dist,     higher_is_better=True) / 100,
        "avg":         lambda v: calc_percentile(v, avg_dist,    higher_is_better=True) / 100,
        "rbi":         lambda v: calc_percentile(v, rbi_dist,    higher_is_better=True) / 100,
        "oaa":         lambda v: calc_percentile(v, oaa_dist,    higher_is_better=True) / 100,
        "sprintSpeed": lambda v: calc_percentile(v, sprint_dist, higher_is_better=True) / 100,
        "armStrength": lambda v: calc_percentile(v, arm_dist,    higher_is_better=True) / 100,
    }


def hitter_percentile_vector(player, pct_funcs: dict) -> np.ndarray:
    """
    野手のスタットを重み付きパーセンタイルベクトル（5次元）に変換する。
    各要素は「プール内パーセンタイル × 次元の重み」。
    重みにより OPS 方向のズレがコサイン類似度により強く反映される。
    """
    raw = np.array(
        [
            pct_funcs["ops"](player.ops),
            pct_funcs["hr"](player.homeRuns),
            pct_funcs["sb"](player.stolenBases),
            pct_funcs["avg"](player.avg),
            pct_funcs["rbi"](player.rbi),
            pct_funcs["oaa"](getattr(player, "oaa", 0)),
            pct_funcs["sprintSpeed"](getattr(player, "sprintSpeed", 0)),
            pct_funcs["armStrength"](getattr(player, "armStrength", 0)),
        ],
        dtype=float,
    )
    return raw * HITTER_WEIGHTS


def build_pitcher_pct_funcs(candidates: list) -> dict:
    """
    投手候補リストからスタット分布を計算し、パーセンタイル変換関数群を返す。
    ERA・WHIP・BB は低いほど良い（higher_is_better=False）。
    """
    era_dist = [c.era for c in candidates if c.era > 0]
    whip_dist = [c.whip for c in candidates if c.whip > 0]
    k_dist = [c.strikeouts for c in candidates]
    bb_dist = [c.walks for c in candidates]
    w_dist = [c.wins for c in candidates]
    ip_dist = [c.innings for c in candidates]

    return {
        "era": lambda v: calc_percentile(v, era_dist, higher_is_better=False) / 100,
        "whip": lambda v: calc_percentile(v, whip_dist, higher_is_better=False) / 100,
        "k": lambda v: calc_percentile(v, k_dist, higher_is_better=True) / 100,
        "bb": lambda v: calc_percentile(v, bb_dist, higher_is_better=False) / 100,
        "w": lambda v: calc_percentile(v, w_dist, higher_is_better=True) / 100,
        "ip": lambda v: calc_percentile(v, ip_dist, higher_is_better=True) / 100,
    }


def pitcher_percentile_vector(player, pct_funcs: dict) -> np.ndarray:
    """
    投手のスタットを重み付きパーセンタイルベクトル（6次元）に変換する。
    ERA・WHIP・BB は反転済み（低いほど高スコア）。W は重み 0.5（チーム依存）。
    """
    raw = np.array(
        [
            pct_funcs["era"](player.era),
            pct_funcs["whip"](player.whip),
            pct_funcs["k"](player.strikeouts),
            pct_funcs["bb"](player.walks),
            pct_funcs["w"](player.wins),
            pct_funcs["ip"](player.innings),
        ],
        dtype=float,
    )
    return raw * PITCHER_WEIGHTS
