# Insights Design

## Purpose

知識グラフは、記録同士の関係性を「見て探索する」ためのUIである
（docs/knowledge-graph.md）。しかしグラフだけでは、関係性の中に
どんな意味があるかをユーザー自身が読み取る必要がある。

Insightは、記録データから統計的なパターンをルールベースで検出し、
「あなたはエチオピア産かつナチュラル精製のコーヒーを高く評価する
傾向があります。」のような一文としてアプリ側から意味を提示する機能。

## ルールベースであり、AI/自然言語処理ではない

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
（docs/product-principles.md「MVP Before Intelligence」）。

## Source of Truth

MongoDBのCoffeeRecordとマスターデータを正とする。Insight専用の
コレクションは持たず、APIレスポンスとして都度導出する
（docs/database.mdのGraph Persistenceと同じ考え方）。

## Insight種別と閾値

データが少ないうちに断定的な一文を出すと、統計的に意味の無い偶然を
「傾向」と誤って伝えてしまう。種類ごとに最低件数・評価差などの閾値を
設け、満たすものが無ければ何も返さない。

| type | 内容 | 閾値 |
| --- | --- | --- |
| `topCombination` | 評価の高い産地×精製方法の組み合わせ | 2件以上・平均評価4.0以上のうち最高 |
| `risingTrend` | 直近に偏って登場している産地・フレーバー | 直近側（末尾1/3、最低2件）の登場割合が、それ以前より40ポイント以上増加 |
| `homeVsCafeDiff` | 自宅とカフェでの評価の違い | 各2件以上あり、平均評価の差が1.0以上 |
| `topProcessRating` | 高評価が多い精製方法 | 2件以上・平均評価4.0以上のうち最高 |
| `topFlavor` | よく選ぶフレーバー | 3件以上登場（同率首位は除く） |
| `topOrigin` | 最も多く飲んでいる産地 | 3件以上登場（同率首位は除く） |

具体的な計算は `backend/core/insights/insightBuilder.js` を参照
（閾値は`THRESHOLDS`定数にまとめてあり、調整しやすくしてある）。

## 優先度・選択

上記の表の順（説得力があると考えられる順）に条件を満たすものを探し、
満たすもの**すべて**を配列として返す。フロントエンドは配列の先頭
（最も優先度が高いもの）だけを表示する（「静かな道具」の方針に沿い、
複数のInsightを並べて情報過多にしない）。

将来「Insightの一覧を全部見る」画面を追加する場合も、バックエンドの
変更は不要（配列はすでに全件返している）。

## Response Shape

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

`type`ごとにフィールドが異なる。文言の生成（日本語・英語の一文への
変換）はフロントエンド側（`features/insights/components/InsightBanner.jsx`）
がi18nextの補間で行う。バックエンドは数値・ラベルなどの構造化データ
だけを返し、文言そのものは持たない（日英どちらの言語でも同じ
バックエンドレスポンスを使い回すため）。

## Insight Generation

1. 認証済みuserIdでCoffeeRecordを全件取得（フィルターは持たない。
   「記録全体からの傾向」を示す機能のため）
2. `core/insights/insightBuilder.js`（純粋関数）が種別ごとに集計・
   閾値判定し、条件を満たすものを優先度順の配列にする
3. frontend向け形式で返す

## 表示

Home画面のGraphPreviewの上に、配列の先頭のInsightだけを一文で表示する
（`features/insights/components/InsightBanner.jsx`）。条件を満たす
Insightが1つも無い・読み込み中・エラー時は何も表示しない。Homeの主役は
記録一覧とCTAであり、この要素が無くても画面として成立する。

`/graph`へのLinkにしている。「発見は単なる数値表示で終わらせない」
（docs/product-principles.md「Discovery Must Be Actionable」）に従い、
一文を提示するだけで終わらせず、グラフでの探索へつなげるため。

## Performance Boundary

docs/knowledge-graph.mdのGraph同様、MVPではユーザー単位の記録件数が
少ない前提で都度計算する。キャッシュや専用の集計コレクションは
データ量が増え、計算コストが問題になった段階で検討する。
