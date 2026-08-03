# Implementation Summary

`coffee-app-claude-kit/` の実装計画（Phase 0〜6）に沿って完了した実装内容のまとめ。
プロダクトの仕様は `docs/` を正とし、このファイルは「何を・どういう順で・どう実装したか」の記録。

2026-08から、修正した箇所を忘れないための実装履歴としてGitで追跡している
（以前は`.gitignore`対象だったが、変更履歴自体をGitで守るために外した）。
MVP完成（Phase 0〜6、2026-07-31時点）までは下記「実装内容（Phaseごと）」
「変更ファイル（現在の構成）」がその時点のスナップショット。それ以降の変更は
「Post-MVP」に日付順で追記していく。

---

## 実装内容（Phaseごと）

### Phase 0: Repository Bootstrap
mlb-appをリポジトリの土台としてそのまま取り込み、coffee-app向けに最小限の名称変更を行った。

- mlb-appのソース一式をコピーし、CommonJS → ES Modules（backend）へ移行
- プロジェクト名を mlb-app → coffee-app へ変更（`package.json`、READMEなど）
- `.env.example` を実際に使う変数に合わせて整理、`.gitignore` を強化
- `CLAUDE.md` / `docs/*.md` / `prompts/*.md` をルートへ配置
- MLB固有機能はこの時点では削除せず、`docs/mlb-legacy-inventory.md` に棚卸しリストとして記録するに留めた（Phase 6で削除）

### Phase 1: Domain Foundation
CoffeeRecordとマスターデータのモデル層を新規設計。

- `backend/models/CoffeeRecord.js`、`Origin.js` / `Variety.js` / `Process.js` / `RoastLevel.js` / `Flavor.js`
- `backend/repositories/coffeeRecordRepository.js`、`masterDataRepository.js`（Mongooseクエリの抽象化）
- `backend/validators/coffeeRecordValidator.js`（入力検証）
- `backend/utils`: name正規化・ObjectId変換ユーティリティ
- `backend/seeds/seedMasterData.js` + `seeds/data/*.js`（origins/varieties/processes/roastLevels/flavorsの初期候補、`$setOnInsert`によりべき等）

### Phase 2: Coffee Record API
CoffeeRecordのCRUD APIと所有者確認を実装。

- `backend/controllers/coffeeRecordController.js` / `masterDataController.js`
- `backend/services/coffee/coffeeRecordService.js`（populate対応）、`coffeeRecordSerializer.js`
- `backend/routes/coffeeRecordRoutes.js` / `masterDataRoutes.js`
- `backend/middleware/authenticate.js`（JWT検証 → `req.user`）、`errorHandler.js`（`docs/architecture.md`のエラー形式に統一）
- `backend/validators/coffeeRecordQueryValidator.js`（一覧のフィルター・ページネーション）
- mongodb-memory-serverを使ったAPIテスト（他ユーザーの記録へアクセスできないことを含む）

### Phase 3: Record UI
記録のCRUD画面をfeature単位で実装。

- `frontend/src/features/coffee-records/api/`: `coffeeRecordApi.js` / `masterDataApi.js` / `httpClient.js`
- `frontend/src/features/coffee-records/hooks/`: `useCoffeeRecords` / `useCoffeeRecord` / `useMasterData` / `useRecordForm`
- `frontend/src/features/coffee-records/components/`: `RecordCard` / `RecordForm` / `RecordFilters` / `ChipMultiSelect` / `RatingInput` / `ConfirmDialog` / `FormField` / `RecordListStates`
- `frontend/src/pages/`: `RecordsPage` / `RecordFormPage`（新規・編集共用） / `RecordDetailPage`
- loading / empty / error 状態、削除確認ダイアログを実装

### Phase 4: Knowledge Graph API
CoffeeRecordから知識グラフを都度導出するAPIを実装。グラフ専用コレクションは作らない設計（`docs/database.md`参照）。

