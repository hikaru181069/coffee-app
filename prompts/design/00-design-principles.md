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

2026-08、参照先をLinear（linear.app）からmobbin.com（UIデザイン
リファレンス集）へ切り替え、色・奥行き（影/すりガラス）・角丸・
モーションを全面刷新した。新しい画面を作るときは、ここに書かれた
トークンをまず参照し、新しい色・書体・角丸・余白を画面ごとに増やさない。

### 6.1 Color

2026-08、配色を全面刷新した。以前はLinear（linear.app）の本番CSSから
実際に取得した値をそのまま使い、変数名だけmlb-app時代の`ctp-*`
（Catppuccinのスロット名）を書き換えずに引き継いでいた。「Catppuccinを
名乗りながら中身はLinear」という不一致を解消するため、一度モス系の
差し色へ刷新したが、ユーザーから「現在のカラー配色は全て破棄」という
方針転換があり、mobbin.comのCSSソースを`curl`で取得して実測した値を
基準に、再度全面刷新した。

**重要な訂正の経緯**: 当初「mobbin.comは彩度の高い青をアクセントに
使っている」と誤って報告したが、実際にHTML内のクラス使用箇所を
検証したところ、青（`blue-*`）は**キーボードフォーカスリングにのみ**
使われており、主要CTAボタンにすら使われていなかった（ユーザーからの
指摘で判明）。実際の主要CTAボタンは`bg-background-inverse
text-text-inverse rounded-full`という、色を使わない反転配色（明背景+
暗文字）のピル型ボタンだった。この事実に基づいて配色を設計している。

唯一の定義箇所は`frontend/src/index.css`の`@theme`ブロック
（Tailwind v4の制約でリテラル値のみ）。他のCSS（`App.css`等）は
そこが生成する`--color-*`カスタムプロパティを`var()`で参照するだけで、
値の手動同期は発生しない。

背景・テキストの階調（完全な無彩色。mobbin.comのneutralスケール実測値
を基準にした）:

- `base`（#141414）: 画面の最背面
- `raised`（#1f1f1f）: カード・パネルの背景
- `surface-1` / `surface-2` / `surface-3`: 段階的に明るいUI要素（バッジ、区切り）
- `line` / `line-strong`: 枠線
- `text`（#fafafa）: 主要テキスト
- `text-secondary` / `text-tertiary`: 補助テキスト

反転配色（主要ボタン専用、新設）:

- `inverse`（#ffffff）/ `on-inverse`（#141414）: 主要ボタンの背景/文字。
  mobbin.com実測の通り、色を使わず明暗のコントラストだけで主要操作を
  示す。`rounded-full`のピル形状と組み合わせる（`primaryButtonClass`、
  `.home-link`）

意味を固定したセマンティック色（装飾目的で増やさない）:

- `primary`（#0077ff、mobbin.com実測のblue-60）: **キーボードフォーカス
  リングにのみ使う**（`ring-primary/50`）。mobbin.com自身も通常時の色
  としては使っておらず、フォーカス表示という一点のためだけの色
- `danger`（#ffa27a、mobbin.com実測のred系相当）: エラー・削除などの
  危険操作
- `warn` / `rating`（#ffdf52、mobbin.com実測のyellow系相当、同値の
  別名2つ）: `warn`=トースト警告、`rating`=評価（★）
- `success`（#aff976、mobbin.com実測のgreen系相当）: トースト成功

知識グラフのノード種別カラー（`features/graph/utils/nodeVisuals.js`）と
産地アクセントバー（`features/coffee-records/utils/originAccent.js`）は、
mobbin.com側に対応する概念が無いため今回のスコープ外とし、値を変更して
いない。モスの濃淡2段階＋彩度を落とした5色（ミュートな多色）の共有
パレットのまま:

- `accent-moss`（#7c8363、新設）: グラフの`record`ノード専用。
  `primary`がフォーカスリング用の青に変わったため切り離した
  （旧`primary`と同じ値で、見た目は変えていない）
- `accent-moss-light` / `accent-moss-dark`: モスの明暗（グラフの`origin`/
  `roastLevel`ノード）
