"""
Coffee App Analysis Service
FastAPI サービス — DBに依存しない計算処理だけを担当する

データの流れ:
  Express (Node.js) → FastAPI → Express → React

責務(docs/architecture.md):
  DB非依存の計算・将来の味覚分析・類似度計算。
  MongoDBへの直接アクセスと認証は行わない。

MVPでは知識グラフの変換をExpress内の純粋関数（backend/core/graph）で
行っており（docs/architecture.md の Architecture Decision）、
このサービスに実装済みの機能は無い。将来、味覚の類似度計算など
DB非依存の重い計算処理が必要になった時点でルーターを追加する。

エンドポイント一覧:
  GET / ヘルスチェック
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Coffee App Analysis Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5001"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def health_check():
    return {"status": "ok", "service": "Coffee App Analysis Service"}