- `backend/core/graph/graphBuilder.js`（DB/HTTPに依存しない純粋関数。ノード重複排除・エッジ生成）、`nodeId.js`（`record:{id}`形式のstable ID生成）
- `backend/services/coffee/graphService.js`（関連記録の取得を含む）
- `backend/validators/graphQueryValidator.js`（nodeTypes / recordType / dateFrom / dateTo / ratingMin）
- `backend/controllers/graphController.js`、`backend/routes/graphRoutes.js`
- APIテストで期待するnodes/edges/summaryを検証

### Phase 5: Knowledge Graph UI
グラフ描画ライブラリにReact Flow（`@xyflow/react`）+ d3-forceを採用し、画面を実装。

- `frontend/src/features/graph/api/graphApi.js`
- `frontend/src/features/graph/adapters/`: `reactFlowAdapter.js`（APIレスポンス→React Flow形式への変換）、`forceLayout.js`（d3-forceによる座標計算。データ変更時に一度だけ収束させ、常時シミュレーションはしない）
- `frontend/src/features/graph/components/`: `GraphCanvas` / `GraphFilters` / `GraphLegend` / `NodeDetailPanel` / `GraphStates` / `nodeTypes/RecordNode` / `nodeTypes/AttributeNode`
- `frontend/src/features/graph/hooks/`: `useGraph` / `useNodeDetail`
- `frontend/src/pages/GraphPage.jsx`（`App.jsx`でlazy import）
- 記録詳細画面とGraph画面の相互遷移、ノード種別ごとのアイコン・形状による判別（`docs/design.md`）

### Phase 6: Portfolio Quality
MLB固有コードの削除と、ポートフォリオとして仕上げるための整理。

- **バックエンド削除**: MLB関連のcontrollers 16 / routes 16 / models 3、`services/mlb/`（17）、`services/recommendations/`（6）、`mlbApiService.js` / `recommendationService.js` / `interactionService.js` / `cacheService.js`（Redis） / `fastApiService.js`、`uploadMiddleware.js`、旧`authMiddleware.js`（`authenticate.js`へ統合済み）、`data/`配下のCSV、`seedPlayers.js`
- **バックエンド整理**: `User.js`からMLB固有フィールド（favoriteTeam等）を削除、`userController.js`を account設定用に書き換え（`getMe` / `updateProfile` / `changePassword` / `deleteAccount`。退会時に本人のCoffeeRecordも削除）
- **FastAPI削減**: `docs/architecture.md`の方針通り、知識グラフの変換はExpress内の純粋関数（`backend/core/graph`）で行うため、FastAPIはヘルスチェックのみの最小構成へ（`archetype` / `compare` / `discover` / `matchup` / `preference` / `recommend` / `scouting` / `similar` の各routerと`math_utils.py`を削除）
- **フロントエンド削除**: MLB関連のpages 24 / `services/api/*.js` 16 / components 16、`mlbTeams.js` / `teamColors.js` / `archetypeColors.js`、未使用の`text.jsx`、MLBのスクリーンショット・ヒーロー画像
- **フロントエンド書き換え**: `HomePage.jsx`（最近の記録 + 新規記録CTA + Graphへの導線）、`ProfilePage.jsx`（名前変更・パスワード変更・退会の最小構成）、`LandingPage.jsx`（Record→Connect→Discoverの3ステップ説明）、`Navbar.jsx` / `BottomTabBar.jsx`（Home/Records/Graph/Profileの4項目に整理）、`App.jsx`（ルート定義を実装済み画面のみに縮小）
- **デモデータ**: `backend/seeds/seedDemoData.js` + `seeds/data/demoRecords.js`（デモユーザー1件・記録15件。産地・フレーバーが記録をまたいで重なるよう手動で作成し、グラフ画面でクラスタが見える状態を用意。べき等）
- **README**: プロダクト説明・セットアップ・アーキテクチャ・データモデル・設計判断を含む最終版へ全面書き換え
- **最終lint修正**: JSXタグ名としてのみ使う関数パラメータ分割代入が`no-unused-vars`に誤検出される問題を、分割代入を関数本体側へ移すことで回避（`BottomTabBar.jsx` / `Navbar.jsx` / `LandingPage.jsx`）。`ToastContext.jsx`はProvider/hook同一ファイル構成のため該当行のみ`react-refresh/only-export-components`を無効化

