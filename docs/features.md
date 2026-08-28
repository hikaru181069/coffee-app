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
- **Coffee Diagnosis**: 記録から「コーヒータイプ」を判定し、Insight・Statsの要約とあわせて1画面で見せる
- **World Map**: 自分が記録した産地を世界地図上でハイライトする

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

### Graphとの境界

知識グラフ（Knowledge Graph参照）は、notesから固定辞書でキーワードを
抽出しノード化する（keywordノード）。これはInsightの「notesを読まない」
方針と矛盾しない: Graphのキーワード抽出は部分文字列一致による
ノード生成であり、Insightのような「意味づけされた一文」の生成・
統計的傾向の提示は行わない。両者は別の目的（Graphは探索、Insightは
意味の提示）を持つため、notesの扱いが異なっていてよい
（docs/product.md「MVP Before Intelligence」参照）。

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

「記録したコーヒーから、自分の飲み方や味覚傾向を振り返る」というテーマの
もと、情報をフラットに並べるのではなく3つの問いに分けて構成している。

1. **記録のペース** — どれだけ・どんな頻度で記録しているか
2. **Collection** — 何種類の産地・品種・精製方法・農園・カフェ・
   フレーバーを試したか
3. **味の傾向** — 評価はどう分布し、何を繰り返し選んでいるか

### ルールベースであり、AI/自然言語処理ではない

Insightと同じ理由で、構造化データの集計（カウント・平均・グルーピング）
だけで組み立てる。自由記述の`notes`は読まない（知識グラフのkeywordノード
とは別の関心事であり、Statsの集計対象を広げる予定はない）。

### Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とする。

### 表示する情報

**記録のペース**

- 総記録数、平均評価、記録を始めてからの日数
- 月ごとの記録数の推移

**Collection**（試した種類数）

- 産地・品種・精製方法・農園・カフェ・フレーバー、それぞれの種類数
- 農園（farm）とカフェ（cafeName）はマスターデータを持たない自由記述
  項目のため（`docs/domain-model.md`「Farm / Cafe」参照）、表記ゆれは
  正規化した名前（全角スペース・大小文字・前後の空白のみを吸収する
  軽い正規化）で重複排除する。ハイフン等のあいまい一致までは行わない
- 見出し「Collection」は、`DiscoverPage.jsx`の"Discover"と同じ言語
  非依存のブランド語として扱い、日英どちらの表示でも翻訳しない

**味の傾向**

- 評価（★1〜5）の分布（0件でも全スロットを含める）
- 産地・品種・精製方法・フレーバー・カフェ、それぞれの上位5件ランキング
  （`/entities/:nodeId`へのLink）

**家とカフェの比較**（`homeVsCafe`）は、APIレスポンスには残しているが
現在は画面に表示していない。3段構成へ再設計した際に一旦外した項目で、
将来の再導入候補（`IMPLEMENTATION.md`参照）。

### Response Shape

```json
GET /api/stats

{
  "data": {
    "overview": { "recordCount": 42, "avgRating": 4.2, "firstRecordedAt": "..." },
    "collection": {
      "originCount": 7, "varietyCount": 7, "processCount": 3,
      "farmCount": 1, "cafeCount": 4, "flavorCount": 13
    },
    "topOrigins": [{ "id": "origin:507f...", "label": "Ethiopia", "count": 12 }],
    "ratingDistribution": [{ "rating": 1, "count": 0 }],
    "homeVsCafe": { "home": { "count": 20, "avgRating": 4.0 } },
    "monthlyTrend": [{ "month": "2026-01", "count": 5 }]
  }
}
```

種類数（`originCount`等）は`overview`ではなく独立した`collection`に
入れている。「記録の頻度」と「試した種類の多さ」は別の問いのため、
APIのレスポンス形状も画面の3段構成にあわせて分けている。

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

### Home Teaser

`GET /discover`は、自分が記録した産地を横断し、条件を満たす提案の中から
品質スコアが最も高い1件を返す（`teaser: null`もあり）。Home画面の
「Discover」カード内に表示し、クリックすると提案の根拠になった産地の
Entity Detailページ（`/entities/:nodeId`）へ遷移する。そこには
「対象範囲」節の`GET /discover/nodes/:nodeId`による提案が埋め込み
表示されている。

2026-08、条件を満たす産地すべてを一覧表示する専用ページ（`/discover`、
`GET /discover/all`）を一時期実装していたが、実データで検証したところ
比較対象になる産地グループはよく作り込んだデモデータでも2件程度にしか
ならず、「複数産地を横断して比較する」という専用ページ固有の価値が
ほとんど発揮されないと判断し削除した。Home Teaser・Entity Detail埋め込みの
2箇所でDiscover機能としては十分と判断した（IMPLEMENTATION.md参照）。

---

## Coffee Diagnosis

### Purpose

Insight・Stats・Discoverはいずれも「記録データから何が読み取れるか」を
別々の画面（Home画面の一文、Statsページの集計、Entity Detailの提案）に
分けて見せる機能だった。Coffee Diagnosisは、新しい発見ロジックを増やす
のではなく、既存のInsight（全種別）とStatsの要約を「コーヒータイプ」の
判定とあわせて1画面に束ねる機能。

「コーヒータイプ」は、他社のコーヒーアプリにあるような初回クイズ形式の
診断ではなく、記録が増えるほど内容が更新される、記録から導出した診断に
している（プロダクトの中心体験 Record → Connect → Discover、
docs/product.md参照。初回に好みを申告させるクイズは、記録することで
初めて気づきが生まれるという中心体験と逆行するため採用しなかった）。

### ルールベースであり、AI/自然言語処理ではない

