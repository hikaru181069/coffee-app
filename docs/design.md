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

Diagnosisページ（`/diagnosis`）は上記に含めない。ナビ項目は4つ
（Home/Records/Graph/Stats。Profileは別枠）と少なく保つ方針のため
（`frontend/src/components/Navbar.jsx`参照）、Home画面・Statsページからの
リンク経由でのみ到達する画面にしている（Entity Detailページと同じ扱い）。

## Screens

### Landing

未ログインの訪問者が最初に見る、`/landing`の公開ページ。Main Navigationの対象外（ログイン後はHomeへ遷移するため表示されない）。

目的:

- プロダクトの世界観（Record → Connect → Discover）を一目で伝える
- 他のジャーナル型・SNS型アプリとの違い（知識グラフでつながる点）を伝える
- Get Startedへの導線を作る（primary actionは1つ）

構成例:

- ミニナビ（ロゴ、言語切り替え、Login）。Get StartedはナビのすぐScroll先のHeroに既にあるため重複させない
- Hero（見出し、Get Started CTA、装飾的な知識グラフのイラスト）
- How it works（Record → Connect → Discoverの3ステップ説明）
- Your Knowledge Graph（知識グラフの視覚的なイメージ。実データではなく固定サンプル）
- Why Coffee App?（他のジャーナル型アプリとの比較）
- 末尾のGet Started CTA（Heroと同じ導線の再掲）

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

最初に見せる項目:

- title
- consumedAt
- recordType
- rating
- notes

Coffee Detailsとして段階的に見せる項目:

- origin
- farm
- variety
- process
- roastLevel
- flavors
- cafeName
- roasterName
- 味覚グラフ（甘み・苦み・酸味・コク・香り・後味、それぞれ1〜5、任意）

### Record Detail

- 基本情報
- Coffee Details
- 味覚グラフ
- Notes
- 関連ノード
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
- 空状態には次の行動を示す
- グラフ画面にも凡例を置く
- モバイルではグラフ詳細をbottom sheetまたは下部パネルにする

## Graph Visual Semantics

ノード種別は色だけでなく、ラベルまたは形状でも判別可能にします。

例:

- record: card/circle
- origin: globe
- farm: leaf
- variety: seed
- process: droplets
- roastLevel: flame
- flavor: sparkle
- cafe: store
- keyword: quote

具体的なアイコンライブラリは既存依存関係を確認して決定してください。
