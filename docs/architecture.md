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

今はヘルスチェックのみ。将来はDBに依存しない計算を担当する想定。

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
