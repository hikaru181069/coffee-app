# Architecture

## System Overview

```text
react -> express -> MongoDB
              |
           (fastAPI)
```

## Responsibility

### React（フロントエンド）

画面表示、フォーム入力、グラフ描画を担当。

やらないこと: DBの直接接続、fastAPIの直接接続（安全のため）。

### Express（バックエンド）

認証、CRUD、入力検証、外部に公開する唯一の窓口。

### fastAPI

DBに依存しない計算を担当する。MongoDBへの直接アクセスと認証は行わない
（ブラウザから直接叩かれることも無い。常にExpressが呼び出す）。

2026-09、知識グラフのコミュニティ検出（NetworkX、docs/features.md
「Graph Communities」参照）が最初の実装として入った。それまではヘルス
チェックのみで実装済みの機能が無い状態が続いていた
（`docs/mlb-legacy-inventory.md`参照）。

### MongoDB

データ保存のみ。

## Request Flow: Create Record

```text
RecordForm（画面）
  → POST /api/coffee-records（APIを呼ぶ）
  → authenticate（ログイン確認）
  → validator（入力チェック）
  → controller（リクエストの受け取り）
  → service（実際の処理）
  → MongoDB（保存）
  → フロントエンドへ結果を返す
```

## Request Flow: Graph Communities（fastAPIを経由する例）

fastAPIを実際に呼び出す唯一の機能（2026-09時点）。fastAPIはDBに触れず、
Expressが渡した計算済みのグラフ（nodes/edges）に対してNetworkXで
コミュニティ検出をするだけ。フロントエンドはfastAPIの存在を意識しない
（Expressの1つのエンドポイントを叩くだけ）。

```text
GraphPage（画面）
  → GET /api/graph/communities（APIを呼ぶ）
  → authenticate（ログイン確認）
  → controller
  → service（graphService.js: MongoDBからグラフを組み立てる。
             docs/knowledge-graph.mdと同じ手順）
  → POST http://fastapi:8000/graph/communities（services/fastApiService.js）
  → fastAPI（NetworkXでコミュニティ検出、DBには触れない）
  → Express（結果をそのまま集約）
  → フロントエンドへ結果を返す
```

fastAPIが応答しない・タイムアウトした場合でも、Expressは例外を投げず
空配列を返す（`graph本体`の表示は道連れにしない、docs/features.md
「Graph Communities」参照）。
