# API Design

Base path: `/api`

## Authentication

既存mlb-appのAPIを確認して互換的に再利用します。

想定:

- POST `/auth/register`
- POST `/auth/login`
- GET `/auth/me`

## Coffee Records

### GET `/coffee-records`

自分の記録一覧。

query:

- page
- limit
- recordType
- originId
- flavorId
- ratingMin
- dateFrom
- dateTo
- sort

response:

```json
{
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

### POST `/coffee-records`

記録作成。

userIdはbodyで受け取らず、認証情報から設定します。

### GET `/coffee-records/:recordId`

自分の記録詳細。

### PATCH `/coffee-records/:recordId`

自分の記録を部分更新。

### DELETE `/coffee-records/:recordId`

自分の記録を削除。

## Master Data

読み取り:

- GET `/master-data/origins`
- GET `/master-data/varieties`
- GET `/master-data/processes`
- GET `/master-data/roast-levels`
- GET `/master-data/flavors`

共通query:

- search
- limit

MVPでは一般ユーザー向けのマスター作成・更新APIは公開しません。

### GET `/master-data`

フォーム初期表示用にまとめて取得する選択肢も許容します。

```json
{
  "data": {
    "origins": [],
    "varieties": [],
    "processes": [],
    "roastLevels": [],
    "flavors": []
  }
}
```

## Graph

### GET `/graph`

自分の記録からグラフを生成。

query:

- nodeTypes
- recordType
- dateFrom
- dateTo
- ratingMin

responseは@docs/knowledge-graph.mdを参照。

### GET `/graph/nodes/:nodeId/records`

選択ノードに関連する記録一覧。

nodeIdにはURLエンコードされたstable IDを使用するか、
typeとentityIdを別queryにする方式を実装時に選択します。

### GET `/graph/nodes/:nodeId`

エンティティ詳細ページ用。統計（記録数・平均評価・最終記録日）・
関連する他の属性（種別ごとのランキング）・関連記録をまとめて返す。
queryは持たない。

responseは@docs/entity-detail.mdを参照。

## Insights

### GET `/insights`

自分の記録からルールベースで検出したInsight（傾向）の一覧を、
優先度順（説得力があると考えられる順）に返す。queryは持たない
（フィルターではなく「記録全体からの傾向」を示すため）。

responseは@docs/insights.mdを参照。

```json
{
  "data": {
    "insights": []
  }
}
```

## Search

### GET `/search`

自分の記録・属性を横断して検索する。

query:

- q（検索語。未指定・空文字なら空の結果を返す。400にはしない）

responseは@docs/search.mdを参照。

```json
{
  "data": {
    "entities": [],
    "records": []
  }
}
```

## Status Codes

- 200: 取得・更新成功
- 201: 作成成功
- 204: 削除成功
- 400: 不正入力
- 401: 未認証
- 403: 所有権なし
- 404: 対象なし
- 409: 重複等
- 500: 予期しないエラー
