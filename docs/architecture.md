# Architecture

## System Overview

```text
react -> express -> MongoDB
              |
           (fastAPI)

prometheus --(scrape /metrics)--> express, fastAPI
grafana --(query)--> prometheus
k6 --(load test)--> express (dev) / nginx (prod)
k6 --(remote_write)--> prometheus
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

### Grafana（可視化）

2026-09、Prometheusが集めたメトリクスを見るために追加した。データ
ソース（Prometheus）とダッシュボード（`monitoring/grafana/provisioning/
dashboards/coffee-app-overview.json`）はどちらも起動時に自動で読み込む
「プロビジョニング」で設定しており、GUIでの手動セットアップは不要
（ブラウザでログインするだけでよい）。ダッシュボードは、backend・
fastapiで同じメトリクス名（`http_request_duration_seconds`）を使って
いることを利用し、1つのクエリで両サービスを並べて表示する
（Targets Up・Request Rate・p95 Latency・Backend Memoryの4パネル）。

Grafana自体は`grafana-oss`イメージ（エンタープライズ機能を含まない、
純粋なOSSビルド）を使う。管理者パスワードは開発用が固定値
（`docker-compose.yml`の`admin`、JWT_SECRETの開発用値と同じ扱い）、
本番相当は`.env.prod`の`GRAFANA_ADMIN_PASSWORD`で必須指定する
（`${VAR:?...}`の書き方もJWT_SECRETと同じ）。開発用・本番相当は
ホスト側ポート（3000番・3001番）を分けて両立できる。

### k6（負荷テスト）

2026-09、実際にアプリへ負荷をかけて動作・性能を確認するために導入した。
Prometheus・Grafanaと違い常駐させる意味が無いサービスのため、
`docker-compose.yml`・`docker-compose.prod.yml`どちらでも
`profiles: ["load-test"]`を付け、`docker compose up`では起動せず、
明示的に呼び出したときだけ動くようにしている。

```bash
# 開発用
docker compose run --rm k6 run -o experimental-prometheus-rw /scripts/smoke-test.js

# 本番相当（ローカル再現）
docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm k6 run -o experimental-prometheus-rw /scripts/smoke-test.js
```

`monitoring/k6/scripts/smoke-test.js`は、ログイン→記録一覧・知識グラフ・
統計・マスターデータの閲覧という主要な閲覧フローを5仮想ユーザーで
30秒間繰り返す。`-o experimental-prometheus-rw`で、結果をリアルタイムに
Prometheusへ送る（`K6_PROMETHEUS_RW_SERVER_URL`）。これを受け取るため、
Prometheus自体にも`--web.enable-remote-write-receiver`フラグを追加した
（既定では無効）。結果はGrafanaの「k6 Load Test」ダッシュボード
（`monitoring/grafana/provisioning/dashboards/k6-load-test.json`）で見られ、
「coffee-app-overview」ダッシュボードのBackend Memory・Request Rateと
同時に見ることで、負荷がbackend側にどう跳ね返るかも確認できる。

dev/prodでAPIの入口が異なる（dev: backendコンテナへ直接、prod: frontend
のnginx経由）ため、`BASE_URL`環境変数で切り替えている。prod側をnginx
経由にしているのは、実際にブラウザが叩く経路と同じにすることで、
リバースプロキシを挟んだ分のオーバーヘッドも含めて計測するため。
VU数・実行時間は`VUS`・`DURATION`環境変数で変更できる
（`smoke-test.js`のコメント参照。ファイルをコピーせずコマンドだけで
負荷を変えられるようにするため）。

2026-09、「どのくらいの負荷から性能が崩れ始めるか」を探すための
`monitoring/k6/scripts/breakpoint-test.js`を追加した。`ramping-vus`
executorでVUを10→20→40→80→160と30秒おきに引き上げる
（`smoke-test.js`の`constant-vus`とは異なる負荷パターン）。実機で
実行したところ、160 VUまでエラー率は常に0%だったが、p99レイテンシは
VU70程度まで約100msで安定していたのがVU100〜140あたりから急激に
悪化し、ピーク時（VU140〜160）で約600〜700ms（最大868ms）まで伸びた
（Node.jsのシングルスレッドで処理しているbackendが、I/O待ちの混雑で
1件あたりの応答が遅くなるグレースフルな劣化。クラッシュ・エラー増加
という壊れ方ではない）。

### ロードバランシング（backend 3レプリカ）

2026-09、上記の劣化を実際に緩和できるか試すため、本番相当
（`docker-compose.prod.yml`）のbackendを単一コンテナから3レプリカ
（`backend1`/`backend2`/`backend3`、完全に同一の中身）へ増やし、
frontendのnginxでラウンドロビンさせるようにした（`frontend/nginx.conf`
の`upstream backend`ブロックに3台とも列挙するだけで、nginxは既定で
ラウンドロビンする）。開発用`docker-compose.yml`は単一の`backend`の
まま変更していない（ホットリロード中心の開発用途では複数台にする
意味が薄いため）。Prometheusのスクレイピング設定は、開発用と本番相当で
対象ホスト名が変わったため`prometheus.yml`（開発用）・
`prometheus.prod.yml`（本番相当）に分離した（`job_name`は揃えているため、
Grafana側のダッシュボード定義は変更不要）。

**実機で見つかった不具合**: nginxの静的な`upstream`ブロックは、起動時に
1度だけDockerの内部DNSでホスト名を解決し、それ以降は再解決しない
（動的な`resolver`ディレクティブを別途使わない限り）。backend1の
コンテナを作り直した際、nginx（frontend）は既に起動済みで古いIPを
キャッシュしたままだったため、`connect() failed (113: Host is
unreachable)`というエラーで backend1 への接続が失敗し続け、実際に
300リクエスト中backend1が受け取ったのはわずか1件だけ、という
実質的な機能不全が発生した。**backendコンテナを作り直した後は、
nginx（frontend）コンテナも再起動して新しいIPを解決し直す必要がある**
（`docker compose restart frontend`）。修正後、300リクエストを送ると
106/105/93と3台へほぼ均等に振り分けられることを確認した。

**breakpoint-test.jsでの効果測定**: ロードバランシング前後で同じ負荷
パターン（VU 10→20→40→80→160）を実行し比較した。

| 指標 | 単一backend | backend 3台+LB |
| --- | --- | --- |
| エラー率 | 0% | 0% |
| 平均応答時間 | 86.49ms | 7.6ms |
| p95応答時間 | 376.73ms | 16.98ms |
| 最大応答時間 | 556.87ms | 146.68ms |

p95で約22倍、平均で約11倍の改善。ロードバランシングにより、
「並行ユーザーが増えるとNode.jsのシングルスレッドがI/O待ちで詰まる」
というボトルネックが、3プロセスに分散されたことで大きく緩和された
ことが実測で確認できた。

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
