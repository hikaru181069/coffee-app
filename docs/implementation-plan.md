# Implementation Plan

## Principle

一度にアプリ全体を生成させず、
動作確認できる縦方向の小さな単位で実装します。

## Phase 0: Repository Bootstrap

- mlb-appを新規リポジトリへ複製
- Git履歴の扱いを決定
- MLB固有名を整理
- 環境変数をcoffee-app向けに変更
- 全サービスが起動する状態を維持
- docsとCLAUDE.mdを配置

完了条件:

- frontend / backend / fastapi-serviceが起動する
- 既存認証の動作を確認できる
- MLB固有機能をまだ無理に全削除しない

## Phase 1: Domain Foundation

- CoffeeRecord model
- master models
- seed data
- validation
- repository / serviceの基礎

完了条件:

- backend testでモデル・サービスが確認できる

## Phase 2: Coffee Record API

- 一覧
- 作成
- 詳細
- 編集
- 削除
- 所有者確認
- フィルター・ページネーション

完了条件:

- curlまたはAPIテストでCRUDが通る
- 他ユーザーの記録へアクセスできない

## Phase 3: Record UI

- RecordsPage
- RecordDetailPage
- RecordFormPage
- feature単位のAPI・hooks・components
- loading / empty / error

完了条件:

- ブラウザからCRUDできる
- buildとlintが通る

## Phase 4: Knowledge Graph API

- graph builder
- stable node IDs
- node / edge deduplication
- filters
- related records

完了条件:

- APIテストで期待するnodes/edgesを確認できる

## Phase 5: Knowledge Graph UI

- グラフ描画ライブラリ選定
- GraphPage
- filter
- node detail panel
- record detail navigation
- mobile fallback

完了条件:

- 記録追加後にグラフへ反映される
- ノードから関連記録へ移動できる

## Phase 6: Portfolio Quality

- README
- screenshots
- architecture diagram
- demo data
- accessibility
- responsive
- deployment
- test補強

## Branch Examples

- chore/coffee-app-bootstrap
- feat/coffee-record-domain
- feat/coffee-record-api
- feat/coffee-record-ui
- feat/knowledge-graph-api
- feat/knowledge-graph-ui
- chore/portfolio-polish
