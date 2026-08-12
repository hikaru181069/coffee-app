# Features

MVP完成後に追加した個別機能の仕様。もともとは機能ごとに`insights.md` /
`search.md` / `entity-detail.md` / `stats.md` / `discover.md`の5ファイルに
分かれていたが、実務的な粒度に合わせて1ファイルへ統合した（内容は変更して
いない。統合前の経緯は`IMPLEMENTATION.md`のPost-MVPセクション参照）。

## それぞれの機能

- **Insights**: 記録データの傾向を一文で表示する
- **Search**: 記録・産地・フレーバーなどを横断して検索する
- **Entity Detail**: 1つのノードについて、それに関連する統計・記録を見せる
- **Stats**: 全記録の生の集計値・ランキングを見せる
- **Discover**: 外部データ（CQI）を使用し、まだ試していない産地を提案する

---

## Insights

### Purpose

知識グラフは、記録同士の関係性を「見て探索する」ためのUIである
（Knowledge Graph参照）。しかしグラフだけでは、関係性の中にどんな意味が
あるかをユーザー自身が読み取る必要がある。

Insightは、記録データから統計的なパターンをルールベースで検出し、
「あなたはエチオピア産かつナチュラル精製のコーヒーを高く評価する
傾向があります。」のような一文としてアプリ側から意味を提示する機能。

### ルールベースであり、AI/自然言語処理ではない

docs/mvp.mdのOut of Scopeには「AI推薦」「自然言語による味覚分析」が
挙げられている。Insightはこれらとは異なる:

- 自由記述の`notes`を一切読まない。産地・精製方法・フレーバー・評価・
  記録タイプ・日付という**構造化データ**の集計（カウント・平均・
  比較）だけで組み立てる
- 「次に何を選ぶべきか」を推薦するのではなく、「過去の記録からわかる
  事実」を提示するだけ
- 機械学習モデルを使わない。すべて`core/insights/insightBuilder.js`内の
  条件分岐と閾値判定

自由記述からの味覚分析や、次の一杯を推薦する機能は引き続き将来機能
（product-principles.md「MVP Before Intelligence」）。

### Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とする。Insight専用の
コレクションは持たず、APIレスポンスとして都度導出する。

### Insight種別と閾値

| type               | 内容                                     | 閾値                                                                   |
| ------------------ | ---------------------------------------- | ---------------------------------------------------------------------- |
| `topCombination`   | 評価の高い産地×精製方法の組み合わせ      | 2件以上・平均評価4.0以上のうち最高                                     |
| `risingTrend`      | 直近に偏って登場している産地・フレーバー | 直近側（末尾1/3、最低2件）の登場割合が、それ以前より40ポイント以上増加 |
| `homeVsCafeDiff`   | 自宅とカフェでの評価の違い               | 各2件以上あり、平均評価の差が1.0以上                                   |
| `topProcessRating` | 高評価が多い精製方法                     | 2件以上・平均評価4.0以上のうち最高                                     |
| `topFlavor`        | よく選ぶフレーバー                       | 3件以上登場（同率首位は除く）                                          |
| `topOrigin`        | 最も多く飲んでいる産地                   | 3件以上登場（同率首位は除く）                                          |

具体的な計算は `backend/core/insights/insightBuilder.js` を参照。

### 優先度・選択

上記の表の順（説得力があると考えられる順）に条件を満たすものを探し、
満たすもの**すべて**を配列として返す。フロントエンドは配列の先頭
（最も優先度が高いもの）だけを表示する。

### Response Shape

```json
GET /api/insights

{
  "data": {
    "insights": [
      {
        "type": "topCombination",
        "attributes": [
          { "attrType": "origin", "label": "Ethiopia" },
          { "attrType": "process", "label": "Natural" }
        ],
        "avgRating": 4.7,
        "count": 3
      }
    ]
  }
}
```

### 表示

