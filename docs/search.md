# Search Design

## Purpose

単なるコーヒー名（記録のtitle）検索だけでなく、産地・農園・品種・
精製方法・焙煎度・フレーバー・カフェを横断して検索できるようにする。

検索結果には件数だけでなく、その属性によく関連する別の属性（例:
産地であれば、よく共起するフレーバー）を添えて表示する。単なる
文字列検索ではなく、知識ベースとしての性質を検索という日常的な
入口からも感じさせるための機能（docs/vision.mdのRecord → Connect →
Discover）。

## Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とする。検索専用の
インデックスやコレクションは持たず、`backend/core/graph/graphBuilder.js`
が導出するグラフ（docs/knowledge-graph.md）からAPIレスポンスとして
都度導出する。検索専用のロジックを新しく作らず、既存のグラフ生成を
再利用することで、グラフと検索で「何が属性として存在するか」の
理解が1つで済む。

## 検索対象

- 属性ノード: origin / farm / variety / process / roastLevel / flavor / cafe
  （`ATTRIBUTE_NODE_TYPES`、`docs/knowledge-graph.md`と同じ一覧）
- 記録のtitle（コーヒー名そのもの）

いずれも大文字小文字を区別しない部分一致。自分の記録から導出した
グラフ・記録だけを対象にするため、他ユーザーの記録や、自分が一度も
記録したことのないマスターデータ（例: 一度も選んだことのない産地）は
結果に含まれない（docs/product-principles.md「Personal Knowledge Over
Global Completeness」）。

## 関連する属性の算出

属性同士の直接エッジは持たない（docs/knowledge-graph.md）ため、
「同じ記録に共起する」ことを介して間接的に集計する。

- ヒットした属性がflavor以外（origin/farm/variety/process/roastLevel/
  cafe）の場合: その属性が付いた記録に共起するflavorを、登場回数の
  多い順に最大3件
- ヒットした属性がflavorの場合: そのflavorが付いた記録に共起する
  originを、登場回数の多い順に最大3件

具体的な計算は `backend/core/search/searchBuilder.js` を参照。

## Response Shape

```json
GET /api/search?q=ethiopia

{
  "data": {
    "entities": [
      {
        "id": "origin:507f...",
        "type": "origin",
        "label": "Ethiopia",
        "recordCount": 8,
        "relatedType": "flavor",
        "relatedLabels": ["Berry", "Floral"]
      }
    ],
    "records": [
      { "id": "...", "title": "Ethiopia Guji Natural", "consumedAt": "...", "rating": 5, "...": "..." }
    ]
  }
}
```

`entities`はグラフノードの部分集合＋集計情報、`records`は
`services/coffee/coffeeRecordSerializer.js`と同じ形の記録そのもの
（既存の`RecordCard.jsx`をそのまま再利用して表示するため）。

文言の生成（日本語・英語どちらの一文にするか）はバックエンドでは
行わない。フロントエンドがi18nextの補間で行う（docs/insights.mdの
Insightと同じ考え方。同じレスポンスを両言語で使い回すため）。

## クエリが空のとき

`q`が未指定・空文字の場合は400エラーにせず、`{ entities: [], records: [] }`
を返す。検索ボックスが空のときにフロントエンドが結果表示を出し分ける
だけで済むようにするため。

## 表示

Records画面の一覧・フィルターの上に検索ボックスを置く
（`features/search/components/SearchBox.jsx`）。検索クエリが入力されて
いる間は、通常のフィルター・一覧・ページ送りを検索結果表示
（`SearchResults.jsx`）へ丸ごと差し替える。検索結果と通常の絞り込み
結果は見た目・意味が異なるため、同じ一覧に混ぜて出すと状態が
わかりにくくなると判断した。

属性の結果カード（`EntityResultCard.jsx`）は`/graph?focus=<nodeId>`への
Linkにしている。docs/product-principles.md「Discovery Must Be
Actionable」に従い、検索結果を提示するだけで終わらせず、グラフでの
探索へつなげるため（`?focus=`はRecordDetailPageの「Graphで見る」で
既に使われている仕組みをそのまま利用する）。記録タイトルの一致は
`/records/:id`への通常の記録カード。

## Performance Boundary

docs/knowledge-graph.md・docs/insights.md同様、MVPではユーザー単位の
記録件数が少ない前提で都度計算する。フロントエンドは入力のたびに
APIを叩かないよう300msのデバウンスを行う。
