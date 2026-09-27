# Architecture

## System Overview

```text
react -> express -> MongoDB
              |
           (fastAPI)

prometheus --(scrape /metrics)--> express, fastAPI
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

### Prometheus（監視）

2026-09、AWS本番リリースに向けたDocker仕上げの一環で導入した。
Express・fastAPIそれぞれが公開する`GET /metrics`（`backend/middleware/
metrics.js`・`fastapi-service/main.py`のInstrumentator）を15秒間隔で
スクレイピングする（`monitoring/prometheus/prometheus.yml`）。

- Express: `@prometheus-io/client`（`prom-client`のnpm非推奨化に伴う
  公式後継パッケージ。APIは同一）でNode.jsランタイムの標準メトリクス
  （イベントループ遅延・メモリ・GC等）とHTTPリクエストのレイテンシ
  （`http_request_duration_seconds`）を収集する
- fastAPI: `prometheus-fastapi-instrumentator`（FastAPI公式ドキュメントが
  紹介する定番ライブラリ）が同様の内容を自動収集する

`/metrics`はどちらも`/api/`配下に置かず、認証も付けない。本番でも
backend・fastapiのポートはホストへ非公開（コンテナ間通信のみ、
docker-compose.prod.ymlのbackendサービスのコメント参照）で、frontendの
nginxも`/metrics`を`/api/`同様にはプロキシしないため、外部から直接
到達することは無い。Prometheus自体は`docker-compose.yml`（開発用、
ホスト9090番）・`docker-compose.prod.yml`（本番相当のローカル再現、
ホスト9091番）の両方に追加している。実際のAWS本番でどう構成するか
（Amazon Managed Service for Prometheus等）は未着手（IMPLEMENTATION.md
参照）。

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
