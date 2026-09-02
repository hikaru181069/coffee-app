# API Design

## RESTの使い分け

- GET = 取得
- POST = 新規作成
- PATCH = 一部更新
- DELETE = 削除

## エンドポイントの分類

- `/coffee-records` - 記録のCRUD
- `/master-data` - 産地・品種などの選択肢一覧
- `/graph` - 知識グラフ
- `/insights`、`/discover`、`/similar-records`、`/search`、`/stats`、`/diagnosis` - 個別機能

## ステータスコード

- 200 成功
- 201 作成成功
- 204 削除成功、返す内容が無い
- 400 不正な入力
- 401 未ログイン
- 403 権限がない（現状未使用。所有者確認は「他人の記録は404」として扱う方針
  のため、`backend/utils/AppError.js`の`forbiddenError`はどこからも
  呼ばれていない。将来、記録以外のリソースで403が必要になった場合のために
  残している）
- 404 存在しない
- 409 一意制約違反（例: メールアドレスの重複登録）

## エラーレスポンスの形式

`backend/middleware/errorHandler.js`が、想定したエラー（`AppError`）・
Mongooseのバリデーションエラー・ObjectIdのキャスト失敗・一意制約違反・
想定外のエラーのすべてを、以下の形式へ統一して返す。

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "入力内容を確認してください", "details": [] } }
```

`code`はエラー種別を表す固定文字列（`VALIDATION_ERROR` / `NOT_FOUND` /
`CONFLICT` / `INTERNAL_ERROR`等）、`details`は項目ごとの理由が必要な場合
（バリデーションエラー等）にのみ配列として入る。
