"""
core/math_utils.py のユニットテスト。

テストの考え方:
  各関数に「答えが分かっている入力」を渡し、返り値が期待通りかを assert で確認する。
  例えば cosine_similarity は「同じ向きのベクトル同士なら 1.0 になる」という
  数学的に保証された性質があるので、それをテストとして固定しておく。
  こうしておくと、後でコードを書き換えたときに壊れていないかを一瞬で確認できる。
"""

import numpy as np
import pytest

from core.math_utils import calc_percentile, cosine_similarity, position_score


# ── cosine_similarity ──────────────────────────────────────────────
# 2つのベクトルの「向き」がどれだけ近いかを -1〜1 で返す関数。
# 推薦システムの「似ている選手を探す」処理の中心にある計算。

def test_cosine_similarity_identical_vectors_is_1():
    # 完全に同じ向きのベクトル同士は類似度 1.0 になるはず
    a = np.array([1.0, 2.0, 3.0])
    assert cosine_similarity(a, a) == pytest.approx(1.0)


def test_cosine_similarity_opposite_vectors_is_minus_1():
    # 正反対の向きのベクトルは類似度 -1.0 になるはず
    a = np.array([1.0, 0.0])
    b = np.array([-1.0, 0.0])
    assert cosine_similarity(a, b) == pytest.approx(-1.0)


def test_cosine_similarity_orthogonal_vectors_is_0():
    # 直交（90度）するベクトルは類似度 0.0 になるはず
    a = np.array([1.0, 0.0])
    b = np.array([0.0, 1.0])
    assert cosine_similarity(a, b) == pytest.approx(0.0)


def test_cosine_similarity_zero_vector_does_not_crash():
    # ゼロベクトルは長さ0なので本来なら0除算になってしまう。
    # 実装ではこのケースを検知して 0.0 を返すようにガードしているはず。
    a = np.array([0.0, 0.0])
    b = np.array([1.0, 2.0])
    assert cosine_similarity(a, b) == 0.0


# ── calc_percentile ────────────────────────────────────────────────
# 「選手の成績がリーグの中で何パーセンタイルか」を計算する関数。
# Scouting Reportのパーセンタイルバーなどで使われている。

def test_calc_percentile_higher_is_better_middle_value():
    # 分布 [10, 20, 30, 40, 50] の中で 30 より小さい値は 10, 20 の2個 → 2/5 = 40%
    distribution = [10, 20, 30, 40, 50]
    assert calc_percentile(30, distribution, higher_is_better=True) == 40


def test_calc_percentile_higher_is_better_top_value():
    # 一番大きい値なら、自分より小さい値が全部（4個）→ 4/5 = 80%
    distribution = [10, 20, 30, 40, 50]
    assert calc_percentile(50, distribution, higher_is_better=True) == 80


def test_calc_percentile_lower_is_better_inverts_ranking():
    # ERAのように低いほど良い指標では、自分より大きい値の割合を返す。
    # 分布 [1.0, 2.0, 3.0, 4.0] の中で 2.0 より大きい値は 3.0, 4.0 の2個 → 2/4 = 50%
    distribution = [1.0, 2.0, 3.0, 4.0]
    assert calc_percentile(2.0, distribution, higher_is_better=False) == 50


def test_calc_percentile_empty_distribution_returns_50():
    # 比較対象データが無いときは「平均的」とみなして50を返す仕様
    assert calc_percentile(100, []) == 50


# ── position_score ─────────────────────────────────────────────────
# 2つのポジションがどれくらい近いかを 0〜1 で返す関数。
# 類似選手検索でスタットの類似度と組み合わせて使われる。

def test_position_score_same_position_is_1():
    assert position_score("SS", "SS") == 1.0


def test_position_score_same_group_is_half():
    # LFとRFは同じ "corner_outfield" グループ扱い
    assert position_score("LF", "RF") == 0.5


def test_position_score_different_group_is_0():
    assert position_score("C", "SP") == 0.0


def test_position_score_empty_position_is_0():
    # ポジション不明の選手にはスコアを付けない仕様
    assert position_score("", "SS") == 0.0
    assert position_score("SS", "") == 0.0
