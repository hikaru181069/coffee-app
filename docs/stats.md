# Stats Design

## Purpose

Insight（docs/insights.md）が「あなたはエチオピア産かつナチュラル精製の
コーヒーを高く評価する傾向があります」のような**意味づけされた一文**を
返すのに対し、Statsはこれまで記録した全コーヒーの**生の集計値・
ランキング**を見せる専用ページ。

両者は補完関係にある。Insightは「気づき」を短く提示し、Statsは
その気づきの元になった数字そのものをふりかえれるようにする。

## ルールベースであり、AI/自然言語処理ではない

docs/insights.mdと同じ理由で、Statsも構造化データ（産地・品種・
精製方法・フレーバー・評価・記録タイプ・日付）の集計（カウント・
平均・グルーピング）だけで組み立てる。自由記述の`notes`は読まない。

## Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とする。Stats専用の
コレクションは持たず、APIレスポンスとして都度導出する
（docs/database.mdのGraph Persistenceと同じ考え方）。

## 表示する情報

- Overview: 総記録数、平均評価、産地/品種/フレーバーの種類数、
  記録を始めてからの日数
- 月ごとの記録数の推移
- 評価（★1〜5）の分布
- 家とカフェ、それぞれの件数・平均評価
- 産地・品種・精製方法・フレーバー・カフェ、それぞれの上位5件
  ランキング（件数順）

ランキングの各項目はエンティティ詳細ページ（docs/entity-detail.md）と
同じstable ID形式（`{type}:{id}`）を持ち、`/entities/:nodeId`への
Linkにする。知識グラフをナビゲーションにする方針を、Statsのランキング
からも踏襲する。

## Response Shape

```json
GET /api/stats

{
  "data": {
    "overview": {
      "recordCount": 42,
      "originCount": 8,
      "varietyCount": 12,
      "flavorCount": 15,
      "avgRating": 4.2,
      "firstRecordedAt": "2026-01-15T00:00:00.000Z"
    },
    "topOrigins": [{ "id": "origin:507f...", "label": "Ethiopia", "count": 12 }],
    "topVarieties": [{ "id": "variety:...", "label": "Heirloom", "count": 8 }],
    "topProcesses": [{ "id": "process:...", "label": "Natural", "count": 10 }],
    "topFlavors": [{ "id": "flavor:...", "label": "Berry", "count": 9 }],
    "topCafes": [{ "id": "cafe:blue bottle coffee", "label": "Blue Bottle Coffee", "count": 5 }],
    "ratingDistribution": [
      { "rating": 1, "count": 0 },
      { "rating": 5, "count": 15 }
    ],
    "homeVsCafe": {
      "home": { "count": 20, "avgRating": 4.0 },
      "cafe": { "count": 22, "avgRating": 4.4 }
    },
    "monthlyTrend": [{ "month": "2026-01", "count": 5 }]
  }
}
```

各ランキングは上位5件まで（`entityDetail`の関連属性一覧と同じ件数、
情報過多を避けるため）。`ratingDistribution`は該当件数が0でも
★1〜5すべてのスロットを含める（グラフの目盛りを飛ばさないため）。
文言の生成はバックエンドでは行わず、フロントエンドがi18nextで行う
（docs/insights.md / docs/search.mdと同じ考え方）。

## Stats Generation

1. 認証済みuserIdでCoffeeRecordを全件取得（フィルターは持たない。
   「記録全体のふりかえり」を示す機能のため）
2. `core/stats/statsBuilder.js`（純粋関数）が種別ごとに集計・
   ランキング・分布を計算する
3. frontend向け形式で返す

## 表示

新規ページ`/stats`として、ナビゲーション（サイドバー・モバイルの
下部タブ）に独立した項目として追加する。Home画面のGraphPreviewや
InsightBannerとは役割が異なり（Homeは「今日の入口」、Statsは
「ふりかえり」）、Homeへ埋め込まず独立ページにした。

記録が1件も無い場合は、集計値やランキングを空のまま並べず、
次の行動（コーヒーを記録する）を示すメッセージだけを表示する
（docs/design.mdの「空状態には次の行動を示す」）。

## Performance Boundary

docs/knowledge-graph.md・docs/insights.md・docs/search.md同様、MVPでは
ユーザー単位の記録件数が少ない前提で都度計算する。
