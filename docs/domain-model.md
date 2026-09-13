# Domain Model

## Main Entity: CoffeeRecord

### Required

userId、title、consumedAt、recordType。これらは必須項目である。

### Optional

rating、notes、コーヒーの詳細（産地・農園・品種・精製方法）、焙煎度、
フレーバー、6軸の味覚評価（甘み・苦み・酸味・コク・香り・後味）。これらは
任意項目である。

6軸の味覚評価は、記録詳細ページの味覚グラフ（レーダーチャート）用に
ユーザーが手動で1〜5評価する項目（`backend/models/CoffeeRecord.ts`の
`tasteSweetness`等）。`backend/data/tasteKeywords.json`のcategoryと
呼び名を揃えているが、notesから自動抽出される仕組みとは独立しており、
知識グラフのノードにもならない（下記「Knowledge Graph Terms」参照）。

### コーヒーの詳細（components）— ブレンドコーヒー対応

2026-09、「ブレンドコーヒーも記録できるようにしたい」という要望を受けて
導入した。当初は産地（`originIds`）だけを品種・フレーバーと同じ複数参照
（配列）にする案で実装したが、それだと「産地Aは精製方法Xだった」という
対応関係が失われてしまう（配列同士の突き合わせができない）ことが判明し、
産地・農園・品種・精製方法の4項目を**1つのサブドキュメント
（component）**にまとめ、記録はcomponentsの配列として複数グループを
持てる設計へやり直した。

```
CoffeeRecord.components: [
  { originId, farmName, varietyIds, processId },
  { originId, farmName, varietyIds, processId },
  ...
]
```

- 産地・精製方法は1グループにつき1つ（同じロットは1つの産地・1つの
  精製方法で処理されているため）。品種だけは同じロットに複数品種が
  混在することがあるため、component内でも配列（`varietyIds`）のまま
- 単一原産のコーヒーは、componentsが要素数1の配列になる（特別扱いはしない）
- 焙煎度（`roastLevelId`）・焙煎者（`roasterName`）・フレーバー
  （`flavorIds`）・6軸の味覚評価・評価・メモは、複数のコーヒーを
  ブレンドした**あとの「カップとしての結果」**を表すため、components
  には含めず記録全体で1つのまま据え置く。焙煎度は多くの場合ブレンド後に
  1つの焙煎度で仕上げること、味覚評価は淹れた1杯の印象であることが理由
- 知識グラフ・Insights・Stats・Discoverでの集計は、ブレンド記録を
  「含まれる産地・精製方法・品種それぞれへ1件としてカウントする」
  という考え方に揃えている（品種・フレーバーの既存の複数参照と同じ）。
  Discoverの「産地×精製方法」の組み合わせ判定は、record全体のorigin一覧×
  process一覧の総当たりではなく、**同じcomponent内のorigin/processだけを
  ペアにする**（`backend/core/insights/insightBuilder.js`の
  `findTopCombination`、`backend/core/discover/discoverBuilder.js`の
  `findDominantProcess`参照）

### 抽出の詳細（doseWeight / waterWeight / brewTimeSeconds / pours）

2026-09、「知識グラフを深める／データの幅を広げる」という発展の一環で
追加した。粉量・総湯量・抽出時間（`doseWeight`/`waterWeight`/
`brewTimeSeconds`）と、注湯記録（`pours`。経過時間ごとの累計湯量の配列、
`{elapsedSeconds, cumulativeWaterWeight}`）を持つ。いずれも任意項目で、
既定値はnull（数値項目）または空配列（`pours`）。

6軸の味覚評価と同じ理由（記録1件に閉じた数値データで、複数記録をまたいだ
関係性を持たないため）で知識グラフのノードにはしない。