Home画面の「Discover」カード内に、配列の先頭のInsightだけを一文で表示。
`/graph`へのLink。

---

## Search

### Purpose

単なるコーヒー名（記録のtitle）検索だけでなく、産地・農園・品種・
精製方法・焙煎度・フレーバー・カフェを横断して検索できるようにする。
検索結果には件数だけでなく、その属性によく関連する別の属性（例:
産地であれば、よく共起するフレーバー）を添えて表示する。

### Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とする。検索専用の
インデックスやコレクションは持たず、`backend/core/graph/graphBuilder.js`
が導出するグラフからAPIレスポンスとして都度導出する。

### 検索対象

- 属性ノード: origin / farm / variety / process / roastLevel / flavor / cafe
- 記録のtitle

大文字小文字を区別しない部分一致。自分の記録から導出したグラフ・記録
だけを対象にする。

### 関連する属性の算出

属性同士の直接エッジは持たないため、「同じ記録に共起する」ことを
介して間接的に集計する。

- ヒットした属性がflavor以外の場合: 共起するflavorを登場回数順に最大3件
- ヒットした属性がflavorの場合: 共起するoriginを登場回数順に最大3件

具体的な計算は `backend/core/search/searchBuilder.js` を参照。

### Response Shape

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
    "records": [ { "id": "...", "title": "...", "...": "..." } ]
  }
}
```

`q`が未指定・空文字の場合は400エラーにせず空の結果を返す。

### 表示

Records画面の検索ボックス。検索クエリが入力されている間は、通常の
フィルター・一覧・ページ送りを検索結果表示へ丸ごと差し替える。
属性の結果カードは`/entities/<nodeId>`へのLink。

---

## Entity Detail

### Purpose

知識グラフのノード（産地・農園・品種・精製方法・焙煎度・フレーバー・
カフェ）1件について、統計・関連する他の属性・関連記録をまとめて見せる
専用ページ。関連する属性のチップ自体を別のエンティティ詳細ページへの
Linkにすることで、産地 → 品種 → フレーバーとエンティティ間を渡り歩ける
ようにする（知識グラフをアプリのナビゲーションにする、プロダクトの
差別化ポイント）。

### Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とする。`graphBuilder.js`が
導出するグラフから都度導出する。

### 対応する種別

origin/farm/variety/process/roastLevel/flavor/cafeのどの種別でも同じ
ページ・同じAPIで扱う。

### 表示する情報

- 記録数
- 平均評価（1件も無ければ非表示）
- 最後に飲んだ日
- グラフ上の関連（共起する他の種別の属性を種別ごと・登場回数順に最大5件）
- 関連記録の一覧（最終評価日が新しい順）

### Response Shape

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
      "variety": [{ "id": "variety:...", "label": "Heirloom", "count": 5 }]
    },
    "records": [ { "id": "...", "title": "...", "...": "..." } ]
  }
}
```

存在しない・自分の記録から作られたものではないノードは404。
フィルターは持たない。

### 表示

`/entities/:nodeId`。Graph画面のサイドパネル・横断検索の結果カード・
Statsのランキングから遷移できる。「グラフで見る」ボタンで
`/graph?focus=<nodeId>`に戻れる。

---

## Stats

### Purpose

Insightが「意味づけされた一文」を返すのに対し、Statsはこれまで記録した
全コーヒーの**生の集計値・ランキング**を見せる専用ページ。両者は
補完関係にある。

### ルールベースであり、AI/自然言語処理ではない

Insightと同じ理由で、構造化データの集計（カウント・平均・グルーピング）
だけで組み立てる。自由記述の`notes`は読まない。

### Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とする。

### 表示する情報

- Overview: 総記録数、平均評価、産地/品種/フレーバーの種類数、
  記録を始めてからの日数
- 月ごとの記録数の推移
- 評価（★1〜5）の分布（0件でも全スロットを含める）
- 家とカフェ、それぞれの件数・平均評価
- 産地・品種・精製方法・フレーバー・カフェ、それぞれの上位5件ランキング
  （`/entities/:nodeId`へのLink）

