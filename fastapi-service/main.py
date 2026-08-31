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

app = FastAPI(title="Coffee App Analysis Service", version="0.1.0")

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
