"""
/archetype/classify エンドポイント

設計: パーセンタイルベースの多ラベル分類
  - k-means（単一クラスタ）ではなく、各スタット軸を独立に評価する
  - リーグ上位200人の分布から動的に閾値を計算（固定値ではない）
  - 1選手が複数タグを持てる (例: [Speedster, Contact Hitter])
  - どの条件も満たさない場合は空リスト → フロントで styleScores を表示

パーセンタイル閾値: THRESHOLD = 75
  → 上位200人の中で上位25%（= リーグ全体で上位約5〜8%）
"""

from fastapi import APIRouter
from pydantic import BaseModel

from core.math_utils import calc_percentile

router = APIRouter()

# リーグ上位200人の中で何パーセンタイル以上でタグをつけるか
# 65 = top-200 の上位 35%（≈ リーグ全体で上位 7〜10%）
# → 複数カテゴリで活躍する選手が 2〜3 タグを持ちやすくなる
THRESHOLD = 65


# ── リクエスト / レスポンスモデル ──────────────────────────────────────────────

class ArchetypeCandidate(BaseModel):
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
    # 捕手の守備力はOAAでは評価されない(Baseball Savant側でも対象外)ため、
    # フレーミング(捕球技術による失点抑制ランズ)で代替する。捕手以外はNone。
    catcherFraming: float | None = None
    # 投手スタッツ
    era: float = 0
    whip: float = 0
    strikeouts: float = 0
    walks: float = 0
    wins: float = 0
    innings: float = 0


class ClassifyRequest(BaseModel):
    candidates: list[ArchetypeCandidate]
    playerType: str = "hitter"


class StyleScores(BaseModel):
    # 野手軸 (0-100 パーセンタイル)
    power: int = 0
    speed: int = 0
    contact: int = 0
    # 守備データが無い選手(OAA・フレーミングどちらも無い)はNone。
    # 0にすると「最低評価」に見えてしまうため、「データなし」と「最低評価」を区別する。
    defense: int | None = None
    # 投手軸 (0-100 パーセンタイル)
    dominance: int = 0
    control: int = 0
    durability: int = 0


class ArchetypeResult(BaseModel):
    playerId: int
    archetypes: list[str]   # 複数タグ (空リストもあり)
    styleScores: StyleScores


class ArchetypeResponse(BaseModel):
    players: list[ArchetypeResult]


# ── 分類ロジック ───────────────────────────────────────────────────────────────

def _classify_hitters(candidates: list[ArchetypeCandidate]) -> list[ArchetypeResult]:
    """
    野手を多ラベル分類する。
    各スタット軸のパーセンタイルを計算し、THRESHOLD 以上ならタグを付与する。
    """
    hr_dist  = [c.homeRuns    for c in candidates]
    sb_dist  = [c.stolenBases for c in candidates]
    avg_dist = [c.avg         for c in candidates]
    # 捕手かどうかはpositionではなくcatcherFramingの有無で判定する。
    # MLB Stats APIの成績エンドポイントはprimaryPositionが空文字になることがあり
    # (捕手でもpositionが取れないケースが実際にある)、position判定だけでは
    # 捕手を取りこぼしてしまうため。catcherFramingは捕手のみに紐付くデータなので
    # 「値がある = 捕手」として扱える。
    oaa_dist = [c.oaa for c in candidates if c.catcherFraming is None and c.oaa != 0]
    framing_dist = [c.catcherFraming for c in candidates if c.catcherFraming is not None]

    results = []
    for c in candidates:
        hr_pct  = calc_percentile(c.homeRuns,    hr_dist)
        sb_pct  = calc_percentile(c.stolenBases, sb_dist)
        avg_pct = calc_percentile(c.avg,         avg_dist)

        if c.catcherFraming is not None:
            defense_pct = calc_percentile(c.catcherFraming, framing_dist) if framing_dist else None
        else:
            defense_pct = calc_percentile(c.oaa, oaa_dist) if c.oaa != 0 and oaa_dist else None

        tags: list[str] = []
        if hr_pct >= THRESHOLD:
            tags.append("Power Hitter")
        if sb_pct >= THRESHOLD:
            tags.append("Speedster")
        if avg_pct >= THRESHOLD:
            tags.append("Contact Hitter")
        if defense_pct is not None and defense_pct >= THRESHOLD:
            tags.append("Elite Defender")

        results.append(ArchetypeResult(
            playerId=c.playerId,
            archetypes=tags,
            styleScores=StyleScores(power=hr_pct, speed=sb_pct, contact=avg_pct, defense=defense_pct),
        ))

    return results


def _classify_pitchers(candidates: list[ArchetypeCandidate]) -> list[ArchetypeResult]:
    """
    投手を多ラベル分類する。
    ERA・BB は低いほど良いので higher_is_better=False で計算する。
    """
    era_dist = [c.era        for c in candidates if c.era > 0]
    k_dist   = [c.strikeouts for c in candidates]
    bb_dist  = [c.walks      for c in candidates]
    ip_dist  = [c.innings    for c in candidates]

    results = []
    for c in candidates:
        era_pct = calc_percentile(c.era,        era_dist, higher_is_better=False) if c.era > 0 else 0
        k_pct   = calc_percentile(c.strikeouts, k_dist)
        bb_pct  = calc_percentile(c.walks,      bb_dist,  higher_is_better=False)
        ip_pct  = calc_percentile(c.innings,    ip_dist)

        tags: list[str] = []
        if era_pct >= THRESHOLD:
            tags.append("Ace")
        if k_pct >= THRESHOLD:
            tags.append("Power Pitcher")
        if bb_pct >= THRESHOLD:
            tags.append("Control Artist")
        if ip_pct >= THRESHOLD:
            tags.append("Workhorse")

        results.append(ArchetypeResult(
            playerId=c.playerId,
            archetypes=tags,
            styleScores=StyleScores(dominance=era_pct, control=bb_pct, durability=ip_pct),
        ))

    return results


# ── エンドポイント ─────────────────────────────────────────────────────────────

@router.post("/archetype/classify", response_model=ArchetypeResponse)
def classify_archetypes(req: ClassifyRequest):
    """
    選手リストを多ラベルアーキタイプに分類する。

    アルゴリズム:
      1. 入力された選手群（リーグ上位200人）から各スタットの分布を作成
      2. 各選手のスタットを分布に対してパーセンタイル化（0-100）
      3. THRESHOLD (75) 以上の軸にタグを付与
      4. styleScores（各軸のパーセンタイル値）も返す（フロント表示用）
    """
    if req.playerType == "pitcher":
        players = _classify_pitchers(req.candidates)
    else:
        players = _classify_hitters(req.candidates)

    return ArchetypeResponse(players=players)
