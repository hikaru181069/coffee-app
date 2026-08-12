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

## Screens

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

### Record Detail

- 基本情報
- Coffee Details
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

具体的なアイコンライブラリは既存依存関係を確認して決定してください。
