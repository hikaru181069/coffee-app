# MongoDB Design

## Principle

MVPでは、更新頻度と再利用性を基準に、
参照データは別コレクション、体験固有データはCoffeeRecordへ保存します。

## Collections

### users

既存mlb-appの認証モデルを再利用します。

主なフィールド:

- _id
- name
- email
- passwordHash
- createdAt
- updatedAt

既存フィールド名と認証コードに合わせ、不要な互換性破壊を避けてください。

### coffeeRecords

```js
{
  _id: ObjectId,
  userId: ObjectId,
  title: String,
  consumedAt: Date,
  recordType: "home" | "cafe",
  rating: Number | null,
  notes: String,
  cafeName: String,
  roasterName: String,
  originId: ObjectId | null,
  farmName: String,
  varietyIds: ObjectId[],
  processId: ObjectId | null,
  roastLevelId: ObjectId | null,
  flavorIds: ObjectId[],
  createdAt: Date,
  updatedAt: Date
}
```

制約:

- title: trim、最大長を設定
- consumedAt: 必須
- recordType: enum
- rating: 1〜5
- flavors、varietiesは重複を除去
- userIdは認証済みユーザーから設定
- 更新・削除時に所有者を必ず確認

推奨インデックス:

- `{ userId: 1, consumedAt: -1 }`
- `{ userId: 1, originId: 1 }`
- `{ userId: 1, flavorIds: 1 }`

### origins

```js
{
  _id: ObjectId,
  name: String,
  normalizedName: String,
  countryCode: String | null,
  createdAt: Date,
  updatedAt: Date
}
```

### varieties

```js
{
  _id: ObjectId,
  name: String,
  normalizedName: String,
  createdAt: Date,
  updatedAt: Date
}
```

### processes

```js
{
  _id: ObjectId,
  name: String,
  normalizedName: String,
  createdAt: Date,
  updatedAt: Date
}
```

### roastLevels

```js
{
  _id: ObjectId,
  name: String,
  key: String,
  order: Number
}
```

### flavors

```js
{
  _id: ObjectId,
  name: String,
  normalizedName: String,
  category: String | null,
  createdAt: Date,
  updatedAt: Date
}
```

## Why References

origin、variety、process、roastLevel、flavorを参照にする理由:

- 表記揺れを防ぐ
- グラフノードを統合できる
- 検索・集計しやすい
- 将来メタデータを追加しやすい

## Graph Persistence

MVPではgraphNodes、graphEdgesコレクションを作りません。

CoffeeRecordとマスターデータから、要求時にグラフを導出します。

理由:

- 二重管理を避ける
- 記録更新時の同期問題を避ける
- MVPのデータ量なら都度生成で十分
- MongoDBをグラフDBのように無理に扱わない

データ量が増え、生成コストが問題になった場合に、
キャッシュまたは専用グラフDBを検討します。
