# Domain Model

## Main Entity: CoffeeRecord

CoffeeRecordは、ユーザーが1回のコーヒー体験を記録したものです。

### Required

- userId
- title
- consumedAt
- recordType

### Optional

- rating
- notes
- cafeName
- roasterName
- originId
- farmName
- varietyIds
- processId
- roastLevelId
- flavorIds

## Record Type

- home
- cafe

recordTypeによって表示項目を変えても、
バックエンドのCoffeeRecordという同じモデルで管理します。

## Master Entities

### Origin

例:

- Ethiopia
- Kenya
- Colombia
- Guatemala

将来はcountry、region、coordinatesなどを追加可能です。

### Variety

例:

- Typica
- Bourbon
- Geisha
- SL28

### Process

例:

- Washed
- Natural
- Honey
- Anaerobic

### RoastLevel

例:

- light
- medium-light
- medium
- medium-dark
- dark

### Flavor

例:

- citrus
- berry
- chocolate
- caramel
- floral
- nutty

## Farm

MVPではfarmを独立マスターにするほどデータ品質を担保しにくいため、
CoffeeRecord上のfarmNameとして扱います。

将来、同一農園の記録が増えた時点でFarmコレクションへ移行できます。

## Cafe

farmと同じ理由で、cafeも独立マスターにせず
CoffeeRecord上のcafeNameとして扱います。

「Record Type」の`cafe`（家で飲んだか、外のカフェで飲んだかの区分）とは
別の概念です。cafeNameは「どの店で飲んだか」という具体的な店名で、
knowledge graphでは店名ごとに1つのノードとして表れます
（同じ店名の記録が複数あれば1ノードに統合されます。farmNameと同じ
正規化ルール）。

## Knowledge Graph Terms

### Node

グラフに表示する1つの概念。

node types:

- record
- origin
- farm
- variety
- process
- roastLevel
- flavor
- cafe

### Edge

2つのノードの関係。

MVPではCoffeeRecordを中心とする関係を生成します。

- record → ORIGIN → origin
- record → FARM → farm
- record → VARIETY → variety
- record → PROCESS → process
- record → ROAST_LEVEL → roastLevel
- record → FLAVOR → flavor
- record → CAFE → cafe

属性同士の直接エッジはMVPでは保存しません。
同じ記録に共起することで間接的に関連を発見できます。