Insight・Statsと同じ理由で、notesなどの自由記述は一切読まない。
`roastLevel.order`（浅煎り〜深煎りの5段階の順序）と`flavors[].category`
（フレーバーの大分類。docs/domain-model.md参照）という、これまでの
Insight/Stats/Discoverのどこからも使われていなかった構造化データを、
条件分岐と閾値判定だけで組み合わせる。機械学習・自然言語処理は使わない
（docs/product.md「MVP Before Intelligence」）。

### 判定ルール

焙煎度をlight（浅煎り・浅煎り寄り）/medium（中煎り）/dark（深煎り・
深煎り寄り）の3段階にバケット分けし、最も多く登場するバケットを求める
（該当する記録が3件未満、または同率首位のときは判定しない。
insightBuilder.jsの「同率首位のときは断定しない」方針を踏襲）。

フレーバーのcategoryも同様に集計するが、こちらは3件未満・同率首位でも
診断全体を諦めず、「categoryは問わない」として焙煎度だけの一般則へ
フォールバックする（categoryは焙煎度ほど判定の根拠として強くないと
判断したため）。

| 焙煎度バケット | フレーバーcategory | タイプ |
| --- | --- | --- |
| light | fruity | lightFruity |
| light | floral | lightFloral |
| dark | nutty | darkNutty |
| dark | sweet | darkSweet |
| medium | spicy | mediumSpicy |
| light | （問わない） | light |
| dark | （問わない） | dark |
| medium | （問わない） | medium |

具体的な計算は`backend/core/diagnosis/diagnosisBuilder.js`を参照。

### Source of Truth

MongoDBのCoffeeRecordとマスターデータ（RoastLevel・Flavor）を正とする。
Diagnosis専用のコレクションは持たず、APIレスポンスとして都度導出する。
Insight・Statsの計算結果もそれぞれの既存service
（`insightService.js`・`statsService.js`）をそのまま呼び出して束ねるだけで、
別ロジックを新たに作らない（`backend/services/coffee/diagnosisService.js`）。

### Response Shape

```json
GET /api/diagnosis

{
  "data": {
    "archetype": { "type": "lightFruity", "sampleSize": 8 },
    "insights": [ /* GET /api/insights と同じ形の配列（全件） */ ],
    "stats": { /* GET /api/stats と同じ形 */ }
  }
}
```

判定に足る記録が無ければ`archetype: null`。`insights`は空配列、`stats`は
記録0件時の形になり得る。

### 表示

`/diagnosis`。Home画面のDiscoverカード・Statsページからのリンクで到達する。
主ナビ（Home/Records/Graph/Stats）には追加しない（docs/design.md
「Main Navigation」参照。ナビ項目を増やさない既存方針を踏襲）。

---

## World Map

### Purpose

「コーヒーは産地によってキャラクターが変わる」という考えから、産地に
フォーカスした機能群の第一歩として追加した（2026-08）。自分が記録した
産地を世界地図上でハイライトするだけの、単一の目的に絞った機能。
Discover（CQIデータでの産地提案）やGraph（知識グラフとしての探索）とは
役割を分け、重複させない。

docs/mvp.mdでは「世界地図」はMVP当時のOut of Scopeだったが、MVP完了後の
Post-MVP機能としてDiagnosis・Discover等と同じ扱いで追加した
（docs/mvp.md冒頭の追記参照）。

### Source of Truth

MongoDBのCoffeeRecordとOriginマスターを正とする。World Map専用のAPIは
持たず、既存の`GET /api/graph?nodeTypes=origin`をそのまま使う
（docs/knowledge-graph.mdの「グラフは都度計算する」方針と同じで、
世界地図専用のデータも持たない）。

Originマスターの`countryCode`（ISO 3166-1 alpha-2。`backend/models/
Origin.js`）を、地図データ（`world-atlas`のtopojson、ISO 3166-1
numericでcountryを識別する）と突き合わせるための対応表
（`frontend/src/features/map/utils/countryCodes.js`）を持つ。
`countryCode`が無い産地や対応表に無い産地は、地図上でハイライトされない
だけでエラーにはならない。

### 国境データについて

他のグラフ・図（TasteRadarChart、RecordConnectionsDiagram、
GraphIllustration）は自前のSVGで描画しているが、国境の形状データだけは
自作が現実的ではないため例外的に`world-atlas`（Natural Earthベースの
topojson、50m解像度）を使う。React本体には依存しない`d3-geo`・
`topojson-client`で投影・パス生成を行い、Reactコンポーネント自体は
自前で書く（react-simple-mapsを検討したがReact 19のpeer dependency
に対応しておらず導入できなかったため）。投影法はNatural Earth
（`geoNaturalEarth1`、d3-geo本体に標準搭載）を使う。

### 表示

`/map`。Statsページの「Collection」セクションからのリンクで到達する。
Diagnosisと同じ理由で主ナビには追加しない（docs/design.md「Main
Navigation」参照）。訪問済みの産地だけクリック・キーボード操作可能で、
そのエンティティ詳細ページ（`/entities/origin:xxx`）へ遷移する。

地図本体に加え、(1)訪れた産地数のサマリー（例:「7 / 20」。分母は
マスターデータの産地総数）と(2)訪れた産地の一覧（記録数順、
エンティティ詳細ページへのLink付きチップ）を表示する（2026-08、
「地図しか無く寂しい」という指摘を受けて追加）。分母（産地総数）の
取得はフォームの選択肢取得と同じ`useMasterData`を再利用しており、
取得に失敗・読み込み中でも地図本体の表示はブロックせず、サマリーの
分母だけを省く（`useMasterData.js`の「失敗しても致命的ではない」
方針を踏襲）。産地の提案（Discover）とは役割が重複しないよう、ここでは
記録済みデータの集計のみを表示する。
