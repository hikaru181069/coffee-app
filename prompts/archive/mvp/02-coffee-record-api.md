# Prompt 02: Coffee Record API

以下を読んでください。

- @CLAUDE.md
- @docs/mvp.md
- @docs/domain-model.md
- @docs/database.md
- @docs/api.md
- @docs/architecture.md

## Goal

認証ユーザー専用のCoffeeRecord CRUD APIを実装すること。

## Required Endpoints

- GET /api/coffee-records
- POST /api/coffee-records
- GET /api/coffee-records/:recordId
- PATCH /api/coffee-records/:recordId
- DELETE /api/coffee-records/:recordId
- GET /api/master-data または責務別master endpoints

## Responsibility Split

- routes: path、authenticate、validator、controller接続
- controllers: reqから値を取り、serviceを呼び、responseを返す
- services: 作成、更新、所有者確認、フィルター構築
- repositories: DB query
- models: schema
- validators: body/query/params
- middleware: 共通エラー、認証

controllerへMongoose queryを直接大量に書かないでください。

## Security

- userIdは認証情報から取得
- 他ユーザーのrecordを返さない
- update/delete時に所有者確認
- 不正ObjectIdを500にしない
- passwordやtokenをログ出力しない

## Tests

最低限:

- 未認証は401
- 正常作成は201
- 必須不足は400
- 自分の一覧のみ取得
- 他ユーザーの詳細取得不可
- 他ユーザーの更新・削除不可
- filter / pagination
- 存在しないrecordは404

## Completion Report

curl例またはテスト結果と、
request → route → controller → service → repository → MongoDB
の流れを説明してください。
