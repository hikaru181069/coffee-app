# Discover Design

## Purpose

`docs/vision.md`のCore Experience（Record → Connect → Discover）のうち、
これまでDiscoverを担っていたのは主にInsight（`docs/insights.md`）だった。
Insightは「自分の記録から読み取れる傾向」を一文で提示するだけで、
「次に何を試すか」という具体的な行動には直結していなかった。

Discoverは、知識グラフの隣接関係（同じ精製方法でつながる産地）を使い、
「あなたはこの産地をよく選んでいるが、同じ精製方法で評価の高い、
まだ試していない産地があります」という提案を、Entity Detailページ
（`docs/entity-detail.md`）に表示する機能。

## Insightとの違い・独立性

Insight（`docs/insights.md`）とDiscoverは、目的の異なる別機能として
明確に分離している。

| | Insight | Discover |
| --- | --- | --- |
| 問い | 自分の記録から何が読み取れるか | 次に何を試すとよいか |
| Source of Truth | MongoDBのCoffeeRecordとマスターデータのみ | 上記に加え、静的なCQI参照データ |
| 表示場所 | Home画面（InsightBanner） | Entity Detailページ（産地のみ） |
| コード | `core/insights/`, `services/coffee/insightService.js` | `core/discover/`, `services/coffee/discoverService.js` |

`docs/insights.md`は「Source of Truth: MongoDBのCoffeeRecordとマスター
データを正とする」と明記している。Discoverは外部の参照データ（CQI）を
使うため、これをInsightの既存6種別・`PRIORITY`配列・`InsightBanner.jsx`
に混ぜると、この記述と矛盾する。そのためDiscoverは`core/insights/`・
`core/graph/graphBuilder.js`（知識グラフ生成ロジック）のどちらにも一切
依存しない、独立したモジュールとして実装している。

## なぜAI推薦ではないか

`docs/mvp.md`のOut of Scopeにある「AI推薦」とは異なる。Discoverが行うのは:

- 自分の記録の中で、指定した産地に一番多く結びついている精製方法を
  集計で求める（機械学習・自然言語処理は使わない）
- 静的なCQIデータから、同じ精製方法かつ品質スコアの高い産地を
  条件（フィルター・ソート）で絞り込む

`core/discover/discoverBuilder.js`は`core/insights/insightBuilder.js`と
同様、条件分岐と閾値判定だけで構成される純粋関数。

## CQI参照データ

Coffee Quality Institute（CQI）が公開しているコーヒー品質レビューの
傾向を参考にした、静的なJSONファイル（`backend/data/cqiDatabase.json`）。

- **一度読み込んだら終わりの静的ファイル**であり、外部APIへライブで
  問い合わせるものではない。`discoverService.js`が初回アクセス時に
  一度だけファイルを読み込み、モジュールスコープの変数へキャッシュする
  （リクエストのたびにファイルI/Oや外部通信は発生しない）
- 使うのは **Country of Origin × Processing Method × 品質スコアの集計**
  という1軸だけ（`{ originName, processName, avgQualityScore,
  sampleSize }`の配列）。産地の地域・農園・標高など、アプリ側に対応する
  概念が無い項目までは取り込まない（`docs/product-principles.md`
  「Personal Knowledge Over Global Completeness」）
- `originName` / `processName` は、`backend/seeds/data/origins.js` /
  `processes.js` の `name` と完全に一致する値だけを使う。表記揺れの
  正規化レイヤーを別途作らずに済ませるための、MVPでの意図的な単純化
- `avgQualityScore` はCQIのTotal Cup Points相当の目安値。この開発環境には
  外部データセットを取得するネットワークアクセスが無いため、公開されている
  CQIデータの傾向を参考にした概算値であり、実際のCQIデータベースの
  正確な値を再現したものではない（`cqiDatabase.json`内のコメントに明記）

## 対象範囲

**産地（origin）のみ**。CQIデータがCountry of Origin × Processing Method
の1軸しか持たないため、農園・品種・精製方法・焙煎度・フレーバー・カフェの
ノードでは提案を出さない（`docs/entity-detail.md`の7種別すべてに対応する
Entity Detail自体とは異なり、Discoverはorigin専用）。