---

## Post-MVP

MVP完成後、日付順に追記する。バックエンド変更を伴わない場合はfrontendのlint/buildのみ実行。

### 2026-08: 国際化（i18n）

react-i18next + i18next-browser-language-detectorでja/en切り替えを追加。branchを切って実装しmainへmerge。

- `frontend/src/i18n/index.js`、`locales/ja.json` / `en.json`（localStorage永続化、ブラウザ言語フォールバック）
- `components/LanguageSwitcher.jsx`をNavbar・LandingPageへ組み込み
- `utils/errorMessage.js`の`getErrorMessage(error, t)`: 新形式のAPIエラー（`error.code`）と、旧mlb-app由来のauth/userコントローラが返す固定英語文字列の両方を翻訳（バックエンドは変更しない前提）
- 主要ページ・コンポーネント約24ファイルに`useTranslation`を適用
- ナビゲーションラベル（Home/Records/Graph/Profile）・認証ボタン（Login/Register）・LandingPageの「Record/Connect/Discover」表記は翻訳対象外のまま統一（もともと言語非依存のブランド表現として設計されているため）

### 2026-08: Homeのデザイン刷新（Figma）

ユーザー自身がFigmaでHome画面をデザインし、それを実装へ反映。branchを切って実装しmainへmerge。

- `pages/HomePage.jsx` / `features/coffee-records/components/HomeRecordCard.jsx`を刷新。産地・銘柄・精製方法・フレーバーを優先表示し、日付・記録タイプはRecordsPage/RecordDetailPage側に残す（情報は失われない）
- `utils/originAccent.js`: 産地名のDJB2ハッシュから9色のアクセントカラーを決定的に選ぶ（`ctp-blue`/`ctp-red`はプライマリ操作・エラー用に予約のため除外）。バックエンドにOrigin.colorのようなフィールドを追加せず、フロントエンドのみで完結させた

### 2026-08: プロダクト方針の明文化

コーヒー記録アプリの競合が多いことを踏まえ、「知識グラフが育つ」体験と「Linear/Obsidianのような道具」という差別化軸を明文化。docsのみの変更のためbranchは切らずmainへ直接commit。

- `docs/vision.md`: Core Experienceの説明とProduct Identityを更新
- `docs/product-principles.md`: 「グラフはユーザーが作るものではなく、記録の副産物として育つもの」を追記
- `docs/design.md`: Design ConceptにLinear/Obsidian参照と反SNS・反フィード型の方針を追記
- `CLAUDE.md`: Core Experienceの矢印表現を「記録する → 知識グラフが育つ → 発見する」へ更新
- `prompts/design/00-design-principles.md`に「6. UI Definitions」を新設。色（`ctp-*`はLinear本番CSSから取得した値で、変数名のみmlb-app由来。Catppuccinとは無関係）・タイポグラフィ（Inter中心、5段階のタイプスケール）・アイコン（lucide-react、3段階のサイズ）・角丸/余白（3段階の角丸、4pxグリッド）・影（`box-shadow`は浮いている要素のみ）・モーション（150ms基準、200〜300msは構造的な動きのみ）を、Home実装の実測値とLinearの特徴から定義

### 2026-08: 知識グラフのミニプレビュー、Home追加調整

Homeの評価から「知識グラフが育つ」実感をHome自体で見せる方向へ。branchを切って実装しmainへmerge。

