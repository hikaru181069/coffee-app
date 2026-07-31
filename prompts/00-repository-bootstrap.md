# Prompt 00: Repository Bootstrap

このリポジトリを、既存mlb-appのアーキテクチャを再利用した
coffee-appへ段階的に移行してください。

最初に以下を読んでください。

- @CLAUDE.md
- @docs/vision.md
- @docs/product-principles.md
- @docs/mvp.md
- @docs/architecture.md
- @docs/implementation-plan.md

## Goal

既存の認証、サービス構成、MongoDB接続、開発コマンドを壊さず、
コーヒーアプリ開発を開始できる土台を作ること。

## Required Process

コード変更前に、リポジトリ全体を調査して次を報告してください。

1. 現在のディレクトリ構成
2. frontend / backend / fastapi-serviceの起動点
3. 認証のデータフロー
4. MongoDB接続方法
5. mlb-appからそのまま再利用できる部分
6. MLB固有で置換・削除が必要な部分
7. この作業で変更するファイル一覧
8. 作業用branch名

その後、以下を実施してください。

## Tasks

- coffee-app用のbranchを作成
- package名、README見出し、表示名など明確なプロジェクト名を変更
- `.env.example` を整理
- `CLAUDE.md`、`docs/`、`prompts/` を配置
- 認証コードを維持
- 各サービスの起動確認
- MLB固有機能は、依存関係を確認せず一括削除しない
- 不要機能は一覧化し、削除は別コミットまたは別作業に分ける
- frontend build、backend test、FastAPI testを実行

## Constraints

- 大規模リファクタリングを同時に行わない
- CommonJS/ESM移行を混ぜない
- 新機能を実装しない
- 動作している認証方式を変更しない
- 秘密情報をコミットしない

## Completion Report

- 再利用した構成
- 変更ファイル
- 削除を保留したMLB固有機能
- 実行結果
- 次のPrompt 01へ進める状態か
