# Coffee App Design Principles

## 1. Product Experience

Coffee Appの中心体験は、Record → Connect → Discoverである。

- Record: 迷わず短時間で記録できる
- Connect: 記録するたびに知識グラフが育っていくことが分かる
- Discover: 育った知識グラフから、自分の傾向や新しい関係性に気づける

すべての主要画面は、この循環のいずれかを支援する。

参照するプロダクト感は、コーヒー系SNSではなくLinearやObsidian。
写真や実績を見せるのではなく、記録するほど自分の知識グラフが
育っていく実感そのものを主役にする。

## 2. Target User

コーヒーに関心はあるが、必ずしも専門知識を持たないユーザーを中心とする。

- 専門知識がなくても記録できる
- 詳細を知るユーザーは深く記録できる
- 不明な項目を入力させない
- 専門用語には必要に応じて補足を付ける

## 3. UX Principles

### 3.1 Reduce Recording Friction

- 必須項目を最小化する
- 詳細項目は段階的に表示する
- 自宅とカフェで不要な項目を切り替える
- 記録途中のデータを失いにくくする

### 3.2 One Primary Action

各画面のPrimary Actionは原則1つとする。

### 3.3 Progressive Disclosure

すべての情報を同時に表示しない。
重要度と利用文脈に応じて段階的に開示する。

### 3.4 Clear Feedback

操作結果と現在の状態をユーザーに推測させない。

## 4. Knowledge Graph Principles

知識グラフは技術的なデータ構造の表示ではなく、
ユーザーが自分のコーヒー体験を発見するための画面である。

- 記録から自動生成する
- 初見ユーザーに意味と操作方法を説明する
- ノードの意味を文章で補足する
- 関連記録へ移動できるようにする
- 色だけでノード種別を区別しない

## 5. Information Hierarchy

ユーザーの体験を管理情報より優先して表示する。

優先順位:

1. コーヒーの名前と体験
2. 評価と感想
3. つながりと発見
4. 詳細属性
5. 管理操作

## 6. UI Definitions

2026-08にFigmaで設計し実装したHome画面と、参照先のLinear（linear.app）を
基準にする。新しい画面を作るときは、ここに書かれたトークンをまず参照し、
新しい色・書体・角丸・余白を画面ごとに増やさない。

### 6.1 Color

2026-08、配色を全面刷新した。以前はLinear（linear.app）の本番CSSから
実際に取得した値をそのまま使い、変数名だけmlb-app時代の`ctp-*`
（Catppuccinのスロット名）を書き換えずに引き継いでいた。「Catppuccinを
名乗りながら中身はLinear」という不一致がこのアプリの刷新動機になった
ため、今回は配色そのものに加えてトークン名も、値の意味を表す
セマンティックな名前へ改名した（`ctp-blue`→`primary`など）。名前と
実体を一致させることを優先し、値だけ変えて名前を残すという妥協は
取らなかった。

唯一の定義箇所は`frontend/src/index.css`の`@theme`ブロック
（Tailwind v4の制約でリテラル値のみ）。他のCSS（`App.css`等）は
そこが生成する`--color-*`カスタムプロパティを`var()`で参照するだけで、
値の手動同期は発生しない。

背景の階調（暗い順、値はLinear実測値からほぼ変更していない。
既にほぼ無彩色に近く、変える意味が薄いため）:

- `base`（#08090a）: 画面の最背面（旧`ctp-base`/`ctp-crust`。
  同値だった2トークンを1つに統合した）
- `raised`（#0f1011）: カード・パネルの背景（旧`ctp-mantle`）
- `surface-1` / `surface-2` / `surface-3`: 段階的に明るいUI要素（バッジ、区切り。
  旧`ctp-surface0/1/2`）
- `line` / `line-strong`: 枠線（旧`ctp-overlay0/1`）

テキスト（旧`ctp-subtext0/1`は青みがかっていたため、暖色寄りのグレーへ
微調整した）:

- `text`（#f7f8f8）: 主要テキスト
- `text-secondary` / `text-tertiary`: 補助テキスト

意味を固定したセマンティック色（装飾目的で増やさない）:

- `primary`（#7c8363、モス/オリーブ系）: プライマリアクション・フォーカス
  リング・アクティブ状態・知識グラフの`record`ノード・トーストinfo。
  旧`ctp-blue`（Linear本家のブランドカラーそのもの）を置き換えた。
  モス背景に白文字はコントラスト比約3.74:1でWCAG AA未達のため、
  ボタン文字色はダーク（`text-base`）にしている
- `danger`（#f38ba8、維持）: エラー・削除などの危険操作
- `warn` / `rating`（#f9e2af、維持、同値の別名2つ）: `warn`=トースト警告、
  `rating`=評価（★）。用途で読みやすい名前を使い分けている
- `success`（#a6e3a1、維持）: トースト成功

知識グラフのノード種別カラー（`features/graph/utils/nodeVisuals.js`）と
産地アクセントバー（`features/coffee-records/utils/originAccent.js`）は、
モスの濃淡2段階＋彩度を落とした5色（ミュートな多色）の共有パレットを使う:

