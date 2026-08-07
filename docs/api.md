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

## Discover

### GET `/discover`

Home画面用の導線。自分が記録した産地を横断し、条件を満たす提案の中から
品質スコアが最も高い1件を返す（無ければ`teaser: null`）。queryは持たない。

responseは@docs/discover.mdの「Home Teaser」を参照。

```json
{
  "data": {
    "teaser": null
  }
}
```

### GET `/discover/all`

`/discover`専用ページ（`/discover`、常設ナビには無い）用。自分が記録した
産地のうち、条件を満たすものすべてを、各産地の最良の提案のスコア順に
返す。queryは持たない。

responseは@docs/discover.mdの「Discoverページ」を参照。

```json
{
  "data": {
    "origins": []
  }
}
```

### GET `/discover/nodes/:nodeId`

指定した産地ノードについて、まだ試していない産地の提案を返す。
`docs/discover.md`参照。Insightとは完全に独立した機能・エンドポイント。

nodeIdは`origin:507f...`のようなstable ID。`origin:`以外のプレフィックス
（対応していない種別）は404にせず空配列を返す。`origin:`のIDで自分の
記録に無い産地IDを渡した場合は404。

responseは@docs/discover.mdを参照。

```json
{
  "data": {
    "suggestions": []
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

## Stats

### GET `/stats`

自分の記録全体からの集計（Overview・月別推移・評価分布・家/カフェ比較・
産地/品種/精製方法/フレーバー/カフェの上位ランキング）を返す。queryは
持たない（フィルターではなく「記録全体のふりかえり」を示すため）。

responseは@docs/stats.mdを参照。

```json
{
  "data": {
    "overview": {},
    "topOrigins": [],
    "topVarieties": [],
    "topProcesses": [],
    "topFlavors": [],
    "topCafes": [],
    "ratingDistribution": [],
    "homeVsCafe": {},
    "monthlyTrend": []
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
