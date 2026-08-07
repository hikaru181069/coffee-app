# Prompt 01: Domain and Master Data

以下を読んでください。

- @CLAUDE.md
- @docs/domain-model.md
- @docs/database.md
- @docs/api.md
- @docs/implementation-plan.md

## Goal

CoffeeRecordとマスターデータのDB基盤を、
責務ごとに分割して実装すること。

## Before Coding

既存backendの構造を確認し、次を説明してください。

- models、services、controllers、routesの現状
- repository層を追加すべきか
- 既存User modelと認証への影響
- 新規ファイル一覧
- seed方法
- テスト方針

## Tasks

- CoffeeRecord model
- Origin model
- Variety model
- Process model
- RoastLevel model
- Flavor model
- 入力validator
- master data repository / service
- 初期seed script
- 正規化・重複防止
- 必要なindex
- unit test

## File Responsibility

- models: Mongoose schemaのみ
- validators: リクエスト入力の検証
- repositories: MongoDB問い合わせ
- services: 重複確認、正規化、ユースケース
- seeds: 初期データ投入

1ファイルへ全モデルや全seedロジックを詰め込まないでください。

## Constraints

- User modelを不要に変更しない
- CoffeeRecord CRUD APIはまだ実装しない
- graphコレクションを作らない
- FastAPIからMongoDBへ接続しない

## Completion Criteria

- seedを安全に複数回実行できる
- master dataが重複しない
- schema validation testが通る
- npm testが通る
