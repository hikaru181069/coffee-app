# MVP Scope

## Goal

認証済みユーザーがコーヒー体験を記録し、
記録とコーヒー要素のつながりを知識グラフで探索できる状態を作る。

## In Scope

### Authentication

- 新規登録
- ログイン
- ログアウト
- 認証状態の維持
- Protected Route

既存mlb-appの認証構成を優先して再利用します。

### Coffee Records

- 記録一覧
- 記録作成
- 記録詳細
- 記録編集
- 記録削除

記録タイプ:

- home
- cafe

主要項目:

- title
- consumedAt
- recordType
- rating
- notes
- cafeName（カフェ記録のみ任意）
- roasterName（任意）
- origin
- farm
- variety
- process
- roastLevel
- flavors

### Knowledge Graph

- 自分のCoffeeRecordを起点としたグラフ
- 記録ノード
- 産地、農園、品種、精製、焙煎、フレーバーの属性ノード
- ノード選択
- 関連記録の表示
- 基本フィルター
- グラフから詳細画面への遷移

### Master Data

MVPでは以下の初期候補を用意します。

- origins
- varieties
- processes
- roastLevels
- flavors

farmはデータ不足が想定されるため、任意入力または候補＋自由入力を許容します。

## Out of Scope

- AI推薦
- 自然言語による味覚分析
- 世界地図
- SNS・フォロー
- 公開プロフィール
- カフェ口コミ
- EC連携
- 高度な抽出レシピ管理
- 画像認識
- リアルタイム共同編集
- 管理画面
- 完全なオフライン対応

## MVP Completion Criteria

- ユーザーAの記録をユーザーBが閲覧・編集・削除できない
- 記録の作成・閲覧・編集・削除が完了する
- 必須項目のバリデーションがある
- 記録した要素がグラフへ反映される
- ノードから関連する記録を確認できる
- レスポンシブな主要画面がある
- frontend build、backend test、FastAPI testが成功する
- READMEだけでローカル起動できる