### Response Shape

```json
GET /api/stats

{
  "data": {
    "overview": { "recordCount": 42, "avgRating": 4.2, "...": "..." },
    "topOrigins": [{ "id": "origin:507f...", "label": "Ethiopia", "count": 12 }],
    "ratingDistribution": [{ "rating": 1, "count": 0 }],
    "homeVsCafe": { "home": { "count": 20, "avgRating": 4.0 } },
    "monthlyTrend": [{ "month": "2026-01", "count": 5 }]
  }
}
```

### 表示

`/stats`（常設ナビの独立項目）。記録が1件も無い場合は、次の行動
（コーヒーを記録する）を示すメッセージのみ表示する。

---

## Discover

### Purpose

Insightは「自分の記録から読み取れる傾向」を一文で提示するだけで、
「次に何を試すか」という具体的な行動には直結していなかった。

Discoverは、知識グラフの隣接関係（同じ精製方法でつながる産地）を使い、
「あなたはこの産地をよく選んでいるが、同じ精製方法で評価の高い、
まだ試していない産地があります」という提案を、Entity Detailページに
表示する機能。

### Insightとの違い・独立性

|                 | Insight                          | Discover                        |
| --------------- | -------------------------------- | ------------------------------- |
| 問い            | 自分の記録から何が読み取れるか   | 次に何を試すとよいか            |
| Source of Truth | CoffeeRecordとマスターデータのみ | 上記に加え、静的なCQI参照データ |
| 表示場所        | Home画面                         | Entity Detailページ（産地のみ） |

Discoverは`core/insights/`・`core/graph/graphBuilder.js`のどちらにも
一切依存しない、独立したモジュールとして実装している。

### なぜAI推薦ではないか

自分の記録の中で指定した産地に一番多く結びついている精製方法を集計で
求め、静的なCQIデータから同じ精製方法かつ品質スコアの高い産地を条件
（フィルター・ソート）で絞り込むだけ。機械学習・自然言語処理は使わない。

### CQI参照データ

Coffee Quality Institute（CQI）が公開しているコーヒー品質レビューの
傾向を参考にした、静的なJSONファイル（`backend/data/cqiDatabase.json`）。
一度読み込んだら終わりの静的ファイルで、外部APIへライブで問い合わせる
ものではない。使うのは Country of Origin × Processing Method ×
品質スコアの1軸だけ。

### 対象範囲

産地（origin）のみ。CQIデータがCountry of Origin × Processing Methodの
1軸しか持たないため。

### 提案の生成ロジック

1. その産地の記録が2件未満なら提案は出さない
2. その産地で最も多く登場する精製方法を求める。同率首位のときは提案を
   出さない
3. CQIデータから、同じ精製方法かつ「見ている産地自身ではない」「これ
   まで一度も記録していない産地」を、品質スコアの高い順に最大2件抽出

具体的な計算は`backend/core/discover/discoverBuilder.js`を参照。

### Response Shape

```json
GET /api/discover/nodes/origin%3A507f...

{
  "data": {
    "suggestions": [
      {
        "type": "similarProcessOrigin",
        "basedOn": { "originLabel": "Ethiopia", "processLabel": "Natural", "count": 3 },
        "suggestedOrigin": { "label": "Panama", "avgQualityScore": 86.1 }
      }
    ]
  }
}
```

`origin:`以外のプレフィックスは404にせず空配列。`origin:`で自分の記録に
無い産地IDは404。

### Home Teaser・Discoverページ

- `GET /discover`: 自分が記録した産地を横断し、条件を満たす提案の中から
  品質スコアが最も高い1件を返す（`teaser: null`もあり）。Home画面の
  「Discover」カード内に表示
- `GET /discover/all`: 条件を満たす産地すべてを返す。`/discover`専用
  ページ（常設ナビには無い）で使う