- `features/graph/components/GraphCanvas.jsx`に`interactive`プロップを追加（既定`true`で従来通り。`false`でドラッグ・ズーム・パン・Controlsを無効化）
- `features/graph/components/GraphPreview.jsx`新設: Home下部にクリックで`/graph`へ遷移する縮小グラフカードを追加。react-flowは`lazy`/`Suspense`で読み込み、Home（非lazyページ）のバンドルへ混入させない（メインバンドルが176KB→91KB gzipに縮小したことをビルドログで確認）
- `pages/HomePage.jsx`: 記録が既にあるリピーターはCTAを大きいパネルから小さいボタンへ縮小し、下部の文字だけのバナーを`GraphPreview`へ差し替え
- `features/coffee-records/components/HomeRecordCard.jsx`に評価(★)を復活（`docs/design.md`のInformation Hierarchyで「②評価と感想」は「③つながり」より優先度が高いため）

### 2026-08: タイポグラフィ（Space Mono）

UI定義で決めた「数値・日付・件数はSpace Mono、見出し・本文はInterのまま」をコードへ反映。同じbranchへ追加でcommitしmainへmerge。

- `frontend/src/index.css`の`@theme`に`--font-mono: "Space Mono", monospace`を追加
- 評価の数字（`HomeRecordCard` / `RecordCard` / `RecordDetailPage` / `NodeDetailPanel`）、日付表示（`formatConsumedAt`系の出力全体）、グラフの件数（`AttributeNode`のノード内バッジ、`NodeDetailPanel`の「Appears in N records」）に`font-mono`を適用
- `graph.appearsInCount`は数字が文中に埋め込まれる翻訳文字列のため、react-i18nextの`Trans`コンポーネントへ書き換え、`<mono>{{count}}</mono>`という形でロケールJSON側にマークアップを追加し、数字部分だけmono化した

### 2026-08: Homeカードの空状態ヒント + バグ修正

Homeの評価で「産地・品種・精製方法・フレーバーが1つも無い記録は、知識グラフにノード・エッジを一切生まないのに、カードが空白のまま何も示さない」問題を指摘され修正。mainへ直接commit。

- `HomeRecordCard.jsx`: `!hasCoffeeDetails(record)`のとき、`RecordDetailPage.jsx`と同じ`records.detailEmptyHint`（「産地やフレーバーを追加すると、ほかの記録とのつながりが見えるようになります。」）を表示
- `utils/recordFormat.js`の`hasCoffeeDetails()`のバグを修正。`collectCoffeeDetails(record)`を`t`引数無しで呼んでおり、実際に使うと`t is not a function`で例外になる状態だった（呼び出し箇所が無かったため未発覚）。ラベル文言に依存せず、値の有無だけを直接判定する形へ書き換えた

---

## 変更ファイル（現在の構成）

MVP完成（2026-07-31）時点のスナップショット。Post-MVPで追加・変更したファイルは上記の各エントリを参照。

```text
backend/
├── controllers/    authController, userController, coffeeRecordController,
│                   masterDataController, graphController
├── routes/         authRoutes, userRoutes, coffeeRecordRoutes,
│                   masterDataRoutes, graphRoutes
├── services/coffee/ coffeeRecordService, coffeeRecordSerializer,
│                    masterDataService, masterDataSerializer, graphService
├── core/graph/     graphBuilder, nodeId   （DB/HTTP非依存の純粋関数）
├── repositories/   coffeeRecordRepository, masterDataRepository
├── models/         User, CoffeeRecord, Origin, Variety, Process,
│                   RoastLevel, Flavor
├── validators/     coffeeRecordValidator, coffeeRecordQueryValidator,
│                   graphQueryValidator, recordFilterValidator
├── middleware/     authenticate, errorHandler
└── seeds/          seedMasterData, seedDemoData, run, runDemo, data/*

frontend/src/
├── pages/          HomePage, LandingPage, LoginPage, RegisterPage,
│                   RecordsPage, RecordFormPage, RecordDetailPage,
│                   GraphPage, ProfilePage
├── features/coffee-records/  api, hooks, components, validation, utils
├── features/graph/           api, adapters, components, hooks, utils
├── components/     Navbar, BottomTabBar, ProtectedRoute, ErrorCard,
│                   SkeletonCard, PageHeader, SearchInput
├── contexts/       ToastContext
└── services/api/   authApi, userApi

fastapi-service/    main.py（ヘルスチェックのみ）、tests/test_health.py

docs/, prompts/     仕様・実装計画（変更なし。実装はこれらに従う形で進行）
```

