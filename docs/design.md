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

構成（`HomePage.jsx`。2026-08にFigmaでの再設計・Insight/Discover機能の
追加を経て現在の形になった。以前この節にあった「Your Coffee
Connections」「よく登場する産地・フレーバーの簡易表示」という項目名は、
実装が進む過程で下記のDiscoverカード・GraphPreviewへ統合されており、
現在は存在しない。同じ情報をGraph画面のノードrecordCountで既に見られる
ため重複させず、Graphへの導線だけを置くという方針は変わっていない）:

- **挨拶**: 時間帯に応じた挨拶文（朝/昼/夕）
- **New Record CTA**: 記録が1件も無い最初の訪問時だけ大きく表示し、
  記録が既にあるリピーターには小さいボタンへ縮小する
  （Progressive Disclosure）
- **Recent Records**: 直近6件を横並びグリッドで（`HomeRecordCard.jsx`）。
  産地・銘柄・評価・精製方法・フレーバーに絞って表示し、日付・記録タイプは
  一覧画面（`RecordCard.jsx`）に譲る
- **Discoverカード**（`DiscoverCard.jsx`）: Insightの一文（例:
  「あなたはEthiopia産かつWashed精製のコーヒーを高く評価する傾向が
  あります。」）と、Discoverの提案・コーヒー診断・世界地図への導線を
  1枚に統合したカード。2026-08、別々に置いていたInsightBannerと
  Discoverへのリンクが「見つけにくい」という指摘を受けて統合した
  （裏側のデータ・ロジックはInsight/Discoverそれぞれ独立したまま、
  見せ方だけを統合している）
- **知識グラフカード**（`GraphPreview.jsx`）: 静的なイラスト+ノード数・
  つながり数の実数字。「グラフが育っている」という実感をHomeでも見せる
  ための導線。実データを縮小描画すると小さすぎて読めなかったため、
  2026-08に静的イラストへ変更した（詳細は`GraphPreview.jsx`のコメント
  参照）

DiscoverカードとGraphPreviewは`lg`以上の画面幅では横並び（比率2:5）、
それ未満では縦積みにする。

Recent Recordsの精製方法・フレーバーの配色（Graph画面と揃えた種別共通色・
値ごとの個別色）は「Records」節の「タグの配色」参照（`HomeRecordCard.jsx`
にも同じ配色を適用しているが、タグ形式ではなく文字色のみで軽く付けている）。

### Records

- 日付順一覧
- home / cafe フィルター
- rating、origin、flavorなどの絞り込み
- 空状態
- ローディング
- エラー状態

**タグの配色（Graph画面との統一）**: 2026-09、「記録一覧・Homeの記録
カードにGraph画面の配色の雰囲気を適用してほしい」という要望を受け、
`RecordCard.jsx`のタグ（精製方法・フレーバー）に色を付けた。精製方法は
Graph画面と同じ種別共通色（`nodeVisuals.js`の`process`、紫）、フレーバーは
産地（`originAccent.js`）と同様に、フレーバーごとの個別色
（`frontend/src/features/coffee-records/utils/flavorAccent.js`、新設）を
使う。種別共通色と個別色を使い分けている理由: 精製方法・焙煎度は選択肢の
種類数が少なく個別色にする実益が薄いのに対し、産地・フレーバーは
「具体的に何を選んだか」を色だけでも大まかに掴めた方が実用的なため
（例: 記録一覧を眺めたときに「これはBerry系、これはChocolate系」と
判別しやすくなる）。`HomeRecordCard.jsx`（Home画面の記録カード）にも
同じ配色を適用しているが、Homeはタグ形式ではないため文字色のみで軽く
付けている。

`flavorAccent.js`は`backend/seeds/data/flavors.js`の全42種それぞれに、
そのキーワードを連想させる個別のHEX値を手動で割り当てた対応表
（`originAccent.js`の産地ごと個別対応表と同じ考え方。ハッシュ割り当てでは
なく決め打ち）。Artifactでのモック確認を経てユーザー承認を得た配色。
新しいフレーバーをマスターデータへ追加する際は、この対応表にも1行
追加すること（追加し忘れても中立グレーになるだけでエラーにはならない）。

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
件数（産地20件・フレーバー42種等）でも、ボタンの帯は折り返すだけで
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
いう既定方針をユーザーの明示的な指示で意図的に上書きしている。

