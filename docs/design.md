#Design

## Design Concept

静かなコーヒーノートと、探索できる知識グラフを組み合わせる。
参照するのはコーヒー系SNSではなく、LinearやObsidianのような
機能的なツール。写真を大きく見せるフィード型のレイアウトは避け、
テキストと構造（ノード・エッジ）を主役にする。

雰囲気:

- 落ち着いている
- 情報量を詰め込みすぎない
- 専門的だが難しそうに見えない
- 記録を続けるほど豊かになる
- 派手な写真や実績表示で惹きつけない（道具としての静けさ）

## Main Navigation

MVPの主ナビゲーション:

- Home
- Records
- New Record
- Graph
- Stats
- Profile / Settings

Diagnosisページ（`/diagnosis`）・World Mapページ（`/map`）は上記に含めない。
ナビ項目は4つ（Home/Records/Graph/Stats。Profileは別枠）と少なく保つ方針
のため（`frontend/src/components/Navbar.jsx`参照）、Home画面・Statsページ
からのリンク経由でのみ到達する画面にしている（Entity Detailページと同じ
扱い）。

## Screens

### Landing

未ログインの訪問者が最初に見る、`/landing`の公開ページ。Main Navigationの対象外（ログイン後はHomeへ遷移するため表示されない）。

目的:

- プロダクトの世界観（Record → Connect → Discover）を一目で伝える
- 知識グラフでつながる点を、背景の装飾グラフイラストで視覚的に伝える（他社との言葉での比較はしない）
- Get Startedへの導線を作る（primary actionは1つ）

構成例:

- ミニナビ（ロゴ、言語切り替え、Login）
- Hero（kicker、見出し、Record → Connect → Discoverの3ステップ［アイコン+ラベルのみ］、Get Started CTA、背景に装飾的な知識グラフのイラスト）。ページはこのHero1セクションのみで完結させる

2026-09、シンプルな1画面レイアウトへ再設計した（ユーザーとの相談で決定）。
以前はHeroに加えHow it works（3ステップの説明文つきカード）・Your
Knowledge Graph（知識グラフの視覚的なイメージ単体セクション）・Why
Coffee App?（他社比較）・末尾の再掲CTAという4セクションを持っていたが、
「テキストの説明を減らし、シンプルなレイアウトにしたい」という要望を
受けてすべて削除・統合した。3ステップの説明はHero内のアイコン+ラベルの
インライン表示に圧縮し、知識グラフの視覚表現はHero背景の装飾イラスト
（1つ）に一本化した。

Record / Connect / Discoverは言語を問わず共通のブランド語として扱い、翻訳しない。

### Login / Register

未ログインの訪問者が認証情報を入力する、`/login`・`/register`の公開ページ。Main Navigationの対象外（Landingと同様、通常のNavbarではなくAuthNavを表示する。認証必須のページへのリンクを未ログイン者に見せないため）。

構成:

- AuthNav（ロゴ+言語切り替えのみ。Landingと違い、Login/Get Startedリンクは出さない。カード下部の切り替えリンク[「アカウントをお持ちでないですか？新規登録」等]と重複するため）
- 中央寄せのカード（ロゴ、見出し、フォーム、切り替えリンク）。装飾グラフは置かない（単機能画面のため不要と判断）

LoginとRegisterは同じCSS（`.auth-page` / `.auth-card` / `.auth-form`）を共有する。

### Home

目的:

- 最近の記録へ戻る
- 新しい記録を始める
- 小さな発見を得る

構成例:

- Welcome / Todayセクション
- New Record CTA
- Recent Records
- Your Coffee Connections
- よく登場する産地・フレーバーの簡易表示

### Records

- 日付順一覧
- home / cafe フィルター
- rating、origin、flavorなどの絞り込み
- 空状態
- ローディング
- エラー状態

### New / Edit Record