削除したMLB固有コードの一覧は `docs/mlb-legacy-inventory.md` に記録済み。

---

## データフロー

### 記録作成（Create CoffeeRecord）
```text
RecordFormPage
  → coffeeRecordApi.create()
  → POST /api/coffee-records
  → authenticate（JWT検証 → req.user）
  → coffeeRecordValidator
  → coffeeRecordController.create
  → coffeeRecordService.create（userIdはreq.userから設定。bodyのuserIdは信用しない）
  → CoffeeRecord repository
  → MongoDB
  → coffeeRecordSerializer
  → frontend
```

### 知識グラフ取得（Get Graph）
```text
GraphPage
  → graphApi.getGraph()
  → GET /api/graph
  → authenticate
  → graphQueryValidator
  → graphController
  → graphService（自分のCoffeeRecordを取得し、マスターデータをpopulate）
  → core/graph/graphBuilder（純粋関数。ノード重複排除・エッジ生成・summary集計）
  → response
  → features/graph/adapters（React Flow形式へ変換 + d3-forceで座標計算）
  → GraphCanvas描画
```

グラフ専用のコレクションはMongoDBに持たず、CoffeeRecordとマスターデータからリクエストのたびに導出する（理由: `docs/database.md`）。

---

## 実行したテストと結果（最終確認時点）

| コマンド | 結果 |
| --- | --- |
| `cd backend && npm test` | Test Suites: 12 passed, Tests: 226 passed |
| `cd frontend && npm run lint` | エラーなし |
| `cd frontend && npm run build` | ビルド成功 |
| `cd fastapi-service && pytest` | 1 passed |

`main`へのマージ後、上記4コマンドを再実行し、いずれも同じ結果であることを確認済み。

Post-MVPの各エントリはfrontend/docsのみの変更のため、都度`cd frontend && npm run lint && npm run build`のみ実行し、エラー無しを確認している（backend/fastapi-serviceに変更が及ぶ場合は、その回のみ該当テストも実行する）。

---

## 未解決事項

- FastAPIサービスは現状ヘルスチェックのみで、コーヒードメインの実処理を持たない（`docs/architecture.md`の方針通りの意図的な状態であり、バグではない）
- 知識グラフの`dateFrom` / `dateTo`フィルターはAPI・純粋関数側には実装済みだが、フロントエンドのフィルターUIには未反映
- `GraphPreview`のサムネイルは全ノード・全エッジをそのまま縮小描画しているため、160px四方では形が読み取りづらい（要検討: ノードを間引く、密度に応じてズームを調整するなど）
- Homeのフッター（技術バッジ・`Built by Hikaru`表記）がログイン後の全ページに出ており、ポートフォリオとしての説明責任と「静かな道具」というプロダクト方針がせめぎ合っている（要判断）
- Space Monoは評価・日付・グラフの件数にのみ適用済み。`RecordsPage`の件数表示（`records.countLabel`）など、他の数値表示への適用可否は未判断

## 次に実装すべき最小単位

MVPの完了条件（`docs/mvp.md`）は満たしているため、次に着手する場合の候補（優先度順）:

1. `GraphPreview`のサムネイル密度を改善する（間引き・ズーム調整など、フロントエンドのみの変更で完結する）
2. Homeフッターの扱いを決める（Landing限定にする／簡素化するなど）
3. Graph画面のフィルターUIに`dateFrom` / `dateTo`を追加する（バックエンドは実装済み）
4. 記録詳細画面に「関連ノード」を直接埋め込む（現状はGraph画面への遷移のみ）
5. デプロイ設定の確認（Vercel / Render / MongoDB Atlas）とスクリーンショットの追加