2026-09、ローディング表示（ボタンのスピナー・ページ全体のスケルトン）
はコーヒーのドリップを模した`CoffeeLoader.jsx`に統一し、全画面へ
展開した（`Loader2`・shimmerスケルトンを置き換え）。Framer Motionの
バネ物理計算自体は引き続きこの画面限定。

2026-09、上記の直後、一覧・グリッド系（Home「最近の記録」・Records
一覧・検索結果）については、本来カードが複数枚並ぶ場所に形も大きさも
無関係な単一の大きいアイコンを置くと浮いて見える、という指摘を受け、
これら3箇所だけ元のshimmerスケルトン（`App.css`の`.skeleton-block`）へ
戻した。Web開発の慣例（Facebook/LinkedIn発祥のskeleton screenパターン。
一覧の読み込み中はカードと同じ形のプレースホルダーを使う）に合わせた
判断。`CoffeeLoader`はボタン・フルページの状態（Stats/Profile/
RecordDetail/RecordForm/EntityDetail等）・Graphキャンバス・
DiscoverCardのような「単一のまとまりを待つ」箇所では引き続き使う。

2026-09、CoffeeLoaderのドリップアニメーションを他の場面にも活かしたい
というユーザーの要望を受け、以下2箇所へ転用した:

- **保存後の「発見」画面**（`SaveDiscoveryReveal.jsx`）: 画面の冒頭に
  CoffeeLoaderを1サイクル（4.6秒）だけ再生してから、記録・発見一覧を
  見せるようにした。「コーヒーが淹れ上がって、発見が明らかになる」と
  いう一連の流れを表現する狙い。発見が無い普通の保存（`RecordForm.jsx`
  のボタン内`PourIcon`のみ）にまでこの演出を挟むと保存のたびに待たされて
  煩わしくなるため、発見が1件以上あるこの画面限定にしている。
  `prefers-reduced-motion`では即座に本体を表示する
- **記録が1件も無いときの空状態**（`RecordsEmptyState`、Records画面）:
  固定のCoffeeアイコン（lucide-react）の代わりに、CoffeeLoaderをループ
  表示するようにした。他の使用箇所が「1サイクルだけ再生する一瞬の演出」
  なのに対し、ここは「記録するまでずっと続く状態」を表すため、ループの
  まま止めない

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

2026-09、「ダッシュボード風にしたい」という要望を受け、`wideContainerClass`
（Home画面と同じ`max-w-[1600px]`。以前は読み物系ページの
`contentContainerClass`=1200pxだった）へ幅を広げ、レイアウトを作り直した。
Artifactでのモック検討・承認を経て実装した。

- **KPIタイル**: 見出し行の下に、産地・品種・フレーバーの件数と抽出比
  （レシオ）を`StatCard`で並べる。新しい集計値ではなく、下のCoffee
  Information/BrewDetailsCardが既に持つ値を要約として先出しするだけ。
  各タイルのアイコン・色は対応する知識グラフのノード種別
  （`getNodeVisual`）をそのまま使う。レシオは知識グラフのノード種別に
  対応しないため、roasterName等と同じ中立色（`text-tertiary`/
  `bg-surface-2`）にしている。
- **lg以上（デスクトップ）でビューポートに収める**: `lg:h-[calc(100vh-3.5rem)]`
  でページ自体をナビバー分を引いた画面の高さに固定し、ページ全体のスクロールを
  無くした（Home画面と同様の「1画面で完結する」体験を目指す指摘を受けて）。
  2カラム（コーヒーの情報を扱う列/図解・つながりを扱う列）のグリッドにし、
  各カードは見出しを固定したまま本文だけ内部スクロールする
  （`lg:min-h-0`+`lg:overflow-y-auto`）。味覚グラフ・つながり図・似た記録は
  正方形の図解や件数上限（最大5件）があり内容量が予測できるため、自然な
  高さのまま置く。列（stack）自体にも保険として`lg:overflow-y-auto`を
  持たせており、図解の自然な高さの合計が列の持ち分を超えた場合も、列
  全体をスクロールしてすべて見られるようにしている（実データでの検証中、
  「つながり」図の自然な高さがサイドバー列の持ち分を超え、直後の「似た
  記録」がゼロ高さに潰れる不具合が起きたため対応した。詳細は
  IMPLEMENTATION.md参照）。lg未満（モバイル）ではこれらの制約を外し、
  従来通り1カラムで縦にスクロールする。

