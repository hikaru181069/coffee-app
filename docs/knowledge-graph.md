# Knowledge Graph Design

## Purpose

知識グラフは装飾ではなく、
記録同士の共通点と自分の嗜好を探索するためのUIです。

## Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とします。

グラフ用データはAPIレスポンスとして導出します。

## Graph Response

```json
{
  "nodes": [
    {
      "id": "record:abc",
      "type": "record",
      "label": "Ethiopia Natural",
      "metadata": {
        "recordId": "abc",
        "consumedAt": "2026-07-31T00:00:00.000Z",
        "rating": 5
      }
    },
    {
      "id": "origin:xyz",
      "type": "origin",
      "label": "Ethiopia",
      "metadata": {
        "originId": "xyz",
        "recordCount": 3
      }
    }
  ],
  "edges": [
    {
      "id": "record:abc-origin:xyz",
      "source": "record:abc",
      "target": "origin:xyz",
      "type": "ORIGIN"
    }
  ],
  "summary": {
    "recordCount": 10,
    "nodeCount": 24,
    "edgeCount": 37
  }
}
```

## Stable IDs

グラフIDは種別プレフィックスを付けます。

- record:{recordId}
- origin:{originId}
- farm:{normalizedFarmName}
- variety:{varietyId}
- process:{processId}
- roastLevel:{roastLevelId}
- flavor:{flavorId}

異なる種類で同じ値が存在しても衝突しません。

## Graph Generation

1. 認証済みuserIdでCoffeeRecordを取得
2. 必要なマスターデータをpopulateまたは集約
3. CoffeeRecordノードを生成
4. 属性ノードを重複排除して生成
5. recordと属性のedgeを生成
6. recordCountなどのmetadataを集計
7. frontend向け形式で返す

## Filters

MVP:

- nodeTypes
- recordType
- dateFrom
- dateTo
- ratingMin

将来:

- origin
- flavor
- process
- search
- topN
- relation depth

## Interaction

ノード選択時:

- type
- label
- recordCount
- 関連記録
- 詳細画面へのリンク

recordノードの場合:

- 記録日
- rating
- notesの短い抜粋
- Record Detailへのリンク

## Performance Boundary

MVPではユーザー単位の記録件数が少ない前提で都度生成します。

最初から複雑なグラフDB、バックグラウンド同期、
イベント駆動キャッシュは導入しません。