## 提案の生成ロジック

1. Entity Detailページで見ている産地について、自分の記録を絞り込む
2. その産地の記録が2件未満なら、「よく選んでいる」と言うには材料が
   不十分なため、提案は出さない
3. その産地の記録の中で最も多く登場する精製方法を求める。同率首位の
   ときは1つに決められないため、提案は出さない（`insightBuilder.js`と
   同じ「断定しない」方針）
4. CQIデータから、同じ精製方法かつ次の条件を満たす産地を、品質スコアの
   高い順に最大2件抽出する:
   - 見ている産地自身ではない
   - 精製方法を問わず、これまでに一度も記録していない産地である
     （別の精製方法で試した産地は「未経験」ではないため除外）

具体的な計算は`backend/core/discover/discoverBuilder.js`を参照
（閾値は`THRESHOLDS`定数にまとめてある）。

## Response Shape

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

`origin:`以外のプレフィックスを持つnodeId（`process:`など）は、対応
していない種別というだけで「存在しない」わけではないため、404では
なく空配列を返す。`origin:`のIDで、自分の記録に無い産地IDを渡した
場合は404にする（`docs/entity-detail.md`の404方針と同じ。存在の有無を
他ユーザーへ漏らさない）。

文言の生成はバックエンドでは行わず、フロントエンドがi18nextの補間で
行う（`docs/insights.md` / `docs/search.md`と同じ考え方）。

## 表示

Entity Detailページ（`/entities/:nodeId`）で、対象ノードの`type`が
`origin`のときだけ、「グラフで見る」ボタンの下・関連属性セクションの
上に表示する（`features/discover/components/DiscoverSuggestions.jsx`）。
条件を満たす提案が1つも無い・読み込み中・エラー時は何も表示しない
（`InsightBanner.jsx` / `GraphPreview.jsx`と同じ「静かな道具」の方針）。

各提案には`/records/new`への導線を付ける
（`docs/product-principles.md`「Discovery Must Be Actionable」）。
提案された産地はまだ自分の知識グラフにノードが存在しないため
（記録したことが無い産地のため）、Graph画面やEntity Detailへの
深いリンクは作れない。「次に記録する」ことが最も自然なアクションのため、
記録フォームへのリンクにしている（フォームへの産地の事前入力は
今回のスコープには含めない。次に実装すべき単位として`IMPLEMENTATION.md`
に記載する）。

## Home Teaser

Discoverの中身（提案）はEntity Detailページでしか見せないため、
ユーザーが自力でその産地のEntity Detailページへたどり着かない限り、
Discover機能の存在自体に気づけない、という導線の欠落があった
（ユーザーからの指摘を受けて追加）。

これを解消するため、`GET /discover`（nodeIdを取らないルート）を追加した。
自分が記録した産地をすべて横断して`buildOriginDiscovery`を呼び、
条件を満たす提案の中から品質スコアが最も高い1件を選ぶ純粋関数
（`core/discover/discoverBuilder.js`の`buildDiscoverTeaser`）。
候補が1つも無ければ`teaser: null`を返す。

```json
GET /api/discover

{
  "data": {
    "teaser": {
      "nodeId": "origin:507f...",
      "type": "similarProcessOrigin",
      "basedOn": { "originLabel": "Ethiopia", "processLabel": "Natural", "count": 3 },
      "suggestedOrigin": { "label": "Panama", "avgQualityScore": 86.1 }
    }
  }
}
```

2026-08、最初はHome画面下部に、`InsightBanner.jsx` / `GraphPreview.jsx`とは
別の1行だけの控えめなテキストリンクとして表示していた
（`DiscoverTeaserLink.jsx`）。しかしHomeの一番下という位置と目立たない
見た目のため「導線があっても気づかれない」という指摘を受け、さらに
「Record→Connect→Discoverというプロダクトの方向性をHome画面でも明確に
したい」という要望から、Insightの一文とこの導線を1枚の「Discover」
カード（`features/discover/components/DiscoverCard.jsx`）へ統合した。
`DiscoverTeaserLink.jsx`・`InsightBanner.jsx`はどちらも廃止し、
役目をこのカードへ引き継いでいる。