- `accent-slate` / `accent-clay` / `accent-ochre` / `accent-rose` /
  `accent-mist`: モスと彩度を揃えたブルーグレー/テラコッタ/黄土色/ローズ/
  ラベンダーグレー（グラフの`process`/`farm`/`variety`/`flavor`/`cafe`
  ノード）

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

- 2026-08、mobbin.com実測値（カード16〜24px、主要ボタンは完全な
  ピル）に合わせて角丸を拡大した。3段階: `rounded-2xl`（カード・
  パネルなど主要コンテナ、旧`rounded-xl`から拡大）、`rounded-xl`
  （フォーム入力欄、旧`rounded-lg`から拡大）、`rounded-full`
  （ボタン・ピル・バッジ・産地アクセントバーなど）。中間の値を画面
  ごとに作らない。
- 余白は4pxグリッド（Tailwindの既定spacingスケール）の範囲内のみ使う。
  任意のpx値を直接書かない。
- カード内側の余白は`p-4`（モバイル）/`p-5`（sm以上）を基準、一覧行は
  `px-3`〜`px-4` `py-1`〜`py-2`程度のコンパクトな余白を基準とする。

### 6.5 Depth & Glass

2026-08、Linearに合わせた「Borders over Shadows」（影をほぼ使わない）
という方針を撤回し、mobbin.com実測の「大きく柔らかい影＋すりガラス」
という奥行きの言語へ全面刷新した。

mobbin.comのCSSソースを解析した実測値: 大きく柔らかい低濃度の影
（`0 12px 80px rgba(0,0,0,0.16)`相当）。ダークモードでは同じ影がより
高濃度になり、さらに`inset 0 0 0 0.5px rgba(255,255,255,0.16)`という
極薄の白いインセットハイライトを縁に加える（黒背景に黒い影だけでは
見えないための対策で、ガラスの縁のような質感を生む）。

このアプリのトークン（`frontend/src/index.css`の`@theme`）:

- `shadow-elevated`: カード全般（`cardClass`、`StatCard`、
  `DiscoverCard`、`GraphPreview`など、`bg-raised`を持つほぼ全てのカード）
- `shadow-panel`: モーダル・ボトムシート（`ConfirmDialog`、
  `NodeDetailPanel`）。`shadow-elevated`よりも強い影＋
  `backdrop-blur-xl`のすりガラスを併用する

グラフキャンバス上のノード（`GraphCanvas.jsx`）はcanvas 2D APIで
描画するためCSSトークンは使えず、`ctx.shadowBlur` / `ctx.shadowColor`
で同じ質感を再現している。

空状態・エラー状態のような「存在しない/警告」を示す破線枠・警告色の
箱には影を付けない（影=浮いている=実体がある、という意味と矛盾する
ため）。

### 6.6 Motion

2026-08、Linearの「素早く、跳ねない」動きから、mobbin.com実測の
「素早く動き出して滑らかに減速する」動きへ全面刷新した。mobbin.comは
JSのアニメーションライブラリを使わず、純粋なCSS（`@keyframes` +
`transition`）と標準の`IntersectionObserver`（スクロールイン検知）
だけで実現している。このアプリも同じ構成（新しい依存ライブラリの
追加なし）。

- `--ease-decel`（`cubic-bezier(0.32, 0.72, 0, 1)`、mobbin.com実測の
  signatureイージング）: ページ遷移・スクロールイン演出に使う
- 150ms: 色・背景のホバー遷移（既定、`duration-150`）
- 200〜300ms: 開閉・transformを伴う構造的な動き（メニューの開閉、
  パネルのスライドなど）
- 450〜500ms: ページ遷移（`page-transition`）・カードのスクロールイン
  演出（`.reveal`、`frontend/src/hooks/useReveal.js`）のような、
  大きめの出現演出

要素の出現は不透明度0→1 + Y方向へのスライドの組み合わせを基本形と
する。カード一覧（Records一覧・検索結果・Home・Statsランキング・
EntityDetailの関連記録）は`frontend/src/utils/revealDelay.js`で
インデックスに応じた段階的な遅延を付け、カスケードして現れるようにする。

バウンドやスケールで大きく弾ませるイージングは使わない。
`prefers-reduced-motion: reduce`環境では全てのアニメーションを無効化
する（既存の`page-transition`・`.reveal`ともに対応済み）。

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
