# Entity Detail Design

## Purpose

知識グラフのノード（産地・農園・品種・精製方法・焙煎度・フレーバー・
カフェ）1件について、統計・関連する他の属性・関連記録をまとめて見せる
専用ページ。

グラフの可視化やGraphのサイドパネル（`NodeDetailPanel.jsx`）は「関係性を
眺めて探索する」ことに向いているが、それだけでは関係性の意味を
ユーザー自身が読み取る必要がある。エンティティ詳細ページは、ある1つの
属性について「知っていること全体」（件数・平均評価・最後に飲んだ日・
よく一緒に登場する他の属性）を一望できる場所にする。

関連する属性のチップ自体を別のエンティティ詳細ページへのLinkにすることで、
産地 → 品種 → フレーバーとエンティティ間を渡り歩けるようにする。これに
より、知識グラフは単なる可視化ではなく、アプリのナビゲーションになる
（プロダクトの差別化ポイント）。

## Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とする。エンティティ詳細専用の
コレクションは持たず、`backend/core/graph/graphBuilder.js`が導出する
グラフから、都度導出する（docs/knowledge-graph.md / docs/search.mdと
同じ考え方）。

## 対応する種別

産地・農園・品種・精製方法・焙煎度・フレーバー・カフェ
（`ATTRIBUTE_NODE_TYPES`、docs/knowledge-graph.mdと同じ一覧）の
どの種別でも同じページ・同じAPIで扱う。種別ごとに個別のページや
ロジックを作らない（`getNodeVisual`でtypeごとの見た目だけを切り替える
既存パターンをそのまま踏襲）。

## 表示する情報

- 記録数（そのノードが付いた記録の件数）
- 平均評価（評価が付いている関連記録の平均。1件も無ければ非表示）
- 最後に飲んだ日（関連記録の中で最も新しいconsumedAt）
- グラフ上の関連（このノードと同じ記録に共起する、他の種別の属性を
  種別ごと・登場回数の多い順に最大5件。属性同士の直接エッジは持たない
  ため、記録を介して間接的に集計する。docs/search.mdの「関連する属性の
  算出」と同じ考え方だが、こちらは1種別だけでなく他のすべての種別を
  同時に集計する）
- 関連記録の一覧（そのノードが付いた記録。最終評価日が新しい順）

## Response Shape

```json
GET /api/graph/nodes/origin%3A507f...

{
  "data": {
    "id": "origin:507f...",
    "type": "origin",
    "label": "Ethiopia",
    "recordCount": 8,
    "avgRating": 4.6,
    "lastConsumedAt": "2026-07-25T00:00:00.000Z",
    "relatedAttributes": {
      "variety": [{ "id": "variety:...", "label": "Heirloom", "count": 5 }],
      "flavor": [{ "id": "flavor:...", "label": "Floral", "count": 6 }],
      "process": [{ "id": "process:...", "label": "Washed", "count": 4 }]
    },
    "records": [
      { "id": "...", "title": "...", "consumedAt": "...", "rating": 5, "notesExcerpt": "..." }
    ]
  }
}
```

`relatedAttributes`は共起する属性が1件も無い種別のキー自体を含めない
（空配列を並べて情報過多にしないため）。文言の生成はバックエンドでは
行わず、フロントエンドがi18nextの補間で行う（docs/insights.md /
docs/search.mdと同じ考え方）。

対象ノードが存在しない・自分の記録から作られたものではない場合は404
（`docs/knowledge-graph.md`の既存の関連記録APIと同じ方針。存在の有無を
他ユーザーへ漏らさない）。

フィルターは持たない。エンティティ詳細ページは「そのノードについて
知っていること全体」を見せる場所であり、画面側の絞り込み状態を
引き継ぐ性質のものではないため（Graph画面の`GET /graph`やGraph画面の
関連記録`GET /graph/nodes/:nodeId/records`とは異なる）。

## 表示

`/entities/:nodeId`（`nodeId`はURLエンコードしたstable ID）。以下から
遷移できる:

- Graph画面のサイドパネル（`NodeDetailPanel.jsx`）の「詳細を見る」
- 横断検索の結果カード（`features/search/components/EntityResultCard.jsx`。
  以前は`/graph?focus=`だったが、エンティティ詳細ページへ変更した）
- エンティティ詳細ページ自身の「グラフ上の関連」チップ（別のエンティティへ）

エンティティ詳細ページ自身には「グラフで見る」ボタンを置き、
`/graph?focus=<nodeId>`（`RecordDetailPage`の「Graphで見る」と同じ
`?focus=`の仕組み）で可視化に戻れるようにする。

## Performance Boundary

docs/knowledge-graph.md・docs/insights.md・docs/search.md同様、MVPでは
ユーザー単位の記録件数が少ない前提で都度計算する。