EntityDetailPage.jsx（`docs/features.md`「Entity Detail」参照）も同じ方針
（`wideContainerClass`・lg以上でビューポートに収める2カラム構成・
関連する種別数のKPIタイルを追加）で作り直した。

### Graph

- グラフキャンバス
- ノードタイプフィルター
- 選択中ノードのサイドパネル
- 関連記録一覧
- 記録詳細へのリンク

2026-09、「グラフを直接操作している体験が感じられない」という指摘を受け、
既存コード（react-force-graph-2d／d3-force）を捨てて作り直した
（`GraphCanvas.jsx`）。Artifactでの対話的なプロトタイプ検討を経て、以下を
決定した。

**物理演算**: react-force-graph-2d（d3-force）への依存をやめ、canvas 2D +
自前の反発・バネ・減衰による物理演算へ全面置き換えた。ドラッグ中は
ポインタへバネで追従し（瞬間移動ではなく少し遅れて・少しオーバーシュート
しながら追いかける）、離すと慣性で流れて減衰する。開いた瞬間に
ノードが弾け飛んで収まる、という必然性のないアニメーションを見せない
ため、初期配置から安定するまでを画面に映さず裏側で先に計算してから
最初の描画を行う（フィルター変更等でデータが変わるたびに同様）。

**ノードの見た目**: 「輪郭線+小さいアイコン」から「種別色で塗りつぶした
円+暗色アイコン」へ変更した。属性ノードも角丸矩形から円へ統一している。
サイズはdegree（つながっている記録の数）に応じて大きくなる方針を維持し、
ベースサイズ自体を底上げして密度感を上げた。エッジ（つながりの線）も
1px灰色の細線から、つながる属性ノードの色を帯びた太めの線へ変更した。

**配色**: グラフ専用の9トークン（`--color-graph-*`、index.css）を新設し、
寒色〜暖色にまたがる配色にした（産地=青・農園=緑・品種=黄・精製方法=紫・
焙煎度=橙・フレーバー=マゼンタ・カフェ=ティール・キーワード=シアン・
記録=赤）。この9色は`GraphLegend.jsx`の凡例スウォッチと、値ごとの個別色を
持たない種別（farm・variety・process・roastLevel・cafe・keyword・record）の
実際のノード色。産地・フレーバーは下記の通り値ごとの個別色で描画される
ため、凡例の色（青・マゼンタ）はあくまで「産地・フレーバーという種別」を
代表する色であり、個々のノードの実際の色とは一致しない。以前はDiscover・
WorldMapLegend・OverviewStats・Diagnosisの
archetype色と共有の`--color-accent-*`（Catppuccin Mocha）を使っていたが、
グラフの見た目を変えるたびに無関係な4画面の配色まで変わってしまうため、
専用トークンへ分離した。origin・flavorノードだけは種別共通色ではなく、
値ごとの個別色（`originAccent.js`・`flavorAccent.js`）を使う（2026-09、
記録カードのタグ配色と統一する形でflavorも個別色化した。`NodeDetailPanel.jsx`
のバッジも同様）。他の種別（process・roastLevel等）は選択肢の種類数が
少なく個別色にする実益が薄いため、種別共通色のまま。

**ラベル**: 2026-08に導入した「フォーカス中（ホバー/選択）のノードと
その隣接ノードだけラベルを出す」というルール自体は維持しつつ、
記録（一杯の記録）のタイトルだけは常時表示にした。属性ノード
（産地・フレーバー等）は引き続きインタラクション時のみ、フォーカス中の
ノード本人と直接つながる隣接ノードだけに絞る。

**選択中ノードのサイドパネル**: `NodeDetailPanel.jsx`の見出しを、
グラフのノードと同じ塗りつぶし円バッジ（種別色+暗色アイコン）へ揃えた。
中身の構成（属性: 種別・ラベル・記録数・関連記録一覧、記録: 記録日・
評価・メモの抜粋）や、デスクトップ=右固定パネル／モバイル=bottom sheet
という出し分けは変更していない。