2026-09、「記録体験を向上させる」というテーマでUI/UXを再設計した。
第1〜3弾（選択肢への視覚言語反映・保存演出・レシート/チケット風の
単一カード・Framer Motion導入）を経た後、「モックと違う、一般的な
データ入力画面のまま」というユーザーからの強いフィードバックを受け、
Artifactでのモックアップ検討を先行させた作り直し（「コーヒーキャンバス」）
を行った。現在の`RecordForm.jsx`はこの作り直し後の構成。

**キャンバス**（常時表示、折りたたまない）:

- **タイトル**: 画面最上部の大見出し（Inter、太字・大サイズ）として
  直接編集する
- **産地**: `OriginBadgePicker.jsx`の円形バッジ（1グループ目=
  `values.components[0]`の産地）。選ぶと味覚レーダーの塗り色がその
  産地の色（`utils/originAccent.js`の`getOriginHex`）を纏う。産地の色は
  バッジ自体とレーダーの塗り色という局所的な使い方に留め、**画面
  背景全体を染める演出はしない**（作り直しの過程で一度採用したが
  「背景に使うのはダサい」という指摘を受けて撤回した）
- **味覚グラフ**: `TasteRadarInput.jsx`。六角形レーダーの頂点を
  Pointer Eventsで直接ドラッグして6軸（甘み・苦み・酸味・コク・香り・
  後味）を入力する。数値スライダーではなく「味の形を描く」操作。
  ジオメトリは記録詳細ページの表示用レーダー`TasteRadarChart.jsx`と
  `utils/tasteRadarLayout.js`を共有する。各頂点は`role="slider"`+
  矢印キー/Home/Endのキーボード操作にも対応する
- **日時・home/cafe**: 必須項目のため、常にそのまま入力欄として表示する
  （下記「コーヒーの詳細」のようにボタン化しない）

**コーヒーの詳細**（すべて任意項目。フレーバー・農園・品種・精製方法・
焙煎度・ロースター名・店名・メモ）:

各項目を`PropertyButton.jsx`（現在値を示す小さいボタン）にし、
クリックしたときだけその場にポップオーバーを開いて編集する。実データの
件数（産地20件・フレーバー約41種等）でも、ボタンの帯は折り返すだけで
キャンバス本体の高さに影響しない。ポップオーバーはボタンの実座標
（`getBoundingClientRect`）を基準に`position:fixed`で置き、画面右端・
下端に収まらない場合は自動で左寄せ／上向きへ反転する。フレーバー・
品種のように選択肢が多い項目は、`TagCombo.jsx`（選択済みタグ＋検索欄＋
最大6件の絞り込み候補）を使う。ポップオーバーの大きさが「選んだ数」で
決まり「選べる総数」に左右されないようにするための対応
（`ChipMultiSelect.jsx`の全チップ表示だと選択肢の総数ぶん巨大化するため。
`ChipMultiSelect.jsx`自体は他画面での利用のため現存）。

「＋ブレンドを追加」で2グループ目以降を追加できる（`CoffeeComponentFields.jsx`。
産地・農園・品種・精製方法をカード1枚にまとめる。docs/domain-model.md
「コーヒーの詳細（components）」参照）。1グループ目は上記の産地バッジ＋
個別のPropertyButtonへ展開済みのため、このコンポーネントは2グループ目
以降専用。

必須項目（タイトル・日時・recordType）は変えていないため、Record First
（最小限の入力で保存できる）自体は崩れていない。Coffee Detailsの
「初期状態は閉じている」という段階的開示は今回廃止し、任意項目も
（ボタンの形で）常時表示にしている。docs/product.mdの
Progressive Disclosureとこの画面だけ矛盾するが、この画面に限った
明示的な上書きとして扱う（他画面には広げない）。

**保存の瞬間の演出**: 保存ボタン押下後、ローディングスピナー
（`Loader2`）が一瞬「淹れる」アイコン（`PourIcon`、カップに液体が
注がれるアニメーション）に切り替わり、ラベルも「保存中...」→
「保存しました」に変わってから記録詳細ページへ遷移する
（`RecordFormPage.jsx`の`isJustSaved`、約450ms）。
`prefers-reduced-motion`が有効な環境では演出をスキップする。

