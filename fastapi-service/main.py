"""
Coffee App Analysis Service
FastAPI サービス — DBに依存しない計算処理だけを担当する

データの流れ:
  Express (Node.js) → FastAPI → Express → React

責務(docs/architecture.md):
  DB非依存の計算・将来の味覚分析・類似度計算。
  MongoDBへの直接アクセスと認証は行わない。

2026-09、知識グラフのコミュニティ検出（NetworkX）を追加した。これが
このサービスの最初の実装（それまではヘルスチェックのみ）。Expressが
backend/core/graph/graphBuilder.js で組み立て済みのnodes/edgesを渡し、
このサービスはDBに触れず計算だけを行う（docs/features.md
「Graph Communities」参照）。

エンドポイント一覧:
  GET  /               ヘルスチェック
  POST /graph/communities  知識グラフのコミュニティ検出
"""

from fastapi import FastAPI

from routers import graph

app = FastAPI(title="Coffee App Analysis Service", version="0.1.0")

app.include_router(graph.router, prefix="/graph", tags=["graph"])

# CORSミドルウェアは付けていない。docs/architecture.mdの通り、このサービスは
# ブラウザから直接叩かれる想定が無く（React → Express → FastAPI → Express →
# React、常にExpressがサーバー間で呼び出す）、CORSはブラウザが強制する仕組み
# のためサーバー間通信には関与しない。以前はhttp://localhost:5001（開発時の
# Expressのポート）宛にCORSを許可していたが、ブラウザから直接呼ぶ経路が
# 存在しないため実質意味を持たない設定だった。将来ブラウザから直接叩く
# エンドポイントを追加する場合は、そのときの許可元を明示して追加する。


@app.get("/")
def health_check():
    return {"status": "ok", "service": "Coffee App Analysis Service"}
