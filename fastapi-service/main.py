"""
MLB Similar Players API
FastAPI サービス — 選手の成績ベクトルをもとに類似選手を計算して返す

データの流れ:
  Express (Node.js) → FastAPI → Express → React

エンドポイント一覧:
  GET  /                       ヘルスチェック
  POST /similar                類似選手（レガシー）
  POST /recommend              推薦スコアリング
  POST /recommend/future-stars Rising Stars
  POST /discover/similar       プレイヤー発見
  POST /discover/preference    行動履歴からの好み一致度・dislike減点
  POST /scouting-report        スカウティングレポート
  POST /archetype/classify     パーセンタイルベース 多ラベルアーキタイプ分類
  POST /compare/analyze        2選手の統計的優劣分析
  POST /matchup/predict        投手 vs 打者の予想成績
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers import archetype, compare, discover, matchup, preference, recommend, similar, scouting

app = FastAPI(title="MLB Similar Players API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5001"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(archetype.router)
app.include_router(compare.router)
app.include_router(discover.router)
app.include_router(matchup.router)
app.include_router(preference.router)
app.include_router(recommend.router)
app.include_router(similar.router)
app.include_router(scouting.router)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "MLB Similar Players API"}