**カメラ（既定表示でグラフ全体を画面に収めない）**: 以前は開いた瞬間・
フィルター変更直後に、全ノードが画面へ収まるようカメラを自動フィット
させていた。ノードを大きく塗りつぶす構図（上記）へ変更したことで、
記録数が増えるほど「全部を収める」ためにズームアウトが必要になり、
結局ノード自体も縮小され、間隔も詰まって見える、という問題が生じた
（実データ・61ノードで発覚）。ノード間の間隔を広げる物理定数の調整
だけでは、ノード数が増えるほど原理的に解決しない（間隔を広げるほど
bounding boxが大きくなり、収めるためのズームアウトで結局ノードが縮小
される）と判断し、「グラフ全体を常に画面に収める」という前提自体を
やめた（ユーザーとの相談で決定。参照: Obsidianのグラフビューも既定では
全体フィットしない）。

- 既定表示（フォーカス無し）: ノードがほぼ実寸で見える固定倍率
  （`COMFORTABLE_SCALE`、`GraphCanvas.jsx`）を使い、全ノードの重心を
  画面中央に置く。画面外にはみ出た部分はパン操作で探索する
- フォーカスがある場合（`?focus=`・`GraphNodeSearch`での選択・ノード
  クリックでの再フォーカス）: 従来通り、対象ノード+直接の隣接ノードが
  画面に収まるようカメラを寄せる（「このノードを見たい」という明確な
  意図への応答のため、こちらは維持）

「グラフが育っている感じ」（記録・つながりが増えるほど豊かに見える
演出）は、この変更とは別の関心事として今後検討する（Home画面の
グラフプレビュー`GraphPreview.jsx`が現状その役割の一部を担っている）。

### Stats

これまで記録したコーヒーのふりかえり（docs/features.mdのStats節を参照）。

- Overview（総記録数・平均評価・産地/品種/フレーバーの種類数・
  記録を始めてからの日数）
- 月ごとの記録数の推移
- 評価の分布
- 家とカフェの比較
- 産地・品種・精製方法・フレーバー・カフェの上位ランキング
  （エンティティ詳細ページへのリンク）

2026-09、「ダッシュボード風にしたい・スクロール不要にしたい」という
要望を受け、Artifactモックの承認を経てRecordDetail/EntityDetailと
同じダッシュボード方針で作り直した。以前は「記録のペース」「Collection」
「味の傾向」という3つの縦積み`cardClass`セクションだった。

- **KPIストリップ**: 「記録のペース」（総記録数・平均評価・記録を
  始めてからの日数の3項目）と「Collection」（産地・品種・精製方法・
  農園・カフェ・フレーバーの種類数、6項目）を、見出し・余白の重複を
  削るため「記録の概要」という1つの見出し+1本のKPIストリップ
  （`KpiStrip`/`KpiTile`、components/KpiStrip.jsx。区切り線で分割された
  帯）へ統合した。「Collection」という言語非依存のブランド語としての
  見出しは、この統合に伴い画面上には表示されなくなった（データの
  グルーピング自体、およびAPIレスポンスの`collection`フィールド名は
  変更していない）
- **グラフ2カラム**: 月ごとの記録数・評価の分布を、縦積みではなく
  コンパクトな高さで横並びに常時表示する
- **味の傾向はダッシュボードの唯一の可変領域**: lg以上ではページ自体を
  `lg:h-[calc(100vh-3.5rem)]`でビューポートに収め、KPIストリップと
  グラフは自然な高さのまま、産地・品種・精製方法・フレーバー・カフェの
  ランキング（種別ごとに個別の`cardClass`カードへ分割し、グリッドで
  並べる）だけが残りの高さを埋め、収まらない場合はそのグリッド自体が
  内部スクロールする（RecordDetail/EntityDetailのサイドバー列と同じ
  「保険としてのoverflow-y-auto」の考え方）。lg未満（モバイル）では
  この制約を外し、従来通り縦にスクロールする

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

ノード種別は色だけでなく、アイコンでも判別可能にします。

2026-09、記録ノード・属性ノードの形状を統一した（下記「Graph」節参照。
以前はrecord=円・属性=角丸矩形の2形状で「記録か属性か」を区別していたが、
Q構図（塗りつぶした円）採用に伴いどちらも円になった）。記録と属性の
区別は、サイズ（記録の方が大きい）とアイコン・色で引き続き判別できる。

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

