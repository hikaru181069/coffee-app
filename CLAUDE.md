# CLAUDE.md

## Project

このプロジェクトは、自社開発スタートアップの長期インターン応募に使用する、
学習用・ポートフォリオ用のコーヒー体験記録アプリです。

プロダクトの目的・仕様・技術方針は、以下のドキュメントを参照してください。

- @docs/vision.md
- @docs/product-principles.md
- @docs/mvp.md
- @docs/design.md
- @docs/domain-model.md
- @docs/database.md
- @docs/knowledge-graph.md
- @docs/insights.md
- @docs/search.md
- @docs/entity-detail.md
- @docs/architecture.md
- @docs/api.md
- @docs/implementation-plan.md
- @docs/mlb-legacy-inventory.md

方向性や仕様を変更する場合は、CLAUDE.mdへ詳細を追加せず、
責務に対応するdocsファイルを更新してください。

## Core Experience

中心体験は次の循環です。

Record → Connect → Discover
（記録する → 知識グラフが育つ → 発見する）

すべての機能は、この循環のどこを改善するか説明できる必要があります。

## Development Priorities

以下の順に優先してください。

1. 正しく動作すること
2. ユーザーが迷わないこと
3. 可読性・保守性
4. 面接で説明できる設計
5. 将来拡張しやすいこと

過度な抽象化、過剰設計、MVPに不要な汎用化は避けてください。

## Existing MLB App Reuse

既存の mlb-app の構成を土台として再利用します。

再利用候補:

- React + Viteの基本構成
- Expressの認証・JWT・middleware
- MongoDB接続
- routes → controllers → services → models の分割
- FastAPIサービスとの通信構成
- 環境変数
- Docker Compose
- Vercel / Render / MongoDB Atlasへのデプロイ構成
- ローディング、エラー表示、Protected Routeなどの共通UI

ただし、MLB固有の命名・データモデル・推薦ロジック・画面はコピーしないでください。
再利用するコードは、コーヒードメインに合わせて命名と責務を見直してください。

## Architecture Boundary

### frontend

担当:

- 画面表示
- フォーム入力
- クライアント側の軽量な状態管理
- Express APIとの通信
- 知識グラフの描画

禁止:

- DBへ直接接続する
- ドメイン上重要な整合性判定をUIだけで完結させる
- FastAPIへ直接アクセスする

### backend

担当:

- 認証・認可
- MongoDBへのアクセス
- CoffeeRecordなどのCRUD
- マスターデータのCRUD・検索
- 入力検証
- FastAPIへのデータ受け渡し
- APIレスポンスの統一

構成:

routes → controllers → services → repositories/models

controllerを肥大化させず、業務処理はserviceへ置いてください。

### fastapi-service

MVPでは原則として最小限にします。

担当候補:

- 知識グラフ用ノード・エッジの導出
- 将来の味覚分析
- 類似度計算
- 推薦・統計処理

禁止:

- MongoDBへの直接アクセス
- 認証処理
- CoffeeRecordのCRUD

MVPの単純なグラフ変換はExpressでも可能ですが、
将来の分析機能との境界を明確にするためFastAPIへ置く場合は、
目的・入出力・必要性を実装前に説明してください。

## Code Organization

1ファイルへ複数の責務を集中させないでください。

### frontend

- pages: ルート単位の画面
- features: 機能単位のUI・hooks・API
- components: 複数機能で共有するUI
- services または lib: APIクライアント等
- utils: 純粋な補助関数

pageコンポーネントにAPI通信、フォーム状態、変換ロジック、
巨大なJSXをすべて置かないでください。

### backend

- routes: URLとmiddlewareの接続
- controllers: request/responseの変換
- services: ユースケース・業務処理
- repositories: DB問い合わせの抽象化
- models: MongoDBスキーマ
- validators: 入力検証
- middleware: 認証・エラー処理

### fastapi-service

- routers: HTTP境界
- schemas: Pydantic入出力
- services: ユースケース
- core: グラフ・分析などの純粋ロジック
- tests: ロジックとAPIのテスト

## Before Implementation

各実装プロンプトを開始したら、コード変更前に次を提示してください。

- 実装対象
- なぜ今実装するのか
- 再利用するmlb-appのコード
- 新規作成・変更予定ファイル
- データの流れ
- 影響範囲
- テスト方法

大規模変更では専用branchを作成してください。

ユーザーから実装開始の明示的な依頼がある場合、
同じ内容を再確認するだけの質問はせず、上記を説明してから着手してください。

## Implementation Rules

- 既存コードを確認してから変更する
- 動作している認証を不要に書き換えない
- 既存APIの互換性を理由なく壊さない
- UIとAPIで用語を統一する
- MongoDBのObjectIdを文字列として扱う境界を明確にする
- userIdはリクエスト本文ではなく認証情報から取得する
- 所有者確認なしで記録を更新・削除させない
- エラーを握りつぶさない
- console.logを最終成果物へ大量に残さない
- 秘密情報をコミットしない
- 不明点を推測で大きく実装せず、docsとの矛盾を報告する

## Testing

最低限、変更範囲に応じて以下を実行してください。

### frontend

- npm run lint
- npm run build

### backend

- npm run test

### fastapi-service

- pytest

テストが未整備の場合は、主要正常系と重要な異常系を追加してください。

## Completion Report

実装完了時は以下を報告してください。

- 実装内容
- 変更ファイル
- データフロー
- 実行したテストと結果
- 未解決事項
- 次に実装すべき最小単位

上記は口頭・チャットでの報告だけで終わらせず、`IMPLEMENTATION.md`の
Post-MVPセクションにも日付付きで追記してください（Gitで追跡している
実装履歴。何を直したかを後から思い出せるようにするためのもの）。
「未解決事項」「次に実装すべき最小単位」は最新の状態に上書きしてください。

## Explanation Style

初学者が面接で説明できる水準を意識し、次を説明してください。

- なぜその責務分割にしたか
- リクエストからDB・レスポンスまでの流れ
- 各ファイルの役割
- 代替案と採用しなかった理由
- 将来機能をどこへ追加するか

専門用語は使用して構いませんが、最初に平易な意味を添えてください。