他の任意項目と異なる点として、**記録編集フォーム（RecordFormPage /
RecordForm.jsx）には含めず、記録詳細ページの独立カード
（`BrewDetailsCard.jsx`）でのみインライン編集する**。レシオ関連の情報は
「豆そのものの情報」（産地・品種・精製方法等）とは性質が異なるという
判断による。保存は既存の`PATCH /api/coffee-records/:recordId`をそのまま
使い、専用のAPIエンドポイントは新設していない。

## Master Entities

産地、品種、精製方法、焙煎度、フレーバーは、それぞれ別コレクションのマスターデータとして管理している。そうすることで、グラフのノードを一貫して保てる。マスターデータにすることで、表記揺れを防げる。

## Farm / Cafe

farmとcafeNameだけは例外で、マスター化しない。

それぞれいくつもの種類があるため、マスター化は困難である。

farmName（農園）は上記の「コーヒーの詳細（components）」に従い、
2026-09からcomponentごとに持つ（`component.farmName`）。ブレンドの
それぞれの豆が別の農園から届くことがあるため。cafeNameは記録全体で
1つのまま（カフェで飲んだ記録の店名であり、豆の産地情報とは別の性質
のため）。

## Knowledge Graph Terms

record、産地、農園、品種、精製方法、焙煎度、フレーバー、カフェ、
キーワード（notesから抽出）がノードになり、recordから各属性へエッジが
伸びる。産地・農園・品種・精製方法は「コーヒーの詳細」（components、上記
参照）の配列を展開して1つずつノード化する（`backend/core/graph/
graphBuilder.js`の`collectAttributeRefs`参照）。キーワードだけは、他の属性と異なりマスターデータの
コレクションを持たない。notesの自由記述に対する固定辞書での部分文字列
一致から都度導出するノードであり、farm・カフェ（文字列由来だが
ユーザーが直接入力する項目名）ともさらに性質が異なる（ユーザーが
明示的に選択・入力した項目ではなく、読み取り時に自動検出される）。

キーワード辞書の語がフレーバーマスターと意味的に完全一致する場合
（例:「チョコレートのような」と「Chocolate」）は、別々のノードにせず
既存のフレーバーノードへ統合する。ユーザーが記録フォームで明示選択した
フレーバーと、notesの自由記述に現れた同じ概念が、知識グラフ上で
無関係な2つのノードに分かれてしまうことを避けるための例外的な扱い
（`docs/knowledge-graph.md`のGraph Generation参照）。対応する単一の
フレーバーが存在しない一般語（「甘い」「フルーティー」等）は統合せず、
キーワードノードのまま残す。

なお、上記「Optional」の6軸の味覚評価（手動入力のレーダーチャート用）は
知識グラフのノードにはならない。記録1件に閉じた数値データであり、
複数記録をまたいだ関係性を持たないため。

## Coffee Diagnosis での利用

`RoastLevel.order`（浅煎り〜深煎りの5段階の順序）と`Flavor.category`
（フレーバーの大分類）は、これまでInsight/Stats/Discoverのどの機能からも
使われていなかったが、Coffee Diagnosis機能（docs/features.md参照）が
記録から「コーヒータイプ」を判定する際の入力として初めて利用する。

2026-08、診断の強化にあわせて、精製方法（Process）・品種（Variety）・
上記「Optional」の6軸の味覚評価も診断の入力に加えた。ただしタイプの
判定軸（焙煎度×フレーバーcategory）には混ぜず、判定結果に付随する
補足情報（よく選ぶ精製方法・品種、6軸の平均テイストプロファイル）として
独立に算出する（docs/features.md「Coffee Diagnosis」の「補足情報」参照）。

6軸の味覚評価は前述の通り「記録1件に閉じた数値データで、複数記録を
またいだ関係性を持たないため知識グラフのノードにはならない」が、これは
知識グラフ（ノード・エッジ）の話であり、診断機能がユーザー自身の複数の
記録から単純平均を計算して表示することとは矛盾しない（記録同士の
エッジを新たに作るわけではないため）。