見出し「Discover」は、LandingPageの「Record / Connect / Discover」と
同じ言語非依存のブランド語として扱い、翻訳しない。認証後の画面に一度も
出てこなかった"Discover"という単語を、ここで初めて可視化する狙いもある。

統合したのはHome画面での見せ方だけで、`GET /discover`・`GET /discover/
nodes/:nodeId`・`core/discover/discoverBuilder.js`などバックエンド側は
無変更。`DiscoverCard.jsx`はInsight用の`useInsights`フックとDiscover用の
`useDiscoverTeaser`フックを両方呼び出し、それぞれの結果を同じカード内の
別々の行として描画しているだけで、データの合成・混在はしていない。
どちらの行も、対応するデータが無い・読み込み中・エラー時はその行だけ
非表示になり、両方とも無ければカード自体が非表示になる（Insight行は
`/graph`、Discover行は下記「Discoverページ」で説明する`/discover`への
Linkで、それぞれ別々のLinkのまま）。

## Discoverページ

HomeのDiscoverカードのDiscover行は、全産地を横断した**最良の1件だけ**
（`buildDiscoverTeaser`）の文言を見せるティーザーになっている。当初は
クリックすると、文章で話題になっている産地（例: Costa Rica、まだ記録が
無いので自分の知識グラフにノードが無い）ではなく、提案の根拠になった
産地（例: Guatemala）のEntity Detailページへ遷移していた。ユーザーから
「文章の主語と遷移先が違って分かりにくい」という指摘を受け、`/discover`
という専用ページを追加した上で、Discover行自体のリンク先をEntity Detail
ページから`/discover`へ差し替えた（一度は「すべて見る」という別リンクを
併設したが、「Discover行自体がその役割を果たせば別リンクは不要」という
指摘を受け、Discover行のリンク先変更のみに整理した）。StatsページがHome
のInsight（単発の一文）に対する「全体のふりかえり」であるのと同じ関係を、
DiscoverページとHomeのDiscoverカードの間にも作っている。

### GET /discover/all

自分が記録した産地のうち、条件を満たすものすべて（`buildOriginDiscovery`
の条件を満たす産地）を、`core/discover/discoverBuilder.js`の
`buildAllOriginDiscoveries`で集計して返す。産地ごとに、その産地の
Entity DetailページのnodeIdと、提案（最大2件）をまとめる。産地の並び順は
各産地の最良の提案（品質スコアが最も高いもの）の降順（`buildDiscoverTeaser`
と同じ「最も説得力がある順」の考え方）。

```json
GET /api/discover/all

{
  "data": {
    "origins": [
      {
        "nodeId": "origin:507f...",
        "originLabel": "Guatemala",
        "suggestions": [
          {
            "type": "similarProcessOrigin",
            "basedOn": { "originLabel": "Guatemala", "processLabel": "Washed", "count": 2 },
            "suggestedOrigin": { "label": "Costa Rica", "avgQualityScore": 84.1 }
          }
        ]
      }
    ]
  }
}
```

### 表示

`/discover`ページ（`frontend/src/pages/DiscoverPage.jsx`）に、産地ごとに
見出し（Entity Detailページへのリンク）とその産地の提案カード
（`SuggestionCard.jsx`、Entity Detailページの`DiscoverSuggestions.jsx`と
共通のコンポーネント）を並べる。産地が1件も無ければ「記録を増やすと、
ここに提案が表示されます」という次の行動を示すメッセージを表示する
（`docs/design.md`「空状態には次の行動を示す」）。

常設ナビには追加していない（ユーザーと相談し、「静かな道具」の方針を
優先。ナビ項目を増やさず、HomeのDiscoverカードのDiscover行そのものが
`/discover`へのリンクになっている）。Discover行の候補が無い
（`hasTeaser`がfalse）ときは、この行自体を表示しない。

## Performance Boundary

`docs/knowledge-graph.md`・`docs/insights.md`と同様、MVPではユーザー
単位の記録件数が少ない前提で都度計算する。CQIデータはファイルI/O込みで
初回のみ発生し、以降はメモリ参照のみのため、追加のパフォーマンス
コストは小さい。