### 値ごとの個別色（origin・flavor）と型共通色（他7種別）の一貫性

産地・フレーバーは`nodeVisuals.js`の型共通色ではなく、値（例:
「Ethiopia」「Berry」）ごとに個別の色を持つ（産地は`originAccent.js`の
`ORIGIN_NAME_TO_HEX`20件、フレーバーは`flavorAccent.js`の
`FLAVOR_NAME_TO_HEX`42件）。残り7種別（farm/variety/process/roastLevel/
cafe/keyword/record）は型共通色のみ。

2026-09、「デザイン・テーマの統一」レビューで、この「値ごとの個別色」が
Graph画面（`GraphCanvas.jsx`・`NodeDetailPanel.jsx`）と一部の記録系画面
（`RecordCard.jsx`・`HomeRecordCard.jsx`）にしか適用されておらず、
Entity Detail・Record Detail・Stats・横断検索・Graphのノード検索欄・
記録詳細の「つながり」図・発見バッジ等では、同じ産地・フレーバーでも
型共通色のまま（＝画面によって色が変わって見える）だったことが分かった
（ユーザーからの指摘、「それ以外にもあるはずです。丁寧に確認してください」）。

この2つの色系統（型共通色・値ごとの個別色）を1箇所から解決する共有
ヘルパー`frontend/src/features/graph/utils/nodeColor.js`
（`getNodeColorHex`/`getNodeSolidBgClass`/`getNodeTintBgClass`/
`getNodeTextColorClass`）を新設し、`{ type, label }`を渡すとorigin・
flavorなら個別色、それ以外は`nodeVisuals.js`の型共通色を自動で返すように
した。以下の箇所をこのヘルパー経由へ統一した:
`EntityDetailPage.jsx`（ヘッダーアイコン・関連属性チップ）、
`RecordDetailPage.jsx`（産地・フレーバー等のリンク付きピル）、
`TopRankingList.jsx`（Statsのランキング行、ドットを新規追加）、
`EntityResultCard.jsx`（横断検索結果）、`GraphNodeSearch.jsx`
（グラフのノード検索欄）、`RecordConnectionsDiagram.jsx`（記録詳細の
「つながり」図）、`GraphCanvas.jsx`・`NodeDetailPanel.jsx`
（既存のGraph画面側も同じヘルパーへ差し替え、二重管理を解消）。

一方、フィールドラベル（`AttributeLabel.jsx`。例:「産地」という項目名
自体のアイコン）、集計件数（`CollectionStats.jsx`・`WorldMapPage.jsx`
の「7/20産地」等）、複数選択の要約（`RecordForm.jsx`のPropertyButton、
選んだ件数や連結した名前のテキストのみ）、装飾的なグラフイラスト
（`GraphPreview.jsx`・`GraphIllustration.jsx`）、フィルター・凡例
（`GraphFilters.jsx`・`GraphLegend.jsx`）は、1つの具体的な値を指して
いない（フィールド名・合計・複数値の集合・非実データ）ため、意図的に
型共通色のまま据え置いている。

2026-09、ユーザーから「records/newページが変更されていない」という
指摘を受けて確認したところ、上記のPropertyButton要約テキストとは別に、
ポップオーバーを開いたときに見える「選択済みタグ」自体（`TagCombo.jsx`。
フレーバー・品種の検索式タグ入力、`RecordForm.jsx`・
`CoffeeComponentFields.jsx`で使用）は、選んだ後の個別の値を示す表示に
もかかわらず無色（`bg-surface-2`固定）のままだったことが分かった。
これはPropertyButtonの要約とは性質が異なり、記録カード等と同じ
「1つの具体的な値の表示」に当たるため、型共通色・個別色の対象に含める
べき見落としだった。`TagCombo`が呼び出し側から`type`（ノード種別）を
受け取り、`nodeColor.js`経由で選択済みタグへ色を付けるよう修正した
（フレーバーは個別色、品種は型共通色になる）。

あわせて、この2画面のバッジは他画面（Graph・NodeDetailPanel・記録カード）
と異なる旧スタイル（薄い塗り+種別共通アイコン色）のまま残っていたため、
`DiscoveryBadge.jsx`・`SaveDiscoveryReveal.jsx`のバッジも「塗りつぶした
円+暗色（`text-on-inverse`）アイコン」という新スタイルへ揃えた
（`getNodeSolidBgClass`を使用）。