- `accent-moss-light` / `accent-moss-dark`: モスの明暗（グラフの`origin`/
  `roastLevel`ノード）
- `accent-slate` / `accent-clay` / `accent-ochre` / `accent-rose` /
  `accent-mist`: モスと彩度を揃えたブルーグレー/テラコッタ/黄土色/ローズ/
  ラベンダーグレー（グラフの`process`/`farm`/`variety`/`flavor`/`cafe`
  ノード）

グレーの濃淡5段階だけにする案も検討したが、隣り合う段階が近すぎて
瞬時に見分けにくいという指摘があり撤回した。ノードは既にlucideアイコンで
種別を区別できている（UI Rules「色だけで状態を表現しない」）ため、色は
識別性の唯一の手段ではないが、それでも一目で見分けられることは維持する。

産地アクセントバー（`getOriginAccentClass`）は、上記の差し色7色から
産地名のハッシュ値で決定的に選ぶ（同じ産地は常に同じ色になる）。
`primary`と`danger`は他の箇所で意味を持たせているためパレットから
除外している。

### 6.2 Typography

- 見出し・本文はInterのみを使う（`--app-font`）。書体を画面ごとに増やさない。
- タイプサイズは5段階に絞る（実測: `text-sm`が最多、`text-xs`が次点。
  中間・大サイズは目的を限定する）:
  - 12px (`text-xs`): 補助情報・バッジ内
  - 14px (`text-sm`): 本文の基準。UIの大部分はこのサイズ
  - 16px (`text-base`): カード内タイトル（記録カードのタイトルなど）
  - 20px (`text-xl`): ページ見出し(h1)・挨拶文
  - 24px (`text-2xl`): 現状`RecordDetailPage`のh1のみで使用。`text-xl`との
    使い分けが曖昧なため、次回の見直し候補として残す
- font-weightは`normal`/`medium`/`semibold`/`bold`の4種のみ。増やさない。
- **数値・日付・カウントのようなコード的要素にはSpace Mono
  （`--app-font-mono`）を使う。** 見出し・本文はInterのまま変えない。
  適用対象の例:
  - 評価の数字（★の隣の`4.0`など。星のグリフ自体はInterのまま）
  - 記録日時の表示（`formatConsumedAt` / `formatConsumedAtShort`の出力）
  - グラフのノード件数（`recordCount`・`appearsInCount`など）
  「事実としての数値」と「文章としてのテキスト」を書体で区別することで、
  Obsidianのノート・技術的な雰囲気を補強する。

### 6.3 Iconography

- アイコンは`lucide-react`のみを使う。
- 知識グラフのノード種別ごとのアイコンは`docs/design.md`の
  「Graph Visual Semantics」で定義済み（色だけで種別を区別しない）。
- strokeWidthは既定値(2)で統一する。個別のアイコンだけ太さを変えない。
- サイズは文脈で使い分ける（新しい中間サイズを増やさない）:
  - 12px: バッジ内の小さいアイコン（評価の★など）
  - 14–16px: 本文中のインラインアイコン
  - 18–24px: CTAなど強調したい操作
- 単色のみ。1つのアイコンに複数色を使わない。

### 6.4 Radius / Spacing

- 角丸は3段階のみ: `rounded-xl`（カード・パネルなど主要コンテナ）、
  `rounded-lg`（カード内の入れ子要素）、`rounded-full`（ピル・バッジ・
  産地アクセントバーなど）。中間の値を画面ごとに作らない。
- 余白は4pxグリッド（Tailwindの既定spacingスケール）の範囲内のみ使う。
  任意のpx値を直接書かない。
- カード内側の余白は`p-4`（モバイル）/`p-5`（sm以上）を基準、一覧行は
  `px-3`〜`px-4` `py-1`〜`py-2`程度のコンパクトな余白を基準とする。

### 6.5 Borders over Shadows

Linearに合わせ、`box-shadow`はほとんど使わない。要素は境界線
（`border-ctp-surface1` / `border-ctp-overlay0`）で同一平面上に
整然と並べる。

`shadow-*`は「画面上に浮いている要素」だけに限定する:

- `shadow-xl`: モーダル・ボトムシート（`ConfirmDialog`、`NodeDetailPanel`）
- `shadow-sm`: グラフキャンバス上のノード（`AttributeNode`、`RecordNode`）

それ以外の要素（カード、セクション、バッジなど）には影を付けない。

### 6.6 Motion

Linearの「素早く、跳ねない」動きに合わせ、2段階のみ使う
（実測: `duration-150`が最多）:

- `duration-150`: 色・背景のホバー遷移（既定）
- `duration-200`〜`300`: 開閉・transformを伴う構造的な動き
  （メニューの開閉、パネルのスライドなど）

バウンドやスケールで大きく弾ませるイージングは使わない。

## 7. Responsive and Accessibility

- 最小タップ領域を確保する
- 色だけに依存しない
- キーボード操作を支援する
- フォーカス状態を明示する
- 読みやすいコントラストを維持する

## 8. Non-Goals

- 情報量を増やすこと自体を価値にしない
- 高度な分析画面にしない
- SNS的な競争や数値評価を中心にしない