**保存ボタンが記録の完成度を帯びる**: コーヒーの詳細・フレーバー・
焙煎度・メモ・味覚6軸の入力状況から算出した完成度（0〜1、
`calcCompleteness`）に応じて、保存ボタン自体の影の強さがなめらかに
変化する。

**保存前の発見バッジ**: 産地を選び終えた（クリック／Enter・Space）
瞬間に、保存前の「発見」プレビューAPI（`POST /api/discoveries/
preview`、docs/features.md「Save Discoveries」参照）を呼び、結果が
あれば`DiscoveryBadge.jsx`（専用の小さいバッジ、知識グラフのノード
種別アイコン・色付き）で一瞬知らせる。

**保存後の発見**: 記録の保存によって新しく生まれたつながり・達成した
マイルストーン（`backend/core/discoveries/discoveryBuilder.js`。ある
属性ノードの初登場、または2/3/5/10件目への到達）が1件以上あるとき、
詳細ページへ遷移する前に専用のインタースティシャル画面
（`SaveDiscoveryReveal.jsx`）を挟む。記録のタイトル・評価（★）と、
発見ごとに知識グラフの種別アイコン・色（`getNodeVisual`）+文言+
「つながりを見る」（該当エンティティ詳細ページへのリンク）を並べ、
「記録を見る」ボタンで詳細ページへ進む。発見が無い保存では、従来どおり
保存ボタンの演出のみで即座に詳細ページへ遷移する。記録の編集（PATCH）
では発見演出は出さない（「新しい体験を記録した」文脈ではないため）。
判定はAI/NLPを使わず、既存の閾値判定パターン（Insight・Discover・
Similar Recordsと同じ）を踏襲している（docs/features.md
「Save Discoveries」参照）。

**Framer Motion**（このアプリで初めてのアニメーション用ライブラリ。
`@animateicons/react`はNavbarアイコン専用で別用途）: 産地バッジ・
保存ボタン・PropertyButtonのポップオーバー開閉・発見バッジ・保存後
インタースティシャルに、CSSの疑似的なイージングではなく実際のバネ
物理計算（`type: "spring"`）を使う。この画面（`RecordForm.jsx`・
`SaveDiscoveryReveal.jsx`）に限り、他画面が踏襲する「静かな道具」と
いう既定方針をユーザーの明示的な指示で意図的に上書きしている
（他の画面には広げない）。

書体は既存方針（Interのみ、画面ごとに増やさない）を維持している
（装飾的な書体の組み合わせは、作り直しの検討時に一度候補に上がったが、
実務のプロダクトUI（Linear・Notion・Vercel・Stripe等）は単一の
サンセリフ書体をウェイト違いで使い分けるのが一般的という傾向を踏まえ、
採用しなかった）。

### Record Detail

- 基本情報
- Coffee Details（2026-09、ブレンド記録は「コーヒーの詳細」1グループ
  ごとに区切って表示し、産地と精製方法の対応関係を保つ。単一グループ
  （シングルオリジン）のときは以前と同じ見た目のまま、枠や見出しを
  追加しない）
- Notes
- 味覚グラフ
- 関連ノード
- 抽出の詳細（独立カード、味覚グラフの下。記録編集フォームとは別に
  インライン編集する。docs/domain-model.md「抽出の詳細」参照）
- Edit / Delete
- Graphで見る

### Graph

- グラフキャンバス
- ノードタイプフィルター
- 選択中ノードのサイドパネル
- 関連記録一覧
- 記録詳細へのリンク

### Stats

これまで記録したコーヒーのふりかえり（docs/features.mdのStats節を参照）。

- Overview（総記録数・平均評価・産地/品種/フレーバーの種類数・
  記録を始めてからの日数）