2026-09、「records詳細ページのグラフプレビューが実際のグラフのデザインと
異なる」という指摘を受けて確認したところ、`RecordConnectionsDiagram.jsx`
（記録詳細の「つながり」図）は上記の色ヘルパー移行（アイコン色のみ）は
済んでいたが、ノードの見た目自体（輪郭線+小さい色付きアイコン、
`bg-surface-1`の中立背景）とエッジの色（`stroke-surface-2`の一律グレー）
は、GraphCanvas.jsx・NodeDetailPanel.jsxの2026-09の作り直し（「Graph」
節参照。塗りつぶし円+暗色アイコン、つながる属性ノードの色を帯びた
エッジ）に追随できていなかったことが分かった。ノードは
NodeDetailPanel.jsxと同じ塗りつぶし円バッジ（`getNodeSolidBgClass`+
`text-on-inverse`）へ、エッジはGraphCanvas.jsxの`edgeColor()`
（record⇔属性の2端点のうち属性側ノードの色を使う）と同じロジックへ
揃えた。フレーバーの幹（中心→trunk）だけは複数のフレーバーで共有する
特定の値を持たない線のため、値ごとの個別色ではなく型共通色にフォール
バックする（`recordConnectionsLayout.js`の各edgeに`type`/`label`を
追加し、`RecordConnectionsDiagram.jsx`側で色を解決する形にした）。

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

知識グラフのノード種別カラーは、2026-09の「グラフを直接操作している
体験」の作り直しに伴い、当時Discover・WorldMapLegend・OverviewStats・
Diagnosisのarchetype色と共有していた旧`--color-accent-*`（Catppuccin
Mochaの9色）から独立した専用9トークン（`--color-graph-*`）へ切り出した
上で値も刷新した（「Graph」節・`GraphCanvas.jsx`参照）。グラフの見た目を
変えるたびに、共有している他画面の配色まで変わってしまうのを避けるための
分離だった。

2026-09、「デザイン・テーマの統一」レビューで、上記の分離が裏目に出て
「画面によって同じ概念（record・origin等）の色が違う」という矛盾を
生んでいたことが分かった（ユーザーからの指摘: 「デザインや、テーマに
ページによって差があります。統一させるべきでは？graphを作り込んだ際の
ことを思い出してください。それをベースにします。」）。Discover・
WorldMapLegend・Diagnosis（archetypeVisuals.js、下記「元のスロット対応」
参照）を、`--color-graph-*`を直接参照する形へ移行し、参照元が無くなった
旧`--color-accent-*`（9色）自体を削除した（OverviewStats.jsxは元々
`getNodeVisual("record")`経由で既に`--color-graph-record`を参照していた
ため対応不要だった）。archetypeVisuals.jsは元々「どのノード種別の色に
寄せたか」という対応（fruity→flavor、light→origin等）をコメントで明記
していたため、対応する`--color-graph-*`へ機械的に差し替えるだけで済んだ
（見た目の色自体は変えていない。`--color-graph-*`の9色は元々
`--color-accent-*`の同じ9スロットを踏襲して新設したため）。

産地アクセントバー（`features/coffee-records/utils/originAccent.js`の
`getOriginAccentClass`/`getOriginHex`）は、上記のいずれとも独立した
20産地ぶんの個別対応表（`ORIGIN_NAME_TO_HEX`）で管理している
（ハッシュ割り当てではなく手動の決め打ち。詳細はファイル内コメント参照）。
`primary`と`danger`は他の箇所で意味を持たせているため、いずれのパレットからも
意図的に除外している。

同じ考え方で、フレーバーのアクセント色（`features/coffee-records/utils/
flavorAccent.js`の`getFlavorAccentClass`/`getFlavorHex`）も、
`backend/seeds/data/flavors.js`の42種ぶんの個別対応表
（`FLAVOR_NAME_TO_HEX`）を独立して持つ（2026-09新設。詳細は「Records」・
「Graph」節参照）。産地・フレーバーのどちらも、キーワードやブランド
イメージから連想される色を手動で割り当てている（産地は地域ごとの
色相グループ、フレーバーは個々の単語からの連想）。

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
