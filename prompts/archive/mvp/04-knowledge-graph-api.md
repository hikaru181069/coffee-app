# Prompt 04: Knowledge Graph API

以下を読んでください。

- @CLAUDE.md
- @docs/knowledge-graph.md
- @docs/domain-model.md
- @docs/database.md
- @docs/api.md
- @docs/architecture.md

## Goal

認証ユーザーのCoffeeRecordから、
knowledge graph用nodes / edgesを生成するAPIを実装すること。

## Architecture Decision

最初にExpress内で実装する案とFastAPIへ置く案を比較し、
MVPで単純な変換のみならExpress内の純粋ロジックを優先してください。

FastAPIへ置く場合は、
サービス間通信を増やす具体的な利点を説明してください。

## Required Responsibilities

- graph route
- graph controller
- graph service
- graph builder（純粋関数）
- node ID helper
- filter parser / validator
- tests

graph builderへHTTPやMongoDBの責務を混ぜないでください。

## Requirements

- stable ID
- node deduplication
- edge deduplication
- recordCount metadata
- nodeTypes filter
- date range
- recordType
- ratingMin
- related records
- 自分の記録のみ

## Tests

- 同一originが1ノードに統合される
- 同一flavorが1ノードに統合される
- recordごとに正しいedgeが生成される
- null項目で不要nodeを作らない
- filterが適用される
- 他ユーザーの記録を含めない
- 空記録で空graphを返す

## Constraints

- graphNodes / graphEdgesをMongoDBへ保存しない
- React描画ライブラリ固有形式へcoreロジックを密結合しない
- 最初から多段探索やグラフDBを導入しない