- 月ごとの記録数の推移
- 評価の分布
- 家とカフェの比較
- 産地・品種・精製方法・フレーバー・カフェの上位ランキング
  （エンティティ詳細ページへのリンク）

### Diagnosis

記録から判定した「コーヒータイプ」と、Insight・Statsの要約をまとめて見せる
`/diagnosis`ページ（docs/features.md「Coffee Diagnosis」参照）。主ナビには
含めない（Main Navigation参照）。Home画面のDiscoverカード・Statsページ
からのリンクで到達する。

構成:

- コーヒータイプ（判定できない場合は空状態）
- 気づき（Insightの全件）
- 記録の全体像（Statsの要約: 記録数・平均評価・家とカフェ・産地/フレーバー
  上位ランキング）

### Profile / Settings

- 表示言語の切り替え（日本語⇔英語）
- 名前の変更
- パスワードの変更
- アカウント削除（確認ダイアログを必ず挟む。関連する記録もすべて削除されることを明示する）

## UI Rules

- 主要CTAは1画面に1つを基本とする
- フォームはセクション分割する
- 任意項目を必須に見せない
- 色だけで状態を表現しない
- 削除には確認を入れる
- 未保存の変更を破棄して離脱する際も確認を入れる（記録編集フォーム、`RecordFormPage.jsx`のuseBlocker参照）
- 空状態には次の行動を示す
- グラフ画面にも凡例を置く
- モバイルではグラフ詳細をbottom sheetまたは下部パネルにする

### カード化の使い分け

2026-08、EntityDetailページの一部セクションだけがカード化されておらず
他ページと見た目が揃っていない、という指摘を受けたことをきっかけに
明文化した（それまでは複数ページで同じ「移行漏れ」が繰り返し発生して
いた）。ページの性質によって2つのパターンを使い分ける。

- **レポート・詳細系ページ**（Stats、Diagnosis、RecordDetail、
  EntityDetailなど、1つのテーマについて複数の情報のまとまりを上から
  読んでいくページ）: **見出しの有無に関わらず**、コンテンツの
  まとまり（統計カードの行、地図のような単体ビジュアル、関連情報の
  一覧など）はすべて`cardClass`（枠線+背景+影のカード、
  `frontend/src/features/coffee-records/components/formStyles.js`）で
  囲む。セクション内にネストする要素（StatCard・ArchetypeCard・
  HomeVsCafeCard・SuggestionCard等）は`flat`propで影を消し、二重の
  影にしない。ページ見出し（`<h1>`）に付随する小さなバッジ・ラベル
  （RecordDetailの評価バッジ、EntityDetailの種別ラベルなど）や、
  ボタン・リンクなどの操作要素はカード化の対象外（コンテンツではなく
  ページヘッダー・操作の一部のため）。
- **一覧・ダッシュボード系ページ**（Home、Recordsなど、複数の独立した
  項目を横断的に見せて次にどれを選ぶか決めるページ）: 見出しはプレーン
  テキストのままでよく、各項目自体を影付きのカードにする。ページ全体・
  セクション全体を外枠で囲まない。

判断基準: そのページ（またはセクション）が「1つのテーマについての
報告」なら前者、「選ぶための一覧」なら後者。

2026-08、上記の前者パターンについて、「見出しの無いコンテンツ（統計
カードの行、地図）はカード化しなくてよいのか」という指摘を受けた。
見出しの有無で例外を作ると、地図のような単体ビジュアルとStatCardの
行とで扱いが分かれてしまい（前者はカード化、後者は非カード化）、
判断基準が視覚的な好みに依存してしまう。「見た目の統一感を取るか、
ルールの単純さを取るか」ではなく「機械的に一律ルールにするか、
情報の軽重を演出する複雑なルールにするか」という論点だと整理した
うえで、後から見て判断に迷わない前者（一律`cardClass`化）を採用した。

## Graph Visual Semantics

ノード種別は色だけでなく、ラベルまたは形状でも判別可能にします。

