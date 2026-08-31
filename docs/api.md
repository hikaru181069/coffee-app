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
- `/insights`、`/discover`、`/origin-quality`、`/search`、`/stats`、`/diagnosis` - 個別機能

## ステータスコード

- 200 成功
- 201 作成成功
- 204 削除成功、返す内容が無い
- 400 不正な入力
- 401 未ログイン
- 403 権限がない
- 404 存在しない
