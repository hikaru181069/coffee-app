# Knowledge Graph Design

## Source of Truth

グラフは専用のデータは持たず、coffeeRecordとマスターデータから都度導出する。

## Stable IDs

それぞれのノードにプレフィックスを付ける。これにより、異なる種別で偶然同じ値があっても別ノードとして区別できる。

## Graph Generation

グラフ生成の流れ:

1. 認証済みuserIdでcoffeeRecordを取得
2. マスターデータをpopulateまたは集約
3. coffeeRecordノードを生成
4. 属性ノードを重複排除して生成（Map）。産地・農園・品種・精製方法・
   焙煎度・フレーバー・カフェに加え、notesを固定辞書と部分文字列一致で
   照合したキーワードも同じ手順でノード化する
   （backend/core/graph/noteKeywordExtractor.js）。ただし辞書語が
   Flavorマスターと意味的に完全一致する場合（例:「チョコレートのような」
   →「Chocolate」）は、新しいkeywordノードを作らず既存のflavorノードへ
   統合する（backend/data/tasteKeywords.jsonのflavorAlias、
   backend/core/graph/graphBuilder.jsのcollectAttributeRefs参照）。
   ユーザーが手動選択したflavorと、notesの自由記述に現れた同じ概念が
   グラフ上で別ノードに分かれる冗長さを避けるための対応
5. recordと属性のedgeを生成
6. recordCountなどのmetadataを集計
7. frontend向け形式で返す

## Filters

nodeType、recordType、dateFrom/dateTo、ratingMinを指定できる。

## Interaction

ノードを選んだ時に出す情報。属性ノードなら種別・ラベル・記録数・関連記録。recordノードなら記録日・評価・メモの抜粋を表示する。