2026-09、lucide-reactの汎用アイコンでは種別が覚えにくい・気に入らない
というフィードバックを受け、実在の`@phosphor-icons/react`本体のアイコンへ
9種類全て差し替えた（ユーザーの明示的な指示により、下記Iconography節の
「lucide-reactのみを使う」ルールをこの9種類に限り上書きしている）。
手描きの曲線パスは一切使わず、Phosphor本体が実際に持つパスデータのみで
構成する。

- record: `CoffeeIcon`（コーヒーカップ）
- origin: `MapPinIcon`（地図ピン）
- farm: `BarnIcon`（納屋。「農地・施設」を表す。Phosphorの`Plant`は
  IT文脈で「サーバーファーム」を意味する図柄のため使わない）
- variety: `PlantIcon`（芽。生豆の品種という「まだ育つ途中のもの」を表す）
- process: `CherryToBeanIcon`（`frontend/src/features/graph/components/
  CherryToBeanIcon.jsx`。精製方法＝コーヒーチェリーから豆を取り出す工程を
  表現するため、Phosphor本体にはない専用の合成アイコン。Phosphor本体の
  `Cherries`と`CoffeeBean`のパスを縮小配置し矢印でつないでいる。12px程度の
  小サイズでは3要素が潰れて判別しづらいことを確認済みだが、ユーザーとの
  相談の上でそのまま採用した）
- roastLevel: `FireIcon`（炎）
- flavor: `SparkleIcon`（きらめき）
- cafe: `StorefrontIcon`（店舗）
- keyword: `TagIcon`（タグ）

対応表の実体は`frontend/src/features/graph/utils/nodeVisuals.js`（DOM用）と
`frontend/src/features/graph/utils/canvasIcons.js`（canvas描画用、同じ
パスデータを別形式で保持）の2箇所。両者がずれないよう、値を変更する際は
必ず両方を更新すること。

## Design Tokens

2026-08、参照先をLinear（linear.app）からmobbin.com（UIデザイン
リファレンス集）へ切り替え、色・奥行き（影/すりガラス）・角丸・
モーションを全面刷新した。新しい画面を作るときは、ここに書かれた
トークンをまず参照し、新しい色・書体・角丸・余白を画面ごとに増やさない。

### Color

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

2026-09、ブレンドコーヒー対応（1記録が複数の産地を持てるようになった）
にあわせ、記録カード（`RecordCard.jsx` / `HomeRecordCard.jsx`）の産地
表示を、産地の数だけ`getOriginAccentClass`のバーを横に並べる形へ変更
した。関数自体（産地名1つ→色1つ）は変えず、呼び出し側で配列をmapして
並べるだけにしている。産地名も"/"区切りですべて表示する。単色1本に
まとめる案（ブレンド時だけ中立色にする等）も検討したが、産地ごとの
色の違いをそのまま見せたほうが「複数の産地が混ざっている」ことが
一目でわかるため、この形にした。

### Typography

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

### Iconography

- アイコンは`lucide-react`のみを使う。ただし知識グラフのノード種別
  アイコン（9種類）だけは例外で、2026-09にユーザーの明示的な指示により
  `@phosphor-icons/react`へ差し替えた（詳細は上記「Graph Visual
  Semantics」参照）。この例外を他の画面のアイコンへ広げない。
- 知識グラフのノード種別ごとのアイコンは上記「Graph Visual Semantics」で
  定義済み（色だけで種別を区別しない）。
- strokeWidthは既定値(2)で統一する。個別のアイコンだけ太さを変えない。
- サイズは文脈で使い分ける（新しい中間サイズを増やさない）:
  - 12px: バッジ内の小さいアイコン（評価の★など）
  - 14–16px: 本文中のインラインアイコン
  - 18–24px: CTAなど強調したい操作
- 単色のみ。1つのアイコンに複数色を使わない。

### Radius / Spacing

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

### Depth & Glass

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

### Motion

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
