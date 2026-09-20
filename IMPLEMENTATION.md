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

### 2026-08: 知識グラフをObsidian風にする試み → React Flowを断念しreact-force-graph-2dへ全面置き換え

「Obsidianのような動的で見やすいグラフにしたい」という相談から始まった一連の作業。まず`feat/graph-dynamic-visuals`ブランチでReact Flow + 自前d3-force統合のまま以下を実装した:

- ホバー中のノードの直接のつながりだけを目立たせる機能
- ノードの次数（つながりの数）に応じたサイズの動的化
- ドラッグへの物理反応（d3-forceの`alphaTarget`再加熱パターン）
- 開いた瞬間にノードが中心から広がって収束するアニメーション

しかし実機確認のたびに「しばらく表示されない」「ドラッグ中にちらつく」「動きが伝わらない」という指摘が続いた。原因はドラッグ再加熱中もカメラ（fitView）を動かしていた／座標更新がReact Flow自身のドラッグ描画と競合していたことで、2回修正を試みたが解消しきれず、ユーザーの判断で**ライブラリごと置き換え**ることになった。`feat/graph-dynamic-visuals`は未マージのまま放棄し、`main`から新しく`feat/graph-force-graph-2d`ブランチを切って、canvas描画・物理演算を内蔵した専用ライブラリ`react-force-graph-2d`へ全面的に書き換えた。

- `@xyflow/react`を削除、`react-force-graph-2d`を追加（`d3-force`はカスタム力の追加用に直接依存として再導入）
- `GraphCanvas.jsx`を全面書き換え。ノード描画は`nodeCanvasObject`で自前実装（円=record、角丸四角=attribute）。新設`utils/canvasIcons.js`でlucide-reactの実際のSVG pathデータからcanvas描画用のアイコン画像を生成・キャッシュ（GraphLegendと同じアイコンセットを維持するため）。`utils/nodeVisuals.js`に`canvasColor`（実際の16進カラー、Tailwindのcolor-*クラスはcanvasで使えないため）を追加
- `reactFlowAdapter.js` / `forceLayout.js` / `nodeTypes/`（React Flow固有のコード）を削除。`GraphPreview.jsx` / `GraphPage.jsx`から`ReactFlowProvider`を除去
- 背景の点グリッドを廃止（単色背景。「最悪」と指摘されたため）
- 開いた瞬間の収束アニメーション・ドラッグへの物理反応・ホバー強調はいずれもライブラリ標準機能で実現でき、自前の`useLiveForceLayout`は不要になった
- 副産物: `main.jsx`にトップレベルの`AppErrorBoundary`を新設。この移行作業中に依存関係の読み込み不備でGraphPageのレンダーが丸ごと落ち、エラーバウンダリが1つも無かったため画面全体が手がかりの無い真っ黒な状態になった経験から追加した
- 移行の途中、実際に踏んだ実装ミス2件: ①`d3Force`のカスタム力設定エフェクトが`[nodes, links]`だけに依存しており、初回レンダー（`size`がまだ0で`ForceGraph2D`が未描画）のタイミングでは`fgRef.current`がnullのため何もできず、以降二度と実行されないバグ（`size.width/height`も依存配列に追加して修正）。②`main.jsx`の編集を往復した際に`import { StrictMode }`が重複しVite/oxcのパースエラーで画面が壊れた（見落としに気づくまで時間を要した）

### 2026-08: react-force-graph-2dのズーム・ドラッグ・クリック不具合を解決

上記の置き換え後、ユーザーが実機で確認したところ「拡大できません。ドラッグできません。ノードが小さすぎて情報がわかりません。」と報告。`force-graph`本体（`node_modules/force-graph/dist/force-graph.mjs`）をDocker内で直接読み、原因を特定した。

**ズーム・ドラッグが効かない原因**: `width`/`height` propの`onChange`が`adjustCanvasSize`を呼び、その中で`state.zoom.translateBy(...)`を実行する。これはd3-zoomの`'zoom'`ハンドラを発火させ、`state.isPointerDragging = true`を立てる副作用を持つ。`GraphCanvas.jsx`は`ResizeObserver`で計測した`size`を毎回`width`/`height`propへ渡していたため、操作中にも再発火してズーム・ドラッグを壊していた。
→ 対処: `size`は「初回の非ゼロ計測値で固定し、以後`ResizeObserver`が発火しても更新しない」方式に変更（`frontend/src/features/graph/components/GraphCanvas.jsx`のサイズ計測`useEffect`）。ウィンドウの動的リサイズには追従しなくなるが、安定した操作性を優先した。副作用として、この固定によりcanvasの実サイズが常にコンテナと一致するようになり、「ノードが小さすぎる」問題も同時に解消された（以前は`width`/`height`を渡さない一時的な回避策を試しており、その場合canvasが`window.innerWidth/innerHeight`基準になりコンテナ幅をはみ出す副作用があったが、この対処で不要になった）。

**クリックが効かない原因**（前回のエントリで「未解決」としていたもの）: `force-graph`は`pointermove`のたびに「`onBackgroundClick`が設定されていれば、`pointerType==='mouse'`の移動量を一切問わず`isPointerDragging=true`にする」ヒューリスティックを持つ。実際のマウスクリックはpointerdown→pointerupの間にほぼ必ず1px以上動くため常に発火し、`pointerup`側で「ドラッグ後なのでクリックと扱わない」と判定されていた。さらにパン操作自体もd3-zoomの`'zoom'`イベントで同じフラグを立てるため、`onBackgroundClick`を外すだけでは解決しなかった。
→ 対処: ライブラリの内部クリック判定に頼るのをやめ、`onNodeClick`/`onBackgroundClick`を削除。代わりに`GraphCanvas.jsx`のコンテナに`pointerdown`/`pointerup`を自前で仕込み、移動量が閾値（6px）以内なら`screen2GraphCoords`でグラフ座標へ変換し、`drawNode`と同じ当たり判定（円・角丸矩形）をノード配列に対して自前で行う（`findNodeAtClientPoint`）。ホバー状態（`hoveredNodeId`）には頼らない——上記のisPointerDragging誤検知と同じ理由で、クリックの瞬間にホバーがnullへリセットされることがあるため。

- ブラウザで実機確認済み: スクロールでのズーム、ノードドラッグ（物理反応込み）、ノードクリック（詳細パネル表示）、背景クリック（選択解除）、Home埋め込みのミニプレビュー、いずれも正常動作
- 変更ファイル: `frontend/src/features/graph/components/GraphCanvas.jsx`のみ

**追記（同日）**: 上記の修正後、ユーザーが実機（トラックパッド）で再確認したところ「何も改善されていない」と報告。私の確認は毎回ページ読み込みから数秒待ってから操作していたため、この後の不具合を見逃していた。

原因: `onEngineTick`は物理シミュレーションの収束前は毎フレーム`zoomToFit(0, 40)`（アニメーション時間0＝即座に）を呼んでいる。ユーザーが収束前（ページを開いてすぐ、ごく自然なタイミング）にズーム・パンを試みると、その変更は次のフレームで即座に打ち消される。1フレーム（約16ms）以内の巻き戻しは目に見えず、「操作しても何も起きない」ように見える。ノードドラッグは`isDraggingRef`である程度保護されていたが、背景パン（d3-zoom側のドラッグ処理）は保護が無く、同じ理由で効かなかった。

→ 対処: `userInteractedRef`を追加。`wheel`（`passive: true`で観測のみ）・`pointerdown`のいずれかが一度でも発生したら、以後はそのグラフが再描画されるまで`zoomToFit`を一切呼ばない（`onEngineTick`・`onEngineStop`両方の条件に追加）。フィルター変更などでノード・エッジが変わったときは`hasSettledRef`と一緒にリセットし、次に開いたときは通常どおり収束アニメーションでフィットする。

トレードオフとして、ノードがまだ広がりきっていない（物理シミュレーションの初期、クラスタ状に固まっている）ごく早いタイミングでユーザーが操作すると、以後は自動フィットが二度と働かないため窮屈な配置のまま固定される。実用上は「開いてから数秒待ってから操作する」ことで避けられるため許容したが、根本的な解決ではない（次に実装すべき最小単位に記載）。

- ブラウザで実機確認済み: 新規タブでページ読み込み後1〜2秒というほぼ即座のタイミングでズーム・ドラッグ・クリックを行っても正しく反応し、かつ操作結果が自動フィットに巻き戻されず維持されることを確認

**追記2（同日）**: ユーザーから「キャッシュ直後（＝ページを開いた直後）はズームできない。数秒待てばズームできる」と再度報告。上記`userInteractedRef`の対処自体は妥当だったが、実装に見落としがあった。

原因: `markInteracted`（`userInteractedRef.current = true`にするだけのハンドラ）を`wheel`/`pointerdown`いずれもコンテナ要素（canvasの親div）へbubbleフェーズで登録していた。ところがd3-zoom自身のwheel/mousedownハンドラは`canvas`要素へ直接登録されており、内部で`event.stopImmediatePropagation()`を呼ぶ。これにより、canvasで発生したwheel/pointerdownイベントはd3-zoom側の処理で止められ、親要素であるコンテナには一切バブリングしてこない。結果として`markInteracted`は実質的に一度も呼ばれず、`userInteractedRef`は自然に`hasSettledRef`が`true`になるまで（＝数秒待つまで）trueにならなかった。待てば動いたのは、`userInteractedRef`のおかげではなく、単に収束が終わって`zoomToFit`の呼び出し自体が止まったから。

→ 対処: `markInteracted`の登録を`{ capture: true }`に変更。captureフェーズはDOMツリーを上から下へ辿る際に先に発火するため、canvas側の後続の`stopImmediatePropagation`より前に必ず実行される。

- ブラウザで実機確認済み: ページ読み込み1秒後に即座にホイールでズームし、その直後（ズーム直後）とその後の収束完了後（10秒待機後）で`canvas.__zoom`の値を比較し、完全に同一の値のまま変化しないこと（＝自動フィットに一切巻き戻されないこと）を確認

### 2026-08: ノードラベルをチップの下へ移動（可読性改善）

ズーム不具合の解決後、ユーザーから「収束後は多くのノードが小さく表示され、ラベルが『Pin...』のように大半省略されて何のノードか分からない」とスクリーンショット付きで指摘を受けた。原因は`drawNode`がラベルをノード形状（チップ）の内側に収めようとしていたこと。チップ自体が小さいと、それに合わせてラベルの利用可能幅も極端に狭くなり、`truncateToWidth`が数文字しか残せなくなっていた。

ユーザーから「Obsidianではチップの下に文字があり、とても見やすい」という具体的な参考例の提示を受け、その方針で実装した。

- `frontend/src/features/graph/components/GraphCanvas.jsx`の`drawNode`を変更。ラベルをチップ内へ収めるのをやめ、チップの下へ`LABEL_MAX_WIDTH`（100、チップ幅に縛られない余裕を持たせた固定値）を上限に描画するよう変更
- レコードノード: アイコン+評価（★）はそのまま円の内側（レイアウトのみ微調整）。ラベルは円の下へ
- 属性ノード: これまで「テキストを内側に収める」ためワイドなピル形状（半幅30）が必要だったが、アイコン+件数バッジだけになったのでレコードノードに近いコンパクトなチップ（半幅15）へ縮小。件数バッジはチップ右上の小さなテキストへ、ラベルはチップの下へ
- 当たり判定（`paintNodePointerArea`）はチップの形状・サイズのみを対象とし、下に出たラベル部分は含めない（Obsidianのグラフでもクリック対象はドット自体であるのに合わせた）。チップの縮小に伴い当たり判定の対象範囲も自動的に縮小されるが、クリックには実機で問題ないことを確認済み
- ブラウザで実機確認済み: 「Pink Bourbon」「Kenya Nyeri AA」「Guatemala Hueh...」など主要なラベルが読める程度まで改善。密集した箇所ではラベル同士が重なる場合があるが（ラベル同士の衝突回避は未実装）、省略されて意味不明になるケースは大幅に減少。ノードクリック（詳細パネル表示）、Home埋め込みのミニプレビューともに正常動作を確認

### 2026-08: Homeフッター（技術バッジ・クレジット）をProfileページへ移動

未解決事項として記録していた「Homeのフッターがログイン後の全ページに出ており、ポートフォリオとしての説明責任と『静かな道具』というプロダクト方針がせめぎ合っている」を解消。ユーザーと相談し、常時表示をやめて見たい人が能動的にたどり着く場所（Profileページ末尾）へ移す方針にした。

- `frontend/src/App.jsx`: `Footer`コンポーネントと`<main>`外の呼び出しを削除
- `frontend/src/pages/ProfilePage.jsx`: 退会セクションの下に技術バッジ（`TECH_STACK`定数）とクレジット表記を追加。`footer-stack` / `footer-badge` / `footer-credit`のCSSクラスはそのまま再利用し、全ページ帯だった`.site-footer` / `.footer-inner` / `.footer-brand` / `.footer-logo` / `.footer-title`は他に参照が無いことを確認したうえで`App.css`から削除
- ブラウザで実機確認済み: Home/Records/Graphにフッターが出ないこと、Profile末尾に技術バッジ・クレジットが表示されることを確認

### 2026-08: Insight機能を追加（知識グラフの傾向をルールベースで一文提示）

「知識グラフだけでは、ユーザーが自分で関係性を読み取る必要がある」という指摘から、記録データからルールベースでパターンを検出し、「あなたはEthiopia産かつWashed精製のコーヒーを高く評価する傾向があります。」のような一文をHome画面に提示する機能を追加。`feat/insights`ブランチで実装。

docs/mvp.mdのOut of Scope（「AI推薦」「自然言語による味覚分析」）との整合性をユーザーと確認: notesなどの自由記述は一切読まず、産地・精製方法・フレーバー・評価・記録タイプ・日付という構造化データの集計・閾値判定だけで組み立てるため、AI/NLPとは別物という整理で合意し、docs/product-principles.md「MVP Before Intelligence」に区別を明記した。詳細な仕様は新規`docs/insights.md`に記録（`docs/knowledge-graph.md`と同じ構成）。

- `backend/core/insights/insightBuilder.js`（新規）: DB/HTTP非依存の純粋関数。6種類のInsight（評価の高い産地×精製方法の組み合わせ／最近増えている傾向／自宅とカフェの評価差／高評価が多い精製方法／よく選ぶフレーバー／最も多く飲んでいる産地）を優先度順に検出し、条件を満たすものだけを配列で返す。閾値は`THRESHOLDS`定数に集約（例: 組み合わせは2件以上・平均評価4.0以上）。データが少ないうちに断定的な一文を出さないよう、条件を満たすものが無ければ空配列を返す
- `backend/services/coffee/insightService.js` / `controllers/insightController.js` / `routes/insightRoutes.js`（新規）: `graphService.js`等と同じ構成。`app.js`へ`GET /api/insights`を登録
- `backend/tests/insightBuilder.test.js`（純粋関数の閾値・優先順位）、`tests/insightApi.test.js`（HTTPレベル、他ユーザーを含めないことの確認）を新規追加
- `frontend/src/features/insights/`（新規）: `api/insightApi.js`、`hooks/useInsights.js`、`components/InsightBanner.jsx`。バックエンドは構造化データのみを返し、日英どちらの文言に変換するかはフロントエンド側でi18nextの補間により行う（同じレスポンスを両言語で使い回すため）
- `frontend/src/pages/HomePage.jsx`: GraphPreviewの上に`InsightBanner`を配置
- `frontend/src/i18n/locales/ja.json` / `en.json`: `insights.*`に6種類の文言を追加
- `InsightBanner`は`/graph`へのLinkにした。docs/product-principles.md「Discovery Must Be Actionable」（発見は単なる数値表示で終わらせない）に沿い、一文を提示するだけで終わらせずグラフでの探索へつなげるため（GraphPreview.jsxと同じ見た目・同じ理由）
- ブラウザで実機確認済み: デモデータ（15件）で実際に`topCombination`（Ethiopia×Washed、平均5、2件）が検出され、Home画面に日英両方で正しく表示されること、クリックで`/graph`へ遷移することを確認

### 2026-08: 横断検索を追加（産地・品種・フレーバー・カフェ・精製方法・コーヒー名）＋カフェをグラフノード化

「コーヒー名検索だけでなく、産地・品種・フレーバー・カフェ・精製方法を横断して検索でき、結果に『エチオピア / 8件の記録 / よく関連するフレーバー：ベリー、フローラル』のように関連情報を添えたい」という要望から実装。`feat/search-and-cafe`ブランチで実装。カフェは元々知識グラフのノード種別に含まれていなかった（`cafeName`は自由記述でfarmNameと同じ理由で未対応）ため、検索でカフェも扱えるようにする前提として、まずカフェをグラフノード化した。

**カフェのグラフノード化**（farmNameと全く同じパターンで実装）:
- `backend/core/graph/nodeId.js`に`cafeNodeId`、`graphBuilder.js`の`collectAttributeRefs`にcafeの分岐、`ATTRIBUTE_NODE_TYPES`にcafeを追加
- `frontend/src/features/graph/utils/nodeVisuals.js`（アイコンはlucideの`Store`、色は未使用だった`ctp-maroon`）・`canvasIcons.js`（canvas描画用のSVG pathデータ）にcafeを追加。`GraphLegend.jsx`・`GraphFilters.jsx`は`ATTRIBUTE_NODE_TYPES`を参照しているため変更不要
- `docs/domain-model.md`（Cafeセクション新設。recordTypeの`cafe`とは別概念であることを明記）・`docs/knowledge-graph.md`（Stable IDs）・`docs/design.md`（Graph Visual Semantics）を更新
- `backend/tests/graphBuilder.test.js`にcafeノード生成（正規化による統合）のテストを追加

**横断検索**:
- `backend/core/search/searchBuilder.js`（新規、DB/HTTP非依存の純粋関数）: `graphBuilder.js`の`buildGraph`をそのまま再利用し、属性ノード（origin/farm/variety/process/roastLevel/flavor/cafe）を部分一致で検索。属性同士の直接エッジは持たないため、ヒットした属性が付いた記録を経由して間接的に共起する別属性（flavor以外がヒットならflavor、flavorがヒットならorigin）を登場回数順に最大3件添える。記録タイトルの一致は別途、記録そのものを返す（既存の`RecordCard.jsx`をそのまま再利用するため）
- `backend/services/coffee/searchService.js` / `controllers/searchController.js` / `routes/searchRoutes.js`（新規）: `graphService.js`等と同じ構成。`app.js`へ`GET /api/search?q=...`を登録。クエリが空でも400にせず空の結果を返す
- `backend/tests/searchBuilder.test.js`（集計ロジック）、`tests/searchApi.test.js`（HTTPレベル、他ユーザーを含めないことの確認）を新規追加
- `frontend/src/features/search/`（新規）: `api/searchApi.js`、`hooks/useSearch.js`（300msデバウンス。setStateはeffect内で定義したasync関数の中でのみ行う。effect本体で直接setStateすると`react-hooks/set-state-in-effect`に引っかかるため、`useGraph.js`等と同じパターンに揃えた）、`components/SearchBox.jsx` / `SearchResults.jsx` / `EntityResultCard.jsx`
- `frontend/src/pages/RecordsPage.jsx`: 検索ボックスを追加。検索クエリが入力されている間は、通常のフィルター・一覧・ページ送りを検索結果表示へ丸ごと差し替える（見た目・意味が異なる2つの状態を1つの一覧に混ぜないため）
- `EntityResultCard`は`/graph?focus=<nodeId>`へのLinkにした（`RecordDetailPage`の「Graphで見る」と同じ`?focus=`の仕組みをそのまま利用）。docs/product-principles.md「Discovery Must Be Actionable」に沿い、検索結果を提示するだけで終わらせずグラフでの探索へつなげるため
- `frontend/src/i18n/locales/ja.json` / `en.json`: `search.*`の文言、`graph.nodeTypes.cafe`を追加
- 新規`docs/search.md`（`docs/knowledge-graph.md`/`docs/insights.md`と同じ構成）、`docs/api.md`に`GET /api/search`を追記、`CLAUDE.md`の参照ファイル一覧に追加
- ブラウザで実機確認済み: デモデータで「ethiopia」検索→産地カード（4件の記録、関連フレーバー: Floral・Berry・Citrus）と記録名一致4件が表示、「blue bottle」検索→カフェカード（1件の記録）が表示、カードクリックで`/graph?focus=cafe:...`へ遷移しノードが選択された状態でGraph画面が開くこと、日英両方の表示を確認

### 2026-08: エンティティ詳細ページを追加（知識グラフをナビゲーションにする）

「グラフだけでは関係性の読み取りをユーザーに委ねてしまう。産地・品種・フレーバー・精製方法・カフェそれぞれに、関連記録・平均評価・よく出る品種/フレーバー・グラフ上の関連・最後に飲んだ日をまとめて見せる詳細ページが欲しい」という要望から実装。`feat/entity-detail-pages`ブランチで実装。

産地・農園・品種・精製方法・焙煎度・フレーバー・カフェのどの種別でも同じページ・同じAPIで扱う汎用実装にした（種別ごとに個別ページを作らない。`getNodeVisual`でtypeごとの見た目だけを切り替える既存パターンをそのまま踏襲）。「グラフ上の関連」は具体的にはランキング表示（ミニグラフの埋め込みではない）を選択（ユーザーと相談して決定）。

- `backend/core/graph/entityDetailBuilder.js`（新規、DB/HTTP非依存の純粋関数）: 指定ノードの記録数・平均評価・最終記録日（関連記録のrating/consumedAtから算出）・関連属性（属性同士の直接エッジが無いため、記録を介して間接的に、他のすべての種別を同時に登場回数順で集計。同じ種別同士は常に空になるため除外）を返す
- `backend/services/coffee/graphService.js`に`getNodeDetail`を追加、`controllers/graphController.js`・`routes/graphRoutes.js`に`GET /api/graph/nodes/:nodeId`を追加（既存の`GET /api/graph/nodes/:nodeId/records`とは別の新規エンドポイント。フィルターは持たない）
- `backend/tests/entityDetailBuilder.test.js`（集計ロジック）、`tests/graphApi.test.js`に新エンドポイントのHTTPレベルテストを追加
- `frontend/src/features/graph/`: `api/graphApi.js`に`fetchNodeDetail`、新規`hooks/useEntityDetail.js`
- 新規`frontend/src/pages/EntityDetailPage.jsx`（ルート`/entities/:nodeId`）: 統計カード（記録数・平均評価・最終記録日）、「グラフで見る」ボタン（`/graph?focus=<nodeId>`、既存の`?focus=`の仕組みを再利用）、関連属性のランキング（チップ自体が他のエンティティ詳細ページへのLink。産地→品種→フレーバーと渡り歩ける）、関連記録一覧
- 既存導線の接続: `NodeDetailPanel.jsx`（Graph画面のサイドパネル）に「詳細を見る」リンクを追加。`EntityResultCard.jsx`（横断検索の結果カード）のリンク先を`/graph?focus=`から`/entities/`へ変更（知識グラフをただの可視化ではなくナビゲーションにする方針のため。前回のInsightsエントリで「`/graph?focus=`へのLinkにした」と記載したが、本エントリで置き換えた）
- 新規`docs/entity-detail.md`（`docs/knowledge-graph.md`/`docs/search.md`と同じ構成）、`docs/api.md`に`GET /api/graph/nodes/:nodeId`を追記、`CLAUDE.md`の参照ファイル一覧に追加
- ブラウザで実機確認済み: デモデータで産地「Ethiopia」の詳細ページ（4件の記録、平均評価4.8、最後に飲んだ日、品種/精製方法/焙煎度/フレーバー/カフェのランキング、関連記録4件）を確認。品種「Heirloom」チップをクリックしてそのエンティティ詳細ページへ正しく遷移（異なる統計・関連属性が表示される）、「グラフで見る」ボタンで`/graph?focus=variety:...`へ遷移しノードが選択された状態でサイドパネルに「詳細を見る」リンクが表示されることを確認

### 2026-08: HomeのGraphカードを「実データの縮小描画」から「静的イラスト+件数」へ変更

保留にしていた「Homeのgraphプレビューが読みにくい」問題を、ユーザー提示のレイアウト案（抽象イラスト＋見出し＋タグライン＋ノード数/つながり数＋Explore CTA）で解消。branchは切らず、frontendのみの変更のためmainへ直接commit。

- `frontend/src/features/graph/components/GraphPreview.jsx`を全面書き換え。`GraphCanvas`（react-force-graph-2d）の縮小描画をやめ、静的なSVGイラスト（`GraphIllustration`、実データを反映しない装飾）+ 見出し「Knowledge Graph」+ タグライン + `graph.summary`の`nodeCount`/`edgeCount`（既存の`useGraph`が返す値をそのまま利用、バックエンド変更なし）+ 「Explore Graph →」に差し替えた
- react-force-graph-2dへの依存が無くなったため、`frontend/src/pages/HomePage.jsx`側の`lazy`/`Suspense`によるbundle分離も不要になり、通常のimportへ戻した（build出力で`GraphPreview`/`GraphCanvas`の専用chunkが無くなったことを確認）
- `frontend/src/i18n/locales/ja.json` / `en.json`: 使われなくなった`home.viewConnections` / `home.goToGraph`を削除し、`home.knowledgeGraph.*`を追加
- ブラウザで実機確認済み: Home画面下部に「Knowledge Graph / Your coffee knowledge is growing. / 54 Nodes 84 Connections / Explore Graph →」（日本語では「知識グラフ / あなたのコーヒーの知識が育っています。/ 54件のノード 84件のつながり / グラフを見る →」）が表示され、クリックで`/graph`へ遷移することを確認

### 2026-08: GraphカードのイラストをGraphを抽象イラストから実データのごく薄い一部表示へ変更

上記の抽象イラストについて、ユーザーから「実データの一部をごく薄く表示したい」という追加要望。選定基準（直近の記録だけだと疎らに見えないか）を相談し、「直近の記録＋その属性ノード」を採用した。産地・フレーバーなどは記録を重ねるたびに同じノードへ収束するため、直近の記録を起点にしても自然と過去からある既存ノードへつながり、「新しいものが既にある大きな網へつながっていく」絵になる（単純な「直近N件だけ」や「よく出るノード中心」より、この方針を採用した理由）。

- 新規`frontend/src/features/graph/utils/previewIllustration.js`（純粋関数）: `graph.nodes`のうち直近5件のrecordノードと、そこから伸びるedgeの先の属性ノードだけを抜き出す。位置は物理演算ではなく、ノードIDの文字列ハッシュによる決定的な疑似乱数で決める（同じノードは毎回同じ位置になり、react-force-graph-2d等の追加依存も不要）。ノードが枠（viewBox）の外まではみ出す余白を意図的に持たせ、「全体のごく一部」に見えるようにした
- `frontend/src/features/graph/components/GraphPreview.jsx`の`GraphIllustration`を書き換え、実データ（`getNodeVisual(type).canvasColor`で種別ごとに色分け）を`opacity-40`で薄く表示する形にした
- ブラウザで実機確認済み: 実際の産地・フレーバー等の色が混ざった、密に絡み合ったノード群が薄く表示されることを確認。bundleサイズに変化が無いこと（react-force-graph-2d等の新規依存が増えていないこと）をbuild出力で確認

### 2026-08: GraphカードのレイアウトをY方向の積み上げから左テキスト+右イラストへ変更

ユーザーから「バランスが良い」というレイアウト改善案。カード上部に横長で置いていたイラストを右側へ移動し、見出し・タグライン・件数・CTAは左側にまとめた。

- `frontend/src/features/graph/components/GraphPreview.jsx`: Linkのルート要素を`flex items-center gap-6`にし、テキスト側を`min-w-0 flex-1`、イラストを`flex-shrink-0`の固定サイズに変更。狭い画面（`sm`未満）ではイラストを非表示にし、テキストだけの1カラムに戻す（装飾要素より本文を優先）
- `frontend/src/features/graph/utils/previewIllustration.js`: 右側の小さめの正方形寄りの枠に収まるよう、viewBoxを`200x64`（横長）から`140x100`へ変更
- ブラウザで実機確認済み: Home画面下部でテキストが左、イラストが右のレイアウトになっていること、クリックで`/graph`へ遷移することを確認

### 2026-08: 統計ページ（Stats）を追加

「これまで飲んだコーヒーについての統計ページが欲しい」という要望。Insight（`docs/insights.md`。傾向を一文で意味づけする）が生の集計値を見せない設計だったのに対し、Statsは総記録数・月別推移・評価分布・家/カフェ比較・産地/品種/精製方法/フレーバー/カフェの上位ランキングという生の数字をふりかえれる場所として、ナビゲーションに独立した項目として追加した（ユーザーと相談し、Homeへの埋め込みではなく新規ページ・新規ナビ項目を選択）。`feat/stats-page`ブランチで実装。

- `backend/core/stats/statsBuilder.js`（新規、DB/HTTP非依存の純粋関数）: `core/insights/insightBuilder.js`と同じグルーピングパターンを再利用し、Overview・上位5件ランキング（産地/品種/精製方法/フレーバー/カフェ、`core/graph/nodeId.js`と同じstable ID形式）・評価分布（★1〜5、0件でも全スロットを返す）・家/カフェ比較・月別推移を算出
- `backend/services/coffee/statsService.js`・`controllers/statsController.js`・`routes/statsRoutes.js`を追加、`app.js`に`GET /api/stats`を登録（フィルターは持たない。「記録全体のふりかえり」を示す機能のため）
- `backend/tests/statsBuilder.test.js`（集計ロジック10件）、`tests/statsApi.test.js`（認証・空記録・ユーザー分離のHTTPテスト3件）を追加
- `frontend/src/features/stats/`: `api/statsApi.js`・`hooks/useStats.js`（`useInsights.js`と同じloading/error/data構成）、表示部品として`OverviewStats.jsx`・`MonthlyTrendChart.jsx`・`RatingDistributionChart.jsx`（いずれもCSSのみの棒グラフ、グラフ描画ライブラリは追加していない）・`HomeVsCafeCard.jsx`・`TopRankingList.jsx`（ランキング項目はエンティティ詳細ページ`/entities/:nodeId`へのLink）
- `frontend/src/features/coffee-records/utils/recordFormat.js`に`formatMonthLabel`を追加（月別推移グラフの軸ラベル用）
- 新規`frontend/src/pages/StatsPage.jsx`（ルート`/stats`）。記録が1件も無い場合は集計値を並べず、次の行動を示すメッセージのみ表示
- ナビゲーションに追加: `Navbar.jsx`（サイドバー、手描きSVGアイコンを新規追加）・`BottomTabBar.jsx`（下部タブ、`lucide-react`の`BarChart3`）
- `frontend/src/i18n/locales/ja.json` / `en.json`に`stats.*`キーを追加
- 新規`docs/stats.md`、`docs/api.md`に`GET /api/stats`、`docs/design.md`のMain Navigation/Screensに追記、`CLAUDE.md`の参照ファイル一覧に追加
- 実装中に一度、ESLintの`no-unused-vars`（`varsIgnorePattern: '^[A-Z_]'`）が関数パラメータの分割代入リネーム（`{ icon: Icon }`）ではアイコンのJSX参照を検出できず誤検知することを確認。既存コード（`LandingPage.jsx`）と同じ回避策（`const Icon = icon;`を関数本体に書く）に合わせて修正
- テスト結果: `cd backend && npm test` Test Suites: 19 passed, Tests: 286 passed。`cd frontend && npm run lint && npm run build`も成功
- ブラウザで実機確認済み: デモデータでOverview（記録数15・平均評価4.1・産地7種・品種7種・フレーバー13種・63日）、月別推移、評価分布、家/カフェ比較、産地〜カフェの5種類のランキングが表示されることを確認。ランキングの「Ethiopia」をクリックして`/entities/origin:...`へ正しく遷移し、産地詳細ページ（4件の記録・平均評価4.8・関連する品種/精製方法/フレーバー/カフェ・関連記録4件）が表示されることを確認。日本語切り替えで見出し・数値・月ラベル（「26年7月」等）・件数の複数形もすべて翻訳されることを確認

### 2026-08: Homeを2カラム化（`lg`以上）

「今後機能を増やす際に対応しやすいように」という要望から、`lg`（1024px）以上でHome画面を2カラムにした。メイン列（Record Coffee CTA・Recent Records）を「行動」、サイドバー列（Insight・GraphPreview）を「発見・気づき」の置き場として役割を分けた。将来サイドバーへ軽量なウィジェットを足しやすくなる一方、Statsのように独立ページにすべき規模のものはサイドバーへ詰め込まない方針を維持する（ユーザーと相談して決定）。frontendのみの変更のためbranchは切らずmainへ直接コミット。

- `frontend/src/pages/HomePage.jsx`: コンテナを`max-w-3xl`から`max-w-5xl`へ拡張し、`grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px] lg:items-start`でメイン列（CTA・Recent Records）とサイドバー列（Insight・GraphPreview）に分割。`lg`未満は変更前と同じ1カラムの縦積み（順序も同じ）のまま
- `frontend/src/features/insights/components/InsightBanner.jsx` / `frontend/src/features/graph/components/GraphPreview.jsx`: それぞれのルート要素にあった`mt-6`を削除。以前は縦積みの手動マージンとして必要だったが、親コンテナの`gap-6`と二重になるため
- ブラウザで実機確認済み: 幅1400pxで2カラム表示（サイドバーにInsight・GraphPreviewが縦に並ぶ）を確認。日本語表示でもInsightの文章・GraphPreviewの見出し/タグラインが320px幅のサイドバー内で折り返して問題なく収まることを確認
- 未検証: `lg`未満（タブレット・モバイル幅）での実際の折り返しは、ブラウザ自動化ツールのビューポートリサイズがこの環境では効かず（`resize_window`を呼んでも`read_page`のViewportが常に約1223x1010のまま）、目視確認できなかった。Tailwindの標準的な`grid-cols-1 lg:grid-cols-[...]`パターン自体は他画面でも使用実績がある構成のため大きな懸念は無いが、実機・別環境での確認を推奨

### 2026-08: Homeのコンテンツ間gapを拡大し、max-widthを1400pxへ

上記2カラム化に続けて、「各表示コンテンツ間のgapをもう少し広げてほしい、max-widthを1400程度に広げてほしい」という要望。

- `frontend/src/pages/HomePage.jsx`: コンテナを`max-w-5xl`（1024px）から`max-w-[1400px]`へ拡張。ヘッダー下・2カラムグリッド・各列内のセクション間のgapを`gap-6`/`mb-6`（24px）から`gap-8`/`mb-8`（32px）へ拡大（セクション内部の見出しとコンテンツの間隔`mb-3`等は変更していない）
- ブラウザで実機確認済み: gapが広がったことを確認。ただしこの環境のブラウザ自動化ツールは実際のビューポート幅を約1223pxまでしか再現できず（上記エントリの「未検証」と同じ制約）、1400px相当の広い画面での見え方は目視確認できていない。CSSの`max-w-[1400px]`自体はビルド時にエラー無く反映されることを確認済み

### 2026-08: Homeの2カラム化を撤回、元の1カラムへ戻す。Recent Recordsの表示件数を6件へ

ユーザーの判断により、上記2エントリで導入した`lg`以上の2カラムレイアウトを撤回。「静かな道具」という方針（`docs/design.md`）に対し、サイドバー分割はまだ早いと判断したため。合わせてRecent Recordsの表示件数を5件から6件へ変更。

- `frontend/src/pages/HomePage.jsx`: コンテナを`max-w-[1400px]`から元の`max-w-3xl`へ、`grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]`のグリッド分割を撤去し、CTA→Recent Records→Insight→GraphPreviewの1カラム縦積み（`mb-6`によるセクション間マージン）へ戻した。`RECENT_RECORDS_LIMIT`を`5`から`6`へ変更
- `frontend/src/features/insights/components/InsightBanner.jsx` / `frontend/src/features/graph/components/GraphPreview.jsx`: 1カラム構成に合わせてルート要素の`mt-6`を復元（2カラム化の際、親コンテナの`gap`と二重になるため削除していたもの）
- `frontend/lint`・`frontend/build`のみ実行し成功を確認（backend/fastapi-serviceの変更は無い）

続けて「max widthは1400以上にしてほしい」という要望を受け、1カラムに戻した直後の`max-w-3xl`（768px）から`max-w-[1400px]`へ再度拡張。1カラムのままのため、CTA・Recent Recordsのグリッド（`sm:grid-cols-3`）・Insight・GraphPreviewは幅1400pxまで単純に伸びる（2カラム化時のようなサイドバー分割はしていない）。`frontend/lint`・`frontend/build`成功を確認。

### 2026-08: Insight（左400px）とGraphPreview（右1000px）を横並び・高さ400pxで配置

ユーザーから「Insightを左400px、Graphを右1000pxに配置」「横に一列、縦も400pxほどの高さに」という指定。上記で撤回した`lg:grid-cols-[1fr_320px]`の可変2カラムとは異なり、両カードとも固定ピクセルサイズでの横並び。

- `frontend/src/pages/HomePage.jsx`: `InsightBanner`・`GraphPreview`をそれぞれ`h-[400px] w-[400px]`・`h-[400px] w-[1000px]`（`max-w-full`併用、`flex-shrink-0`）のラッパーdivで囲み、`flex flex-wrap gap-6`の行に並べた。`flex-wrap`により、行の合計幅（400+1000+gap24=1424px）が入らない狭い画面では自動的に縦積みへ戻る（メディアクエリ不要）
- 上記の横並び行に収まるよう、コンテナを`max-w-[1400px]`から`max-w-[1480px]`へ拡張（1400ちょうどだと`sm:px-6`のpadding込みで行の必要幅1424pxに足りず常に折り返してしまうため。前回の「1400以上」という要望は満たしたまま）
- `frontend/src/features/insights/components/InsightBanner.jsx` / `frontend/src/features/graph/components/GraphPreview.jsx`: ルート`Link`に`h-full`を追加してラッパーdivの高さいっぱいに広げた。`InsightBanner`は`items-start`から`items-center`へ変更し、400px高の中でアイコン+文章を縦中央に配置（`items-start`のままだと上端に寄って下に大きな余白ができるため）。それに伴い、アイコンに付いていた`items-start`用の微調整`mt-0.5`は不要になったため削除
- ローカルのDocker Compose環境（`docker-compose.yml`のfrontend:5174/backend:5002/mongodb:27018、demoユーザーでログイン済み）で実機確認: `getBoundingClientRect()`でInsightが`400×400`、GraphPreviewが`1000×400`、両者の間隔が24px（`gap-6`通り）であることを数値で確認。スクリーンショットでも左右に正しく並んで表示されることを確認
- `frontend/lint`・`frontend/build`成功を確認（backend/fastapi-serviceの変更は無い）

上記の`flex-wrap`版は、ブラウザ幅1800px（Dockerでの確認時）では横並びだったが、ユーザーの実機（より一般的なノートPC幅、1440px程度を想定）では折り返されて縦積みに見えてしまい、「横並びになってない」という指摘を受けた。原因は、行の必要幅（1424px）に対してコンテナ`max-w-[1480px]`から`sm:px-6`のpaddingとサイドバー分の余白を引いた実際のコンテンツ幅が、一般的な画面幅では足りていなかったこと。

- `frontend/src/pages/HomePage.jsx`: `flex-wrap`・`max-w-full`を外し、`overflow-x-auto`（+`pb-2`でスクロールバー分の余白）へ変更。画面幅に関わらず常に横並びを保ち、収まらない場合はページ全体ではなくこの行だけが横スクロールする
- 1440×900のビューポートで再確認: 2枚のカードが折り返さず横並びのまま表示され、画面に収まりきらない右側（GraphPreviewの右端）は横スクロールで見えることを確認
- `frontend/lint`・`frontend/build`成功を確認

続けて「fill containerにしてほしい」という要望。横スクロールが発生する状態は望んでおらず、コンテナ幅いっぱいに広がってほしいという趣旨のため、固定px幅をやめてコンテナ幅を埋める形へ変更。

- `frontend/src/pages/HomePage.jsx`: `w-[400px]`/`w-[1000px]`・`flex-shrink-0`・`overflow-x-auto`をやめ、`flex-[2]`（Insight）/`flex-[5]`（GraphPreview）＋`min-w-0`に変更。元の400:1000という比率（2:5に約分）は保ったまま、2枚合計でコンテナの幅いっぱいに広がる（fill container）。高さは400pxのまま変更なし
- 1440×900のビューポートで再確認: 横スクロールが発生せず、2枚のカードがコンテナ幅ちょうどに収まって横並び表示されることを確認
- `frontend/lint`・`frontend/build`成功を確認

### 2026-08: Home画面をレビューし、Insight/GraphPreviewの余白を中身のサイズアップで解消

上記の横並び化・fill container化のあと、ユーザー依頼でHome画面を一度レビュー。デスクトップ幅では2つの問題を発見した。1つ目はモバイル幅（実測316px）で`flex-[2]`/`flex-[5]`がそのまま適用され、Insightカードが約90pxまで潰れて文章が単語ごとに折り返り読めなくなる不具合（未対応、次回対応が必要）。2つ目は400px四方に対して中身（一文だけ・アイコン+短い見出し）が小さく、余白ばかりが目立つ点。ユーザーからは「モバイル修正」と「余白解消」のどちらを先にするか尋ねたところ、後者について「文字列を大きくする（Insight）」「previewを大きくする（GraphPreview）」という具体的な方針の指定があった。

- `frontend/src/features/insights/components/InsightBanner.jsx`: アイコンを18→32px、本文を`text-sm`→`text-xl`（`docs/design.md`のタイプスケール5段階のうち見出し相当のサイズ）、`padding`を`p-4`→`p-8`、`gap`を`gap-3`→`gap-4`に拡大。400px四方の中でアイコン+文章が中央に大きく収まるようにした
- `frontend/src/features/graph/components/GraphPreview.jsx`: 右側のグラフイラスト（`GraphIllustration`、SVG）を`h-24 w-32`（96×128px）から`h-72 w-96`（288×384px）へ拡大。SVGは`viewBox`基準で描画しているため、表示サイズを変えるだけでノード・エッジが破綻なく拡大される（`utils/previewIllustration.js`は変更不要）。見出し・タグライン・件数などのテキスト側は今回変更していない（ユーザー指定が「previewを大きく」だったため）
- ブラウザで実機確認済み（幅1600px相当）: Insightカードはアイコン+3〜4行の文章が中央に大きく表示され、GraphPreviewカードはノード・エッジのイラストがカード右側の大部分を占めるようになり、どちらも400pxの高さに対する余白感が大きく改善したことを確認
- `frontend/lint`・`frontend/build`成功を確認

続けて「graphカードの文字も大きくしてほしい」という要望。上記ではpreview（イラスト）のみ拡大しテキスト側は変更していなかったため、見出し・タグライン・件数・探索リンクも合わせて拡大した。

- `frontend/src/features/graph/components/GraphPreview.jsx`: 見出し`text-base`→`text-2xl`、タグライン`text-sm`→`text-base`、ノード/エッジ件数`text-sm`→`text-xl`（`font-mono`は維持）、探索リンク`text-xs`→`text-sm`＋矢印アイコン14→16px。あわせてカード全体の余白も`p-5`→`p-8`・`gap-6`→`gap-8`へ拡大し、InsightBannerの`p-8`と揃えた
- ブラウザで実機確認済み（幅1600px相当）: 見出し・件数・タグラインがイラストと釣り合う大きさになり、カード全体の情報量とサイズ感がバランスすることを確認
- `frontend/lint`・`frontend/build`成功を確認

### 2026-08: Discover機能を追加（CQI参照データ×知識グラフの隣接関係で「まだ試していない産地」を提案）

Record→Connect→DiscoverのうちDiscoverが一番弱い（Insightは一文提示止まり）という指摘から、ユーザーと相談して仕様を固めた上で実装。branch `feat/discover-cqi-recommendations` を切って実装。

設計判断（ユーザーとの合意事項）:
- CQI（Coffee Quality Institute）の参照データは、Country of Origin × Processing Method × 品質スコアの1軸だけを使う（`docs/product-principles.md`「Personal Knowledge Over Global Completeness」に沿い、アプリ側に対応する概念が無い項目までは広げない）
- CQIデータは一度読み込んだら終わりの静的ファイル。ライブの外部API呼び出しはしない
- Insight機能（`core/insights/`・`PRIORITY`配列・`InsightBanner.jsx`）には一切触れない、完全に独立した新機能として実装する（`docs/insights.md`の「Source of Truth: MongoDBのCoffeeRecordとマスターデータを正とする」と矛盾させないため）
- 知識グラフ生成ロジック（`core/graph/graphBuilder.js`）にも依存しない・変更しない
- UIはHome画面ではなくEntity Detailページに置く（`docs/product-principles.md`「Discovery Must Be Actionable」、`docs/entity-detail.md`が既に「知識グラフをナビゲーションにする、プロダクトの差別化ポイント」と明記している場所を強化する方向にした）

実装内容:
- `backend/data/cqiDatabase.json`: 静的な参照データ（新規）。`originName`/`processName`は`backend/seeds/data/origins.js`・`processes.js`の`name`と完全一致させ、正規化レイヤーを別途作らずに済ませた。品質スコアはCQIの傾向を参考にした目安値（この開発環境には外部データセットを取得するネットワークアクセスが無いため、正確な値の再現ではないことをファイル内コメントに明記）
- `backend/core/discover/discoverBuilder.js`（新規・純粋関数）: 指定産地の記録の中で最多の精製方法を求め（同率首位は断定しない、`insightBuilder.js`と同じ方針）、CQIデータから同じ精製方法・かつ自分がまだ一度も記録していない産地を品質スコア順に最大2件抽出する
- `backend/services/coffee/discoverService.js`（新規）: CQI JSONをモジュールスコープに一度だけキャッシュ。`core/graph/graphBuilder.js`は使わず、自分のCoffeeRecordから直接ノードの実在確認をする（グラフ生成ロジックへの依存自体を作らないため）
- `backend/controllers/discoverController.js` / `backend/routes/discoverRoutes.js`（新規）: `GET /api/discover/nodes/:nodeId`。`origin:`以外のプレフィックスは404にせず空配列（対応していない種別なだけで「存在しない」わけではない）、`origin:`で自分の記録に無いIDは404（`docs/entity-detail.md`と同じ404方針）
- `backend/app.js`: `app.use("/api/discover", discoverRoutes)`を追加（他のルート定義は変更なし）
- `frontend/src/features/discover/`（新規）: `api/discoverApi.js` / `hooks/useOriginDiscovery.js`（`useInsights.js`と同じloading/error/data構成）/ `components/DiscoverSuggestions.jsx`（提案が0件・読み込み中・エラー時は何も表示しない、`InsightBanner.jsx`と同じ「静かな道具」の方針。各提案に`/records/new`への導線を付ける。提案産地はまだ自分のグラフにノードが無いため、Graph/Entity Detailへの深いリンクは作れない）
- `frontend/src/pages/EntityDetailPage.jsx`: `detail.type === "origin"`のときだけ`DiscoverSuggestions`を「グラフで見る」ボタンの下に表示。他の変更は無し
- `frontend/src/i18n/locales/{ja,en}.json`: `discover.*`キーを追加（`insights.*`と同様、文言はフロントエンドがi18nextの補間で生成）
- `docs/discover.md`（新規）: Purpose・Insightとの違い・CQI参照データの位置づけ・生成ロジック・レスポンス形式・表示場所を記載。`CLAUDE.md`のdocsリストにも追加
- `docs/api.md`: Discoverセクションを追加

テスト:
- `backend/tests/discoverBuilder.test.js`（新規）: 閾値未満・同率首位・最大2件・既に試した産地の除外・CQIに一致するデータが無い場合を検証
- `backend/tests/discoverApi.test.js`（新規）: 未認証401、`origin:`以外は200＋空配列、存在しない産地IDは404、自分の記録だけから提案を作る（他ユーザーの記録は混ざらない）、既に試した産地の除外をDB込みで検証
- `npm run test`（backend）: 21 suites / 299 tests すべて成功（既存テストは無変更で全通過）
- `npm run lint` / `npm run build`（frontend）: 成功
- Docker Compose環境（frontend:5174/backend:5002/mongodb:27018、demoユーザー）で実機確認: Kenya（Washed×2件）のEntity Detailページで「Not yet tried / まだ試していない産地」セクションにCosta Rica・Burundiの提案が表示され、日本語・英語どちらでも文言が正しく補間されることを確認。Washed（process種別）のEntity Detailページでは、対象外のためDiscoverセクションが表示されないことも確認

未解決事項（次のエントリの「未解決事項」にも反映）:
- 「この産地を記録してみる」のリンクは`/records/new`への単純な遷移で、産地の事前入力はしていない（`RecordForm`に query param 等でのプリフィル機構が無いため、今回のスコープ外にした）
- 提案は産地の記録が2件以上・精製方法が同率首位でない場合のみ出るため、記録数が少ないうちはほとんどのユーザーで空になる（Insightと同じ閾値設計の トレードオフ）

### 2026-08: DiscoverへのHome導線を追加（「discover pageの導線がありません」への対応）

上記でDiscoverをEntity Detailページのみに実装したところ、「Discover機能への導線がHomeに無く、自力でその産地のEntity Detailページへたどり着かない限り存在に気づけない」という指摘。置き場所をユーザーに確認し、「Homeに小さなテキストリンクを追加」を選択（InsightBanner/GraphPreviewのような目立つカードにはせず、控えめな1行のリンクにする）。同じbranch（`feat/discover-cqi-recommendations`）で継続。

- `backend/core/discover/discoverBuilder.js`: `buildDiscoverTeaser(records, cqiDataset)`を追加（純粋関数）。自分が記録した産地をすべて横断して`buildOriginDiscovery`を呼び、条件を満たす提案の中から品質スコアが最も高い1件を選ぶ。候補が無ければ`teaser: null`
- `backend/services/coffee/discoverService.js`: `getHomeTeaser(userId)`を追加。CQI JSONのキャッシュは既存の`loadCqiDataset()`を再利用
- `backend/controllers/discoverController.js` / `backend/routes/discoverRoutes.js`: `GET /api/discover`（nodeIdを取らないルート、`/api/insights`と同じ形）を追加。既存の`GET /api/discover/nodes/:nodeId`は無変更
- `frontend/src/features/discover/`: `api/discoverApi.js`に`fetchDiscoverTeaser`、`hooks/useDiscoverTeaser.js`（`useInsights.js`と同じ構成）、`components/DiscoverTeaserLink.jsx`（新規）を追加。カードではなく1行のテキストリンク（Compassアイコン+文言）で、クリックすると該当産地のEntity Detailページ（`teaser.nodeId`）へ遷移する。`teaser`が`null`・読み込み中・エラー時は何も表示しない
- `frontend/src/pages/HomePage.jsx`: Insight/GraphPreviewの行の下に`DiscoverTeaserLink`を追加
- `frontend/src/i18n/locales/{ja,en}.json`: `discover.teaserLink`キーを追加
- `docs/discover.md`: 「Home Teaser」セクションを追加。`docs/api.md`にも`GET /discover`を追加

テスト:
- `backend/tests/discoverBuilder.test.js`: `buildDiscoverTeaser`のテストを追加（候補無し→null、複数産地から品質スコア最高の1件を選ぶ）
- `backend/tests/discoverApi.test.js`: `GET /api/discover`の未認証401・候補無し→`teaser: null`・自分の記録だけから作る（他ユーザー分離）を追加
- `npm run test`（backend）: 21 suites / 304 tests すべて成功
- `npm run lint` / `npm run build`（frontend）: 成功
- Docker Compose環境（demoユーザー）で実機確認: Home画面下部に「Costa Rica産のコーヒー、まだ試していません」というテキストリンクが表示され、クリックするとGuatemala（基準になった産地）のEntity Detailページへ遷移し、同じCosta Rica提案が表示されることを確認

### 2026-08: デスクトップのナビゲーションを左サイドバーから上部ナビバーへ置き換え

ユーザーから「サイドバーを無くしても良いと思う」という提案。常時208px（`w-52`）を専有する左サイドバーは、ナビ項目がHome/Records/Graph/Statsの4つと少なく、Home画面の幅を1400px超まで広げてきた最近の作業とも逆行しているため、置き場所だけ「上部ナビバー」へ変更することで合意。モバイルのハンバーガー+ドロワー+下部タブバーは今回の指摘の対象外のため変更していない。同じbranch（`feat/discover-cqi-recommendations`）で継続。

- `frontend/src/components/Navbar.jsx`: `md`以上で常時表示していた左サイドバー（`aside`、`md:translate-x-0`）を`md:hidden`にし、モバイル専用のドロワーへ役割を絞った。代わりに`md`以上でのみ表示する新しい上部ナビバー（`hidden md:flex`、高さ`h-14`）を追加し、ロゴ・Home/Records/Graph/Statsのリンク・言語切り替え・Profile/Logout（未ログイン時はLogin/Register）を横並びに配置。NavLinkのアクティブ状態クラス（旧`sidebarLinkClass`）は`navLinkClass`という名前にして、モバイルドロワーとデスクトップ上部ナビバーの両方で共用している
- `frontend/src/App.jsx`: `main`のクラスから`md:ml-52`（サイドバー分の左余白）を削除し、`md:pt-0`もやめて`pt-14`をデスクトップ・モバイル共通にした（両方とも上部バーの高さが揃ったため）。最終的に`"pt-14 pb-16 md:pb-0"`
- `frontend/src/App.css`の`.home-banner`（`md`以上でサイドバー幅ぶんを打ち消すための`margin-left: -13rem`を持つルール）は、現在どのJSXからも参照されていない死んだCSSだったため、今回は触れずそのまま残した（未解決事項に記載。混乱を避けるため次回整理候補）
- `frontend/lint`・`frontend/build`成功を確認
- ブラウザで実機確認済み: デスクトップ幅（1500px相当）で上部ナビバーが表示され、Home画面がサイドバー分の余白無くフル幅で使えることを確認。ページ遷移時のアクティブ状態のハイライトも正しく切り替わることを確認。モバイル幅（実測606px、`md`未満）ではハンバーガーメニュー・ドロワー・下部タブバーが変更前と同じ見た目・動作のままであることを確認

### 2026-08: HomeのInsight/Discoverの導線を1枚の「Discover」カードへ統合

DiscoverのHome導線（1行のテキストリンク）についてユーザーとUI/UXレビューを行った結果、「Homeの一番下・薄いグレーの下線テキストで気づかれにくい」という弱点を指摘。対応案として「独立のまま位置・強さだけ調整」と「InsightBannerに統合する」の2案を検討し、ユーザーから「統合した方がRecord→Connect→Discoverの方向性が明白になる」という意見が出た。最終的に「裏側のデータ・ロジックは分離したまま、Home画面での見せ方だけ1枚の"Discover"カードへ統合する」という折衷案で合意。同じbranch（`feat/discover-cqi-recommendations`）で継続。

- `frontend/src/features/insights/utils/describeInsight.js`（新規）: `InsightBanner.jsx`にあった`insight.type`→文言のマッピング関数を、純粋関数として切り出した
- `frontend/src/features/insights/components/InsightBanner.jsx`・`frontend/src/features/discover/components/DiscoverTeaserLink.jsx`を削除（どちらもHomePage.jsx以外から使われていなかったことを確認済み。役目は新設の`DiscoverCard.jsx`が引き継ぐ）
- `frontend/src/features/discover/components/DiscoverCard.jsx`（新規）: Home画面に表示する統合カード。`useInsights`（Insight用）と`useDiscoverTeaser`（Discover用）を両方呼び出し、それぞれの結果を同じカード内の別々の行として描画する。データの合成はしておらず、Insight行は`/graph`、Discover行は対象産地のEntity Detailページへ、それぞれ別々の`Link`のまま。見出し「Discover」はLandingPageの「Record/Connect/Discover」と同じ言語非依存のブランド語として扱い、翻訳しない（初めて認証後の画面に"Discover"という単語が現れる）。片方だけ・両方・どちらも無し、の3パターンを出し分け、両方無ければカード自体を非表示にする
- `frontend/src/pages/HomePage.jsx`: `InsightBanner` + 下部の`DiscoverTeaserLink`という2要素を削除し、Insight/GraphPreviewの横並び行の左側（`flex-[2]`列）を`DiscoverCard`に差し替え。GraphPreviewの位置・比率は変更なし
- `frontend/src/features/discover/components/DiscoverSuggestions.jsx`: コメント内の`InsightBanner.jsx`という古いファイル参照を修正（実体は削除済みのため）
- `docs/insights.md` / `docs/discover.md`の「表示」節を更新。バックエンド（`core/insights/insightBuilder.js`・`core/discover/discoverBuilder.js`・両APIエンドポイント）は無変更であることを明記
- `frontend/lint`・`frontend/build`成功を確認
- ブラウザで実機確認済み（幅1500px相当）: Home画面に「DISCOVER」という見出しの付いた1枚のカードが表示され、その中にInsightの一文（Sparklesアイコン）とDiscoverの提案（Compassアイコン）が別々の行として並ぶことを確認。Insight行をクリックすると`/graph`へ、Discover行をクリックすると該当産地のEntity Detailページへ、それぞれ正しく遷移することを確認

### 2026-08: Discover専用ページ（`/discover`）を追加

Home画面のDiscoverカードの導線について、「Costa Ricaの話なのにクリックするとGuatemalaのページに飛ぶ」という指摘（Costa Ricaはまだ記録が無く自分の知識グラフにノードが無いため、提案の根拠になった産地Guatemalaのページへ遷移する仕様）。ユーザーへ「Discover専用ページを新設してはどうか」と提案し、StatsページがHomeのInsightに対する「全体のふりかえり」であるのと同じ関係をDiscoverにも作る、という方向で合意。常設ナビには追加せず、HomeのDiscoverカードの「すべて見る」リンクからのみ到達する形にした。同じbranch（`feat/discover-cqi-recommendations`）で継続。

- `backend/core/discover/discoverBuilder.js`: `buildAllOriginDiscoveries(records, cqiDataset)`を追加（純粋関数）。自分が記録した産地のうち条件を満たすものすべてを、各産地の最良の提案のスコア降順で返す。内部で`buildOriginDiscovery`を産地ごとに呼ぶだけで、ロジックの重複は無い
- `backend/services/coffee/discoverService.js`: `getAllOriginDiscoveries(userId)`を追加
- `backend/controllers/discoverController.js` / `backend/routes/discoverRoutes.js`: `GET /api/discover/all`を追加
- `frontend/src/features/discover/`: `api/discoverApi.js`に`fetchAllDiscoverSuggestions`、`hooks/useAllDiscoverSuggestions.js`（新規）、`components/SuggestionCard.jsx`（新規、提案1件分のカード。Entity Detailページの`DiscoverSuggestions.jsx`から共通化して切り出した）を追加
- `frontend/src/pages/DiscoverPage.jsx`（新規）: `/discover`。産地ごとに見出し（Entity Detailページへのリンク）と提案カードを並べる。ローディング・エラー・空状態（`StatsPage.jsx`と同じ構成）を用意。見出し「Discover」はLandingPageと同じ未翻訳のブランド語
- `frontend/src/App.jsx`: `/discover`ルートを追加（常設ナビの項目としては追加していない）
- `frontend/src/features/discover/components/DiscoverCard.jsx`: Discover行に「すべて見る」（`/discover`への`Link`、`common.viewAll`を再利用）を追加。Discover行の候補が無いときはこのリンクも表示しない
- `frontend/src/features/discover/components/DiscoverSuggestions.jsx`: 提案カードの描画を`SuggestionCard.jsx`へ委譲するようリファクタ（見た目の変更は無し）
- `frontend/src/i18n/locales/{ja,en}.json`: `discover.pageSubtitle` / `discover.emptyDesc`を追加
- `docs/discover.md`に「Discoverページ」節、`docs/api.md`に`GET /discover/all`を追加

テスト:
- `backend/tests/discoverBuilder.test.js`: `buildAllOriginDiscoveries`のテストを追加（候補無し→空配列、複数産地を最良スコア順に並べる）
- `backend/tests/discoverApi.test.js`: `GET /api/discover/all`の未認証401・候補無し→空配列・自分の記録だけから条件を満たす産地すべてを返す（他ユーザー分離）を追加
- `npm run test`（backend）: 21 suites / 309 tests すべて成功
- `npm run lint` / `npm run build`（frontend）: 成功
- Docker Compose環境（demoユーザー）で実機確認: HomeのDiscoverカードの「View all」をクリックすると`/discover`へ遷移し、Guatemala・Kenyaそれぞれの見出しと提案カードが表示されることを確認。産地の見出し（例: Guatemala）をクリックすると、正しくGuatemalaのEntity Detailページへ遷移することを確認

### 2026-08: Discover行のリンク先を`/discover`へ直接変更し、「View all」リンクを削除

「View all」を追加したことで、HomeのDiscoverカードには「Discover行（Entity Detailページへ）」と「View all（Discoverページへ）」という2つのリンクが並んでいた。ユーザーから「View allリンクの必要性を感じない、Discover行自体をクリックしたらDiscoverページに進む導線にしてほしい」という指摘。Discover行のリンク先をEntity Detailページから`/discover`へ差し替え、「View all」リンクは削除して1つのリンクに整理した。同じbranch（`feat/discover-cqi-recommendations`）で継続。

- `frontend/src/features/discover/components/DiscoverCard.jsx`: ヘッダー行にあった「View all」（`common.viewAll`、`/discover`へのLink）を削除し、見出し「Discover」だけの単純な`<span>`に戻した。Discover行（Compassアイコンの行）の`Link to`を`` `/entities/${encodeURIComponent(teaser.nodeId)}` ``から`"/discover"`へ変更
- `docs/discover.md`の「Home Teaser」「Discoverページ」節を更新し、Discover行が直接`/discover`へのリンクになっていること・別リンクを持たないことを明記
- `frontend/lint`・`frontend/build`成功を確認
- ブラウザで実機確認済み: HomeのDiscoverカードから「View all」が消え、Discover行（"You haven't tried Costa Rica coffee yet"）をクリックすると`/discover`へ直接遷移することを確認

上記までを`feat/discover-cqi-recommendations`として1コミットにまとめ、`main`へ`--no-ff`でマージ済み（コンフリクト無し）。マージ後に`cd backend && npm test`を再実行し、Test Suites: 21 passed, Tests: 309 passed を確認済み。

### 2026-08: 上部ナビバーのロゴからコーヒーアイコンを削除

ユーザーから「上部navbarのcoffee-appの横にあるコーヒーアイコンを消してほしい」という依頼。`mainへ直接コミット`（1ファイル・アイコン3箇所の削除のみのため、専用branchは作成しなかった）。

- `frontend/src/components/Navbar.jsx`: モバイル用トップバー・モバイル用ドロワー・デスクトップ用上部ナビバーの3箇所すべてから、ロゴの`☕`（`<span aria-hidden="true">☕</span>`）を削除。「Coffee App」の文字だけのロゴになった。LandingPage.jsx（未ログイン時のランディングページ）の`☕`は対象外のため変更していない
- `frontend/lint`・`frontend/build`成功を確認
- ブラウザで実機確認済み（デスクトップ幅・demoユーザーでログイン後）: 上部ナビバーのロゴが「Coffee App」の文字のみになったことを確認

続けて「LandingPageのロゴのコーヒーアイコンも消してほしい」という依頼。LandingPage.jsxのロゴはアイコンのみ（Navbar.jsxと違い「Coffee App」の文字を伴っていなかった）だったため、単純に削除すると左上のブランド表示が空白になってしまう。Navbar.jsxと同じ「文字だけのロゴ」に揃える形にした。

- `frontend/src/pages/LandingPage.jsx`: `<span className="landing-nav-logo" ...>☕</span>`を`<span className="text-base font-black tracking-tight text-ctp-lavender">Coffee App</span>`へ差し替え。Navbar.jsxのデスクトップ用ロゴと同じクラスの組み合わせにして見た目を揃えた
- `frontend/src/App.css`: 上記の変更でどこからも参照されなくなった`.landing-nav-logo`（アイコン用の28px×28pxサイズ指定）を削除
- `frontend/lint`・`frontend/build`成功を確認
- ブラウザで実機確認済み（ログアウトして`/landing`を表示）: 左上のロゴが「Coffee App」の文字のみになり、認証後のNavbarと同じ見た目に揃ったことを確認

### 2026-08: Recordsページのブラッシュアップ（「記録を管理する画面」→「過去のコーヒー体験を探し、再発見する画面」）

Homeのデザインを整えてきた流れで、次はRecordsページ。ユーザーから「機能・検索・フィルター・データ取得ロジックは維持したまま、Record→Connect→Discoverのうち過去のRecordを振り返る入口としてUI/UXをブラッシュアップしてほしい」という具体的な指定（コンテンツ幅・ヘッダー・filter barの見せ方・カードの情報階層・タグ・hover・レスポンシブ）を受けて実装。バックエンド・API・DB schema・依存関係はすべて無変更。mainへ直接コミット可能な範囲（frontendのみ、他ページへの影響なし）と判断し、専用branchは作成しなかった。

実装前に`RecordCard`の参照元を確認し、`RecordsPage.jsx`と検索結果表示`SearchResults.jsx`の2箇所のみで使われていること（`HomePage.jsx`は別コンポーネントの`HomeRecordCard`を使用）を確認した上で着手した。Home/Graph/Statsには影響しない。

- `frontend/src/pages/RecordsPage.jsx`: コンテンツ幅を`max-w-3xl`（768px）から`max-w-[900px]`へ拡張。`SearchBox`と`RecordFilters`を1つの枠（border+背景）にまとめ、「検索フォームの羅列」ではなく「Recordsをブラウズする単一のfilter bar」に見えるようにした。検索中（`isSearching`）はこのbar内のfilter行を隠し、検索欄だけを残す（絞り込みと横断検索は元々同時に使わない設計のため、bar内での見た目の一貫性のみを変更）
- `frontend/src/features/coffee-records/components/RecordFilters.jsx`: 縦積み2ブロック（type toggleの行→origin/flavor/ratingのgrid-cols-3の行）だったレイアウトを、`flex flex-wrap justify-between`による横並び1行（左: All/Home/Cafeのtoggle、右: Origin/Flavor/Ratingのselect＋Clear filters）に再構成。狭い画面では左右2グループがそれぞれ独立して折り返す。各selectの上にあった常時表示ラベルは`sr-only`化し、コンパクトな専用クラス（`compactSelectClass`）を追加（`RecordForm.jsx`が使う`formStyles.js`の`controlClass`とは分離し、フォーム側の見た目には影響させていない）
- `frontend/src/features/coffee-records/components/RecordCard.jsx`: これまで表示していなかった`record.process`（精製方法。APIレスポンスには既に含まれていたが未表示だった）をタグとして追加。カードのpaddingを`p-4`→`p-5`（`sm:p-6`）、タグ行の余白を`mt-3`→`mt-4`に拡大。カード全体のhoverに`-translate-y-px`＋背景の微変化を追加（`transition-all duration-200`）。タグ（origin/process/flavor）は共通の`tagClass`にまとめ、border/背景/1px浮き上がりの小さなhoverを付けた（クリックでのフィルター適用は今回実装していない。理由は後述）。産地には既存のMapPin、精製方法には知識グラフと同じDropletsアイコン（`docs/design.md`のGraph Visual Semantics、`features/graph/utils/nodeVisuals.js`と同じ対応）を付け、フレーバーは従来通りアイコン無しの単純なpillのまま（色を増やしすぎない、情報を増やしすぎない指定に沿った）
- `frontend/src/features/coffee-records/components/RecordListStates.jsx`: ローディングスケルトンのpadding・余白をカードの新しいサイズに合わせて調整（表示位置が飛ばないように）

見送った項目: タグクリックでの該当フィルター適用（ユーザー指定の項目5で「ロジック変更が大きくなる場合は今回は実装しない」と明記されていた）。`RecordFilters`にはprocess用のフィルターが無く、origin/flavorタグだけクリック可能でprocessタグだけ効かない、という一貫性の無いUIになるため見送った。hoverの視覚フィードバックのみ実装し、実装候補として下記「次に実装すべき最小単位」に記載した。

- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境（demoユーザー、幅1600px）で実機確認: filter barが1つのまとまりに見えること、origin絞り込みで正しく1件に絞られ「Clear filters」が同じbar内に表示されること、横断検索（「ethiopia」）でfilter行が隠れ検索欄だけが残ること、検索結果のカードにもprocessタグが表示されることを確認。幅390px（モバイル相当）でヘッダーの「New Record」が窮屈にならないこと、filter barのtoggle行→select行が自然に折り返ること、カード内のタグが折り返ることを確認。Home画面（`HomeRecordCard`使用、別コンポーネント）に見た目の変化が無いことも確認済み

### 2026-08: Recordカードのタグをエンティティ詳細ページへのLinkにする

上記のRecordsブラッシュアップで「タグクリックでのフィルター適用は一貫性が崩れるため見送った」としていたが、ユーザーから「タグをクリックしたら関連ページ（例: Washedならその一覧）に進む方が良いのでは」という提案を受けた。相談の結果、`/entities/:nodeId`（Entity Detailページ、`docs/entity-detail.md`）が既にこの用途（そのタグに紐づく記録数・平均評価・関連する他の属性・関連記録をまとめて見せる）のために存在していると気づき、フィルター適用ではなくこちらへのリンクとして実装することにした。origin/process/flavorのどのタグも同じ`/entities/${type}:${id}`という形でリンクできるため、前回の「processだけ効かない」という一貫性の問題も解消される。バックエンド・API・データ取得ロジックは変更不要（`record.origin.id`等は既にAPIレスポンスに含まれている）。

実装前にユーザーと一緒に技術的な論点を確認した: カード全体が1つの`<Link>`（記録詳細へ）である中に、タグを別の`<Link>`（エンティティ詳細へ）として追加すると、`<a>`の中に`<a>`という不正なDOMになる。HTMLパーサーを介する静的HTMLと違い、Reactは`document.createElement`でDOMを直接組むため、ブラウザの構文修復（parserが自動的に外側の`<a>`を閉じる挙動）が働かず、不正な入れ子がそのまま残る。実際に発生する不具合として、クリックイベントが内側→外側へbubbleし、外側Linkの`navigate()`が後から実行されて上書きしてしまう（タグを押したつもりが記録詳細へ飛ぶ）ことを説明し、合意の上で対処方針（stretched linkパターン）を決めてから実装した。

- `frontend/src/features/coffee-records/components/RecordCard.jsx`: カード全体用のLinkを`absolute inset-0`の透明なリンク（stretched link、`aria-label`に記録タイトルを設定）にし、タグは通常のフロー内Linkとしてその上に置く構成へ変更。`entityPath(type, id)`ヘルパーを追加し、origin/process/flavorそれぞれのタグから`/entities/${type}:${id}`（`docs/knowledge-graph.md`のstable ID形式と同じ）へ遷移するようにした
- 実装中に自分で踏んだ不具合: タグの行（`<div>`）に`relative`を付けて stretched link より前面に出す際、同じ理由でタイトル側の行にも`relative`を付けていた。CSSのスタッキング順では非positioned要素がpositioned要素より先に描画され、positioned要素（z-index:auto）はDOM順で後にあるものが上に乗る。両方に`relative`を付けたことで、タイトル側の行もstretched linkの上に乗ってしまい、タイトルなどカードの主要部分をクリックしても反応しなくなる不具合を作り込んだ。ブラウザで実際にクリックして検証し発見（`document.elementFromPoint()`でクリック位置の最前面要素を確認し、原因を特定）。タイトル側の行から`relative`を外す（static のままにし、stretched linkの下に留める）ことで解消
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境（demoユーザー）で実機確認: `document.elementFromPoint()`でカード余白・タイトル部分では stretched link（`/records/:id`）が、タグの上ではタグ自身のLink（`/entities/:nodeId`）が最前面にあることを確認した上で、実際のクリックでも同じ結果（タグ以外はRecord Detailへ、タグはEntity Detailへ）になることを確認。「Washed」タグ→Process「Washed」のEntity Detail、「Honey」タグ→Flavor「Honey」のEntity Detailへ、それぞれ正しい統計・関連記録が表示されることを確認

### 2026-08: Record詳細ページのUI改善（「記録の閲覧画面」から「知識グラフへの入口」へ）

Recordsページのブラッシュアップに続き、Record詳細ページ（`RecordDetailPage.jsx`）を再設計。ユーザーから9項目（Breadcrumb・Header・Property Grid・Tasting Note・Connections・View in Graphの移動・Actions・レイアウト・Micro Interaction）の具体的な指定を受けて実装した。API・DBスキーマは無変更。

実装前に1点、ユーザーへ確認した: 新設のProperty Grid・Connectionsセクションの指定にOrigin/Process/Roast/Flavorの4項目のみが明記されており、現状表示しているFarm（農園）・Variety（品種）・Roaster（焙煎業者）を削除するのか判断がつかなかったため。ユーザーの回答は「Property Gridには残す（Connectionsは指定通り4種別のみでよい）」で、この方針で実装した。

- `frontend/src/features/graph/utils/entityLink.js`（新規）: `entityNodeId(type, id)` / `entityDetailPath(type, id)`。前回`RecordCard.jsx`にローカルで定義していたエンティティ詳細パス生成ロジックを共通化し、今回`RecordDetailPage.jsx`のConnectionsチップからも使うようにした（同じロジックが2箇所に重複するのを避けるため）
- `frontend/src/features/coffee-records/components/RecordCard.jsx`: 上記の共通化に伴うimportの差し替えのみ（見た目・挙動は無変更）
- `frontend/src/pages/RecordDetailPage.jsx`: 全面的に再構成
  - Breadcrumb: 「← 一覧へ戻る」を`Records > 記録タイトル`のBreadcrumbへ（`Records`は`/records`へのLink、ナビの表記に合わせ翻訳しない）
  - Header: 構成はほぼ既存のまま（タイトル・日時は左、評価は右、`flex-wrap`でモバイル対応）
  - Coffee Information: 「コーヒーの詳細」カード（`cardClass`の枠・背景）を廃止し、通常のセクションへ。Property GridにOrigin/Farm/Variety/Process/Roast/Roaster（値がある項目のみ、`collectCoffeeDetails`を再利用）とFlavor（タグ形式）を表示
  - Tasting Note: メモをセクション化。`divide-y divide-ctp-surface1`でCoffee Information・Tasting Note・Connectionsの間に自動でDividerが入るようにした（`first:pt-0`で先頭セクションの余分な上paddingを消す。条件次第でどのセクションが先頭に来るかが変わるため、CSSの`:first-child`で動的に対応させた）
  - Connections（新規）: 知識グラフのノードに対応する4種別（Origin/Process/Roast/Flavor）だけをノード風のチップで表示。Graph画面・エンティティ詳細ページと同じアイコン・配色（`features/graph/utils/nodeVisuals.js`の`getNodeVisual`）を再利用し、この記録が知識グラフのどのノードにつながっているかを一目で伝える。各チップは`entityDetailPath`で`/entities/:nodeId`へのLink
  - View in Graph: ボタンからテキストリンクへ変更し、Connectionsセクションの見出し行右側へ移動。遷移先（`/graph?focus=record:${record.id}`）は無変更
  - Actions: Edit（primaryButtonClass、Editが実質唯一の主要導線になったためsecondaryから格上げ）+ Moreメニュー（「・・・」ボタン）の2つへ。Deleteは自前実装のMoreメニュー内へ移動（outside click / Escapeで閉じる。外部のdropdown/popoverライブラリは追加せず、`ConfirmDialog.jsx`と同じ「必要な分だけ自前で作る」方針を踏襲）。削除自体の確認ダイアログ（`ConfirmDialog`）は変更なし
  - Micro Interaction: Breadcrumbのリンク・Connectionsチップ・View in Graphリンク・Editボタンにそれぞれ控えめなhover（色変化、チップは1px浮き上がり+背景変化）を追加
- `frontend/src/i18n/locales/{ja,en}.json`: 新規キー3つ（`records.connectionsHeading`＝「つながり」/「Connections」、`records.breadcrumbAriaLabel`、`records.moreActionsLabel`）を追加。それ以外はすべて既存キーを再利用した（例: Tasting Noteの見出しは新しい訳を作らず既存の`records.notesHeading`＝「メモ」のまま。フィールド名はAPI/ドメインモデルの`notes`と統一するため、CLAUDE.mdの「UIとAPIで用語を統一する」に沿った判断）
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境（demoユーザー）で実機確認:
  - Breadcrumb・Header・Property Grid（Origin/Process/Roast/Flavorのみの記録、Farm/Variety付きの記録の両方）・Divider・Connectionsチップ（アイコン・配色がGraph/エンティティ詳細と一致）・「Graphで見る」テキストリンクの表示を確認
  - Moreメニューを開いてDelete項目が表示され、クリックすると既存のConfirmDialog（削除確認）が開くことを確認（実際の削除は行わず、キャンセルで検証）
  - Connectionsの「Washed」チップをクリックし、Process「Washed」のエンティティ詳細ページへ正しく遷移することを確認
  - Farm「Finca El Injerto」・Variety「Bourbon」を持つ記録（Guatemala Antigua）で、Property Gridには表示されるがConnectionsには含まれない（指定通りOrigin/Process/Roast/Flavorの4種別のみ）ことを確認
  - チップ・Breadcrumbリンクのhover（背景変化・浮き上がり）を確認
- 未検証: モバイル幅での実際の折り返しは、このブラウザ自動化ツールが実ビューポート幅を変更できない制約（`resize_window`を呼んでも実際のレンダリング幅が変わらない。Recordsページの過去エントリで記録済みの既知の制約と同じ）のため、目視確認できていない。ヘッダー・Breadcrumb・Actionsはいずれも`flex-wrap`、Property Gridは`grid-cols-1 sm:grid-cols-2`を使っており、他画面で実績のあるレスポンシブパターンと同一のため大きな懸念は無いが、実機での確認を推奨

**続けて**、ユーザーから「Connections部分をインライングラフでわかりやすくしたい」という相談。フラットなチップ一覧ではなく、記録を中心に直接つながるノードを図として見せたい、という意見交換の中でユーザーからASCIIスケッチ（Origin=上・Process=左・RoastLevel=右・Flavorは下で枝分かれ、という配置）の提示を受け、それを一般化して実装した。

技術方針の相談で、Graph画面のcanvasライブラリ（react-force-graph-2d）は使わないことを提案し合意を得た。理由: (1) そちらは過去に何度もズーム・ドラッグ・クリックの不具合を踏んで安定させた経緯があり、小さい埋め込み領域で同種の問題（コンテナサイズ計測・当たり判定）を再び踏むリスクがある、(2) Connectionsのデータは「記録1件+直接の接続先（最大でも十数ノード）」という常に決まった小さな構造で、そもそも力学シミュレーションが要る問題ではない、(3) react-force-graph-2dは現在Graph画面（lazy-loadされる別ルート）でしか使っておらず、よく訪れるRecord詳細ページに再び持ち込むと依存が重くなる（Home画面のグラフプレビューも同じ理由で実データ+静的SVGへ置き換えた経緯がある）。

- `frontend/src/features/graph/utils/recordConnectionsLayout.js`（新規、DOM非依存の純粋関数）: `buildRecordConnectionsLayout({ origin, process, roastLevel, flavors })`。中心(50,50)に記録ノードを置き、Origin=上(50,14)／Process=左(14,50)／RoastLevel=右(86,50)の固定スロット、Flavorは下側(y=76の幹→y=90の葉)へ均等に扇状展開する座標を0〜100のパーセンテージ空間で返す。値が無い項目はそのスロット自体を省く（既存のConnections chip実装と同じ「断定しない」方針）。Flavorは最大5件までを図に描き、それを超えた分は`flavorOverflowCount`として返す（RecordCardの一覧カードで既に使っている「+N」パターンと統一）
- `frontend/src/features/graph/components/RecordConnectionsDiagram.jsx`（新規）: 上記レイアウトを描画。接続線はSVG（`aria-hidden`、装飾）、各ノードは実際の`Link`要素（`entityDetailPath`で`/entities/:nodeId`へ）を同じ0〜100%の座標系に`position: absolute; left/top: %`で重ねて配置。ノードのアイコン・配色はGraph画面・エンティティ詳細ページと同じ`getNodeVisual`を再利用。中心の記録ノードのみ非リンク（記録タイトルを短く表示）。ノードのhoverは`group`/`group-hover`で、位置決め用のtransform（`-translate-x-1/2 -translate-y-1/2`）と浮き上がり用のtransformを別要素に分離し、Tailwindのtransformユーティリティ同士が競合しないようにした
- `frontend/src/pages/RecordDetailPage.jsx`: Connectionsセクション内の`ConnectionChip`のflatな一覧を`RecordConnectionsDiagram`に差し替え。見出し・「Graphで見る」リンクの位置は変更なし
- `frontend/src/i18n/locales/{ja,en}.json`: `records.connectionsFlavorOverflow`（「ほかに{{count}}件のフレーバー」/「+{{count}} more flavors」）を追加
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境（demoユーザー）で実機確認: Rwanda Huye Mountain（Origin/Process/RoastLevel/Flavor×2）でユーザーのスケッチ通りの配置になることを確認。Ethiopia Yirgacheffe（Flavor×3）でも枝分かれが均等に広がることを確認。「Ethiopia」ノードをクリックしOriginのエンティティ詳細ページへ正しく遷移することを確認。ノードhoverで背景・枠線の変化を確認。コーヒー要素が何も無い記録（「とりあえず買った豆」）でConnectionsセクション自体が表示されないこと（既存の空状態ロジックと同じ）を確認。Flavor 8件（デモデータ最大の3件を超えるケース）での「+3」オーバーフロー表示は、Node REPLで`buildRecordConnectionsLayout`を直接呼び出し、5件が均等配置され`flavorOverflowCount: 3`になることを計算ロジックとして確認（デモデータに8件を持つ記録が無いため、UI上の見た目は未確認）

**続けて**、ユーザーから3点の微調整依頼: (1) 中央Recordノードのラベルが省略されすぎる、(2) ノード間隔をもう少し中央へまとめたい、(3) 各ノードのhoverで種別（Origin/Process/Roast/Flavor等）をTooltip表示したい（例: 「Ethiopia → Origin」）。「現在のレイアウト・色・アイコン・edge表現は維持する」「Graph本体には影響を与えない」という制約付きだったため、`recordConnectionsLayout.js`・`RecordConnectionsDiagram.jsx`の2ファイルのみの変更に収めた（Graph画面本体・`nodeVisuals.js`・`GraphCanvas.jsx`等は無変更）。

- `frontend/src/features/graph/utils/recordConnectionsLayout.js`: 中心からの距離を約17%縮小（単一スロットのoffsetを36→30、Flavorの幹・葉・広がりも同じ比率で縮小）。レイアウトの形（Origin=上・Process=左・RoastLevel=右・Flavor=下で扇状）自体は変更していない
- `frontend/src/features/graph/components/RecordConnectionsDiagram.jsx`:
  - 中心ノードのラベルを`truncate`（1行省略）から`line-clamp-2`（2行まで表示してから省略）へ、幅も`max-w-[7rem]`→`max-w-[10rem]`に拡大。他ノードのラベル幅（`max-w-[4.5rem]`）は変更していない（中心だけ広げる、という指定通り）
  - 各ノード（Origin/Process/RoastLevel/Flavor）にhover/focus時に出る自前のTooltipを追加。「{ラベル} → {種別}」の形式（例: 「Ethiopia → Origin」）。種別のラベル文言は新しい訳を作らず、Graph画面の凡例等と同じ`graph.nodeTypes.*`翻訳キー（`getNodeVisual(type).labelKey`経由）を再利用した。ネイティブの`title`属性は使わず（表示までの遅延があり、スタイルも合わせられないため）、`group`/`group-hover`・`group-focus-visible`によるopacity切り替えで自前実装した
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境（demoユーザー）で実機確認: Rwanda Huye Mountainでノード間隔が縮まり中央にまとまって見えることを確認。「Rwanda」ノードにhoverすると「Rwanda → 産地」、英語表示に切り替えて「Medium Light」ノードにhoverすると「Medium Light → Roast Level」というTooltipが表示されることを確認（ユーザー提示の例は「Roast」だったが、Graph画面の凡例と表記を統一するため既存の「Roast Level」をそのまま使った）。中央ラベルの2行表示は、ブラウザのJavaScript実行で一時的に長いタイトルへ差し替えて確認（デモデータに十分長いタイトルの記録が無いため）。他の記録（Blue Bottle - Ethiopia Worka等）で通常時のレイアウト・省略が崩れていないことも確認

### 2026-08: Graph画面で「たまにノードが巨大化して見える」不具合の調査・対処

ユーザーからスクリーンショット付きで「Graphページでたまにノードが画像のように拡大される」という報告。バックエンド・APIは無関係、`GraphCanvas.jsx`のcanvas描画のみが対象。

原因調査は`node_modules/force-graph/dist/force-graph.mjs`を直接読んで行った（`GraphCanvas.jsx`のズーム・ドラッグ・クリック不具合を解決した回と同じ手法）。`onEngineTick`は物理シミュレーションが収束するまで毎tick`zoomToFit(0, 40)`（アニメーション時間0＝即座に適用）を呼んでいた。`zoomToFit`の実装は、呼ばれた瞬間のノードのbounding boxだけを見てズーム倍率を計算し即座に反映する。`chargeStrength: -800`という強い反発力を使っているため、シミュレーション開始直後はノード同士がまだ中心付近に固まっており、そのtickをちょうど描画してしまうと、小さいbounding boxに合わせて一瞬だけ大きくズームインしてしまう——これが「ノードが巨大化して見える」フラッシュの原因ではないかという仮説を立てた。

ユーザーに、実機での完全な再現はできていない（Docker環境で複数回リロード・フィルター切り替えを試したが、今回の一連の操作では発生しなかった）ことを正直に伝えた上で、コード上の根拠（該当箇所の抜粋）と対処方針を説明し、対処するかどうかの判断を仰いだ。ユーザーから「進めてください」との回答を得て実装した。

- `frontend/src/features/graph/components/GraphCanvas.jsx`: `onEngineTick`内の`zoomToFit(0, 40)`を`zoomToFit(80, 40)`に変更。「開いた瞬間にカメラが追従する」という既存の狙いは変えず、tickごとの瞬間移動をなめらかな追従に変えることで、一瞬だけ小さいbounding boxに合わせてカクッとズームインするフラッシュを避ける。`userInteractedRef`（ユーザーが一度操作したら以後は自動フィットしない）・`hasSettledRef`（収束後は呼ばない）のガード条件自体は変更していない。ファイル冒頭の「既知の不具合と対処」コメントに項目3として追記し、関連するuserInteractedRefの説明コメントも新しい実装（duration=0固定ではない）に合わせて更新した
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境で実機確認: 修正後、`/graph`への複数回のリロードで巨大化は発生しないこと、ズーム（スクロール）・ノードクリック（詳細パネル表示・隣接ノードのハイライト）が引き続き正常に動作することを確認。ただし元の不具合自体を確実に再現できていたわけではないため、「発生しなくなった」ことの証明はできておらず、今後もし再発する場合は追加調査が必要（未解決事項に記載）

### 2026-08: 選択中ノードを色だけでなくサイズでも強調する

Record詳細ページの「Graphで見る」やRecords一覧・検索結果からGraphへ遷移した際、`?focus=`でフォーカスされるノードが、密集したグラフの中で見つけにくいという相談。現状は選択中ノードの枠線の色・太さだけが変わる仕様だったため、サイズも拡大して欲しいという要望を受けて実装した。

- `frontend/src/features/graph/components/GraphCanvas.jsx`: `SELECTED_SCALE`（1.35倍）を追加。`recordRadius` / `attributeHalfWidth` / 新設の`attributeHalfHeight`が、選択中かどうかを受け取ってサイズを拡大するようにした。アイコンサイズは半径・幅から算出しているため自動的に追従する。当たり判定（`paintNodePointerArea`、自前クリック判定の`findNodeAtClientPoint`）も同じ拡大サイズを使うよう揃えた（見た目だけ拡大してクリック領域が元のサイズのままだと、拡大した部分をクリックしても反応しないズレが生まれるため）
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境で実機確認: `/graph?focus=record:...`・`/graph?focus=origin:...`のどちらも、対象ノードが色付きの枠に加えて明らかに大きく表示されることを確認。別のノードをクリックして選択を外すと、元のサイズへ正しく戻ることも確認

### 2026-08: `?focus=`遷移時にカメラをフォーカス対象ノードの周辺へズームする

上記「選択中ノードを色だけでなくサイズでも強調する」を実機確認した際、ユーザーから「拡大表示されていない」との指摘。ノード自体の拡大は機能していたが、記録数が多いグラフ（約60ノード）ではカメラが全体表示のまま変わらないため、拡大しても豆粒程度にしか見えないことが原因だった。「Record詳細ページからGraphへ移動した際、関係するノードにフォーカスしてほしい」という当初の要望に対しては、ノードの拡大表示だけでなく、カメラそのものをそのノードの周辺へズームする対応が必要だった。

- 調査: `zoomToFit(duration, padding, nodeFilter)`の第3引数でbounding box計算の対象ノードを絞り込めることを`force-graph.mjs`本体で確認し、それまでカメラ追従を駆動していた`onEngineTick`/`onEngineStop`から、フォーカス対象ノード＋隣接ノードだけを渡す`fitCamera`を呼ぶよう変更した。しかし実機で確認したところカメラは全体表示のまま変わらなかった。原因調査のため`onEngineTick`/`onEngineStop`にカウンタ（`window`直下の一時変数）を仕込んで確認したところ、ノードは力学シミュレーションで実際に広がっている（`fgRef.current.getGraphBbox()`で非自明な範囲を確認済み）にもかかわらず、この2つのコールバックが一度も呼ばれていないことが判明した。`react-force-graph-2d`（`react-kapsule`経由のprop連携）と`force-graph`本体の`linkKapsule`/`linkProp`の実装を読んでも、確実な原因までは特定できなかった（ファイル冒頭コメントの既知の不具合4として記録。未解決事項にも記載）
- 対処: `onEngineTick`/`onEngineStop`への依存をやめ、グラフデータが変わる（＝新しく開いた・フィルターが変わった）たびに自前の`requestAnimationFrame`ループを一定時間（2000ms）走らせて`fitCamera`を毎フレーム呼ぶ方式に置き換えた。ユーザーがズーム・パン・ドラッグに触れたら以後は自動フィットを止める既存の`userInteractedRef`のガードは維持している
- `frontend/src/features/graph/components/GraphCanvas.jsx`: `fitCamera`がフォーカス対象IDを明示的な引数で受け取るようにし、追従ループが毎フレーム最新のフォーカス対象を読めるよう`selectedNodeIdRef`（ノードクリックのたびに追従ループを再始動させたくないため、ループ起動用の`useEffect`の依存配列には含めていない）を追加した。調査用に追加していた`window`直下のデバッグ変数・console.logは実装確定後にすべて削除済み
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境で実機確認: `/graph?focus=record:...`で開くと、フォーカス対象ノード（拡大表示済み）とその隣接ノードだけが画面に収まるようズームされることを確認。`focus`無しの`/graph`は従来通りグラフ全体にフィットすることを確認。グラフ画面上でノードをクリックして選択する操作は、この自動フィットの対象外のままカメラを動かさないことも確認（既存の挙動を変えていない）

### 2026-08: Statsページを3段構成へ再設計し、Collection（試した種類数）セクションを追加

Statsページのテーマとして「記録したコーヒーから、自分の飲み方や味覚傾向を振り返る」という依頼。従来はOverview（6枚のカード）・月次推移・評価分布・家とカフェの比較・5種のランキングがフラットに並んでいるだけで、ローディング・空・エラー状態もRecords/RecordDetailページの再設計で確立したパターン（`RecordListStates.jsx`のdashed border空状態・retryボタン付きエラー等）に追随できていなかった。

ユーザーとの相談の結果、以下の方針で実装した:

- ページ構成を「記録のペース → Collection → 味の傾向」の3段構成にする（RecordDetailPageの`divide-y`によるセクション区切りと同じ思想）。「記録のペース」は既存のOverview（記録数・平均評価・記録を始めてからの日数）＋月次推移、「味の傾向」は評価分布＋5種のランキング
- 新設の「Collection」は、産地・品種・精製方法・農園・カフェ・フレーバーそれぞれの「試した種類数」を見せるセクション（ユーザー提案）。農園名(`farmName`)はマスター化していない自由記述項目（`docs/domain-model.md`「Farm / Cafe」参照）のため、表記ゆれ対策として既存の`backend/utils/normalizeName.js`（`graphBuilder.js`がfarmNodeIdで、`statsBuilder.js`がcafeNodeIdで既に使っている、全角スペース・大小文字・前後の空白のみを吸収する軽い正規化。ハイフン等のあいまい一致は意図的にしない方針）を再利用した
- 現行の「家とカフェの比較」（`HomeVsCafeCard.jsx`）は今回は表示から外した。コンポーネント・i18nキー・バックエンドの`homeVsCafe`フィールドは削除せず残し、将来の再導入候補とした
- デスクトップで実機確認した際、他ページ共通の`max-w-3xl`（768px）だと左右の余白が広すぎるとの指摘。`RecordsPage.jsx`が`max-w-[900px]`、`HomePage.jsx`が`max-w-[1480px]`という具合に、ページごとの中身の密度に応じて個別の`max-w-[Npx]`を使う既存の慣習に倣い、Statsは`max-w-[1100px]`にした（3列のstat cardグリッド・2列のランキンググリッドが間延びしすぎない範囲で、Recordsよりは横に余裕を持たせた）。同じ相談の流れで、Record詳細ページ（`RecordDetailPage.jsx`）も`max-w-3xl`→`max-w-[900px]`に広げた（Notesの自由記述文が読みにくくなるほど広げたくなかったため、一覧の`RecordsPage.jsx`と同じ幅に揃えるに留めた。フォーム画面`RecordFormPage.jsx`は今回対象外）

実装内容:

- `backend/core/stats/statsBuilder.js`: `overview`から`originCount`/`varietyCount`/`flavorCount`を削除し、`recordCount`/`avgRating`/`firstRecordedAt`のみに縮小。新設の`collection`オブジェクト（`originCount`/`varietyCount`/`processCount`/`farmCount`/`cafeCount`/`flavorCount`）を追加。`processCount`・`cafeCount`は既存の`processGroups`/`cafeGroups`（従来`topN`にしか使っていなかった）の`.size`を使うだけで済んだ。`farmCount`のみ新規に`groupByFarm`ヘルパー（`normalizeName`で正規化した`Set`）を追加
- `backend/tests/statsBuilder.test.js`: `overview`/`collection`のアサーションを新形状に更新し、`farmName`の表記ゆれ（全角スペース・大文字小文字・前後の空白）が1件に統合されることを検証するテストケースを追加
- フロントエンド（`frontend/src/features/stats/components/`）: `StatCard.jsx`を新規切り出し（`OverviewStats.jsx`と`CollectionStats.jsx`で共有）。`OverviewStats.jsx`は3枚のカードのみに縮小。`CollectionStats.jsx`を新規作成（6枚のカード）。`MonthlyTrendChart.jsx`/`RatingDistributionChart.jsx`の見出しを`h2`→`h3`に格下げし、`MonthlyTrendChart.jsx`は見出しをカード枠の内側へ移動（従来`RatingDistributionChart.jsx`と構造が食い違っていた）。`TopRankingList.jsx`は変更なし（既に同じ見出しレベル）
- `StatsSkeleton.jsx`・`StatsEmptyState.jsx`を新規作成し、`RecordListStates.jsx`（`RecordListSkeleton`・`RecordsEmptyState`）と同じ見た目パターンに揃えた。エラー状態は新規コンポーネントを作らず`RecordsErrorState`をそのまま再利用。`useStats.js`に`reload`（retryボタン用）を追加
- `frontend/src/pages/StatsPage.jsx`: state分岐を`StatsSkeleton`/`RecordsErrorState`/`StatsEmptyState`へ差し替え、3つの`<section>`（`divide-y divide-ctp-surface1`区切り）へ再編
- i18n（ja/en）: `stats.paceHeading`/`stats.collectionHeading`/`stats.tasteHeading`/`stats.emptyTitle`を追加。`stats.collectionHeading`は`DiscoverPage.jsx`の"Discover"と同じ言語非依存のブランド語として扱い、ja/en共通で"Collection"のまま（翻訳しない）。`stats.overview.originCount`等を`stats.collection.*`へ移動し、`processCount`/`farmCount`/`cafeCount`を新規追加
- `cd backend && npm test`: 21 suites / 311 tests すべて成功（`statsBuilder.test.js`の更新分含む）。`cd frontend && npm run lint && npm run build`成功
- Docker Compose環境で実機確認: 3セクション構成・区切り線・Collectionの6項目の数値が正しく表示されることを確認。ja/en切り替えで新規見出し・"Collection"表記が崩れないことを確認。ネットワークエラー時に`RecordsErrorState`とretryボタンが表示されることを確認。モバイル幅の折り返しは、ブラウザ自動化ツールの制約でウィンドウリサイズが画面に反映されず未検証（既存の未解決事項と同様、実機での確認を推奨）

今回のスコープには含めなかった点:

- `docs/features.md`のStats節（表示する情報・Response Shape）は今回の変更に合わせた更新が必要。以前のdocs書き直しプロジェクトでの合意（内容はユーザー本人が書き、書式のみこちらで整える）を踏襲し、内容の加筆はユーザーに委ねる
- `frontend/src/pages/DiscoverPage.jsx`は、StatsPageと同じ簡易版のloading/empty/error表示のままで、今回揃えていない（次に実装すべき最小単位に記載）

### 2026-08: 「本番品質にするための改善」Tier 0（不要ファイル・死んだコードの削除）

「このアプリを本番品質にするための改善計画を立ててください」という依頼を受け、コード衛生状態・テスト/CI/セキュリティ・デプロイ/ドキュメント/アクセシビリティの3方向を並行調査し、6段階のTierに分けた改善ロードマップを作成（プランファイルとして保存）。ユーザーの指示でTier 0（低リスク・高インパクトな削除）から着手した。

- 調査（`docs/mlb-legacy-inventory.md`の「削除候補」棚卸し）: backend/frontend/fastapi-serviceそれぞれ、削除候補として記載されていたファイルが実際にまだ存在するか1件ずつ確認したところ、**全項目すでに削除済み**であることが判明。ドキュメントだけが古いまま矛盾していた
- `frontend/public/`直下の未参照画像を調査したところ、`yozo.png`・`logo-pop.JPG`の2枚がgit管理下に残っていた（`public/images/`配下の写真群は`.gitignore`で最初から除外されておりポートフォリオには含まれないため対象外と判断）。コードから一切参照されていないことを確認の上、`git rm`で削除
- `frontend/src/App.css`の`.home-banner`（サイドバー幅を打ち消す`margin-left: -13rem`等）を調査したところ、直接の対象クラスだけでなく、同じ「Home画面のMLBダッシュボード」セクション一式（`.home-quick-strip`・`.team-dashboard`・`.team-next-*`等）がJSXから一切参照されないまま合計464行残っていることが判明。全てのクラス名をgrepで未参照確認した上でまとめて削除（想定していた「`.home-banner`約30箇所」より大きい範囲になったため、削除後にユーザーへ経緯を報告した）。lint/build成功、CSSバンドルサイズが174.58KB→168.16KBに縮小したことでも裏付けを確認
  - 削除後、**別の場所（1882行目付近）にも同名クラス（`.home-player-section`等）の異なる定義が残っている**ことが判明。こちらは規模がさらに大きく今回は対応せず、未解決事項・次に実装すべき最小単位に申し送った
- `feat/graph-dynamic-visuals`ブランチ（React Flow版の旧グラフ実装、mainに未マージ・ローカルのみ・8コミット）を、破壊的操作であることをユーザーに確認した上で`git branch -D`で削除
- `docs/mlb-legacy-inventory.md`を、「削除候補」列挙のドキュメントから「削除済みの記録」へ書き換えた。あわせて、今回新たに見つかった`PageHeader.jsx`（どのページからも使われていない死んだコンポーネント）と、App.cssの残存分についても記載を追加
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境での実機確認は未実施（CSS削除・ブランチ削除・画像削除のみで、UIの見た目に影響する変更が無いため、lintとbuildの成功で十分と判断した）

未解決事項（次のエントリの「未解決事項」にも反映）:

- `App.css`のもう1箇所の未参照MLB系CSS（`.home-player-section`等）は未削除
- `PageHeader.jsx`は未削除
- Tier 2以降（既知のレスポンシブ崩れの解消、スクリーンショット追加、アクセシビリティ、フロントエンドのテスト基盤）は未着手。プランファイル（`/Users/hikarusato/.claude/plans/mossy-hatching-pebble.md`）に詳細あり

### 2026-08: 「本番品質にするための改善」Tier 1（セキュリティの基本装備）

Tier 0に続き、認証まわりのセキュリティ基本装備を実装した。5項目とも実装前にユーザーへ内容を解説し、合意を得てから着手した。

- `backend/app.js`: `helmet`を導入（`app.use(helmet())`を最上流に追加）。`X-Content-Type-Options`・`X-Frame-Options`等の基本的なセキュリティヘッダーが付与されることを、実際に起動したサーバーへ`curl -sD -`して確認した
- `backend/routes/authRoutes.js`: `express-rate-limit`を導入し、`/register`・`/login`を共有のlimiter（15分あたり10回/IP）で保護した。Jestの実行時は自動的に`NODE_ENV=test`になることを利用し、`skip: () => process.env.NODE_ENV === "test"`でテスト実行時のみ無効化（supertestが同一IPから大量にリクエストするため）。実際にログインへ12回連続でリクエストを送り、途中から`429`が返ることを確認した
- パスワードハッシュ化を`backend/models/User.js`へ集約。`userSchema.pre("save", ...)`フックを追加し、`isModified("password")`のときだけ`bcrypt.hash`する設計にした。調査の結果、`bcrypt.hash`の呼び出しは`authController.js`（新規登録）・`userController.js`（パスワード変更）に加え、`seeds/seedDemoData.js`（デモユーザー作成）にも独立して存在しており、想定していた「将来のリスク」ではなく**既に3箇所に分散していた**ことが分かった。3箇所とも呼び出しを削除し、プレーンなパスワードをモデルへ渡すだけにした
  - 実装中、Mongooseのasync pre-hookに`next`引数を渡すと`next is not a function`で全テストがコケる不具合を作り込んだ（async関数のpre-hookはPromiseの解決をもって完了とみなす仕様で、`next`は渡されない）。`next()`の呼び出しを削除して修正
- `backend/validators/authValidator.js`を新規作成し、`validateRegister`/`validateLogin`を`coffeeRecordValidator.js`と同じ`{valid, details}`パターンで実装。ただし応答形式はAppError/`validationError()`（`{error: {code, message, details}}`）へは寄せず、`authController.js`が元々使っていた`{message}`形式のまま`{message: details[0].message, details}`を返すようにした。理由: `frontend/src/utils/errorMessage.js`が"Invalid email or password"等の特定の英語文字列をそのまま照合する`LEGACY_MESSAGE_KEYS`という仕組みに依存しており、応答形式を変えるとフロントエンドの表示が壊れる（既存APIの互換性を理由なく壊さない、というCLAUDE.mdのルールに従った）。この非対称性（`/api/users/*`の401はAppError形式、認証エラー自体は旧形式）は解消せず、未解決事項に記載した
- `backend/tests/authController.test.js`・`backend/tests/userController.test.js`を新規作成。register/loginの正常系・異常系（重複メール・不正なメール形式・短すぎるパスワード等）、プロフィール更新・パスワード変更（新パスワードでログインでき、かつ二重ハッシュ化されていないことを実際のログインで確認）・退会（自分の記録も削除されること、削除後は同じトークンが使えなくなること）をカバー
- `cd backend && npm test`: 23 suites / 330 tests すべて成功（新規19件を含む）
- Docker Compose環境で実機確認: 新しい依存（`helmet`・`express-rate-limit`）がコンテナ内にインストールされておらず`ERR_MODULE_NOT_FOUND`で一時的にクラッシュしたため、`docker compose exec backend npm install helmet express-rate-limit`で追いインストールして復旧。その後、helmetヘッダーの付与・rate limitの429・デモユーザー（既存のハッシュ済みパスワード）が変更後も問題なくログインできること・新規登録時のバリデーションエラー・登録直後のアカウント削除、をすべて実機のcurlで確認した

未解決事項（次のエントリの「未解決事項」にも反映）:

- `/api/auth/*`（認証エラー自体）と`/api/users/*`（`authenticate`ミドルウェアの401等）でエラー応答の形式が異なったまま（前者は`{message}`、後者は`{error: {code, message, details}}`）。全面的に統一するにはfrontendの`errorMessage.js`・i18nの`errors.legacy.*`も含めた変更が必要なため、今回は見送った
- `npm audit`で`body-parser`・`brace-expansion`・`js-yaml`・`mongoose`・`qs`の脆弱性（1 low, 2 moderate, 2 high）が出ているが、いずれも今回追加した依存とは無関係な既存の間接依存。`npm audit fix`で直せるかは未検証
- `userController.js`の`updateProfile`が使っている`findOneAndUpdate`の`new`オプションはMongooseの非推奨警告が出ている（`returnDocument: "after"`への置き換えが必要。動作には影響なし）
- `App.css`のもう1箇所の未参照MLB系CSS・`PageHeader.jsx`は引き続き未削除（Tier 0から持ち越し）
- Tier 2以降は未着手

### 2026-08: 「本番品質にするための改善」Tier 2（既知のレスポンシブ崩れ・表示一貫性の解消）

Tier 1に続き、モバイル幅での既知の崩れと、Statsページ再設計時に取り残していた表示の一貫性を解消した。3項目とも実装前にユーザーへ内容を解説し、合意を得てから着手した。

- `frontend/src/pages/HomePage.jsx`: DiscoverCard（左）とGraphPreview（右）を横並びにする`<div className="mt-6 flex gap-6">`に`lg`未満のブレークポイントが無く、モバイル幅（実測316px）でDiscoverCardが約90pxまで潰れ文章が1文字ずつ折り返る、実機確認済みの既知バグだった。`flex flex-col lg:flex-row`へ変更し、`lg`未満は縦積みにした。DiscoverCardの高さ固定（`h-[400px]`）も`lg:h-[400px]`へ変更し、縦積み時は`h-full`で自身のコンテンツに合わせて自然な高さになるようにした（GraphPreviewは元々`h-full`で内容量が変わらないため、高さは据え置き）
- Statsページの`CollectionStats`グリッド（`grid-cols-2 sm:grid-cols-3`）と`BottomTabBar`（5タブ、`.bottom-tab { flex: 1 }`）は、ブラウザのウィンドウサイズを380×800へ実際に変更した上でDocker Compose環境を目視確認したところ、どちらも崩れなく表示されることを確認した（未解決事項からクローズ）
- `frontend/src/pages/DiscoverPage.jsx`: loading（枠なしの2行スケルトン）とerror（赤文字1行のみ）を、Statsページ再設計で確立したパターンへ統一した。新規`features/discover/components/DiscoverSkeleton.jsx`（実際の構成＝産地見出し＋提案カードのグループ2つ、と同じ形の骨格）を作成し、エラー状態は`RecordsErrorState`をそのまま再利用。`features/discover/hooks/useAllDiscoverSuggestions.js`に`reload`を追加してretryボタンに繋いだ（`useStats.js`に追加したときと同じ`reloadKey`パターン）。空状態は元々dashed border付きの見た目になっており対象外
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境で実機確認: ウィンドウ幅380pxで、Home画面のDiscoverCard/GraphPreviewが縦積みになり文章が正常に折り返ること、BottomTabBarの5タブ・StatsのCollectionグリッドが崩れないこと、Discoverページの通常表示に問題が無いことを確認。DiscoverPage.jsxのloading/error状態は、Statsページで確認済みの同一パターンの再利用のためコードレビューでの確認に留めた

未解決事項（次のエントリの「未解決事項」にも反映）:

- Tier 3以降（スクリーンショット・アーキテクチャ図の追加、アクセシビリティ、フロントエンドのテスト基盤等）は未着手

### 2026-08: Entity詳細・Discoverページのmax-widthを調整

Statsページ・Record詳細ページで行ったmax-width調整（`max-w-3xl`だと左右の余白が広すぎる）と同じ指摘。Tier 3に進む前に、残っていた`EntityDetailPage.jsx`・`DiscoverPage.jsx`（どちらも`max-w-3xl`＝768pxのまま）も対応した。

- 両ページとも、3列のstat cardグリッドやチップ群・グループ化されたカードリストという、Records/RecordDetailと近い密度の構成のため、`RecordsPage.jsx`・`RecordDetailPage.jsx`と同じ`max-w-[900px]`に揃えた（Statsの`max-w-[1100px]`ほどは広げていない）
- `frontend/lint`・`frontend/build`成功を確認
- Docker Compose環境で実機確認: EntityDetailPage（産地ページ）・DiscoverPageともに、stat cardグリッドやカードが間延びせず、左右の余白が改善されていることを確認

### 2026-08: 「本番品質にするための改善」Tier 3（README技術面の修正・スクリーンショット・アーキテクチャ図の追加）

Tier 3（ポートフォリオとしての見せ方）に着手する前にREADME.mdを読み直したところ、Architecture/Tech Stack/Knowledge Graphの各セクションが「知識グラフ描画にReact Flow (`@xyflow/react`)を使用」と記載したままであることに気づいた。実際には`feat/graph-dynamic-visuals`（React Flow版、Tier 0で削除済み）から`react-force-graph-2d`へ置き換え済みで、記述がコードと矛盾していた。スクリーンショットを追加する前に、この技術的な正確さを直すべきと判断し、ユーザーに確認の上で先に対応した。

- README.mdの技術記述を実装に合わせて修正:
  - Tech Stack表: 「React Flow (`@xyflow/react`) / d3-force」→「react-force-graph-2d（canvas描画 + d3-force）」
  - Knowledge Graphセクション: 存在しない`features/graph/adapters/`への言及を削除し、`GraphCanvas.jsx`が実際に行っている描画フロー（react-force-graph-2dへJSONをそのまま渡し、ドラッグにも反応する常時稼働の物理シミュレーション）に書き換え
  - Design Decisions: 「React Flowを採用した」という記述を、実際の経緯（最初はReact Flowを採用→ドラッグ時のちらつきが2度の修正でも解消せず→react-force-graph-2dへ乗り換え）に修正。乗り換え後に遭遇した未文書化の挙動（クリック判定・リサイズ・カメラ追従、いずれも本セッションでライブラリ本体のソースを読んで対処済み）を「苦労した点」に追加
  - ディレクトリ構成: 存在しない`adapters/`を削除し、実際に存在するfeature（insights/discover/search/stats）を追加
  - Featuresセクション: MVP後に追加したInsights・Search・Entity Detail・Stats・Discoverが一切記載されていなかったため追加（`docs/features.md`の内容に基づく）
  - 再利用コンポーネントの一覧から`PageHeader`を削除（実際は未使用の死んだコンポーネント）
- ArchitectureのASCIIテキスト図をMermaidのflowchartへ置き換えた（GitHub上で図として自動描画される。ユーザーと相談し、画像ファイルではなくMermaidを選択）
- 主要5画面（Home / Records / Record Detail / Graph / Stats）のスクリーンショットを実際にDocker Compose環境（デモユーザー）で撮影し、`docs/screenshots/`へ保存。READMEに新設した「Screenshots」セクション（目次にも追加）へ表形式で埋め込んだ。Graph画面はノードを選択しサイドパネルが開いた状態、Record Detail画面はConnections図が見える状態で撮影し、単なる一覧以上の情報が伝わるようにした

未解決事項（次のエントリの「未解決事項」にも反映）:

- Tier 3の残り項目（`docs/features.md`のStats節更新。内容はユーザー本人が書く方針のため未着手）
- Tier 4（アクセシビリティ）・Tier 5（フロントエンドのテスト基盤）は未着手

### 2026-08: docs/features.mdのStats節を更新（Tier 3の残り項目）

Statsページの3段構成＋Collectionセクション追加に、`docs/features.md`のStats節が追随していなかった件（上記エントリの未解決事項）。「内容はユーザー本人が書き、書式のみこちらで整える」という以前のdocs書き直しプロジェクトでの合意があったが、「Tier 3は長いので今回はそちらで書いてください」という明示的な指示を受け、今回に限り内容も含めて執筆した。

- 他セクション（Insights/Search/Entity Detail/Discover）と同じ構成（Purpose→ルールベースの説明→Source of Truth→表示する情報→Response Shape→表示）で、3段構成のテーマ・Collectionの試した種類数6項目・農園やカフェの表記ゆれ対策（`normalizeName`）・"Collection"を翻訳しないブランド語として扱う理由・`homeVsCafe`が非表示のままAPIに残っている経緯を記載
- Response Shapeを実際のAPI形状（`collection`オブジェクトの新設）に更新し、`overview`と分けた理由（「記録の頻度」と「試した種類の多さ」は別の問い）を明記
- ユーザーへ「内容が自分の言葉になっているか確認してほしい」と伝えた上で、修正指示なくコミットの指示を受けた

### 2026-08: 「本番品質にするための改善」Tier 4（アクセシビリティの底上げ）

- `frontend/src/features/coffee-records/components/ConfirmDialog.jsx`にフォーカストラップを実装した。Tab/Shift+Tabでダイアログ内の要素（キャンセル・削除するの2ボタン）だけを循環させ、背景側の要素へフォーカスが漏れないようにした。開いたときにキャンセル側へフォーカスする既存の挙動、Escapeで閉じる既存の挙動は変更していない。汎用のフォーカストラップhookへは切り出さず、このコンポーネント専用の実装にとどめた（他に同種のモーダルが無いため）
  - ブラウザで実際にダイアログを開き、Tab/Shift+Tabでフォーカスが2ボタン間を正しく循環すること（`document.activeElement`を都度確認）、Escapeで記録を削除せずに閉じられることを確認した
- `eslint-plugin-jsx-a11y`を導入し、`eslint.config.js`の`extends`に`jsxA11y.flatConfigs.recommended`を追加した。導入直後のlintで検出されたのは3件のみ（想定より少なく、警告過多で導入を見送る必要は無かった）:
  - `Navbar.jsx`のモバイル用バックドロップ（クリックでドロワーを閉じる半透明の背景div）に`aria-hidden="true"`を追加。ドロワーを閉じる正規の手段（ハンバーガーボタン）は既にキーボード操作可能なため、マウス専用の補助要素をスクリーンリーダー・キーボード操作から隠す方針にした（要素をinteractiveにしてキーボードハンドラを追加する方向は取らなかった）
  - `NodeDetailPanel.jsx`の`<aside role="complementary">`から、暗黙のroleと重複する`role="complementary"`を削除
- `frontend/lint`（jsx-a11y導入後、0件）・`frontend/build`成功を確認
- Docker Compose環境で実機確認: ConfirmDialogのフォーカストラップをブラウザで直接検証（上記）。Navbarのモバイルドロワーは、`aria-hidden`がクリックハンドラ・CSSに影響しない属性であることをコードレベルで確認し、実機でのモバイル幅再現はブラウザ自動化ツールの制約（既知）により今回も見送った

未解決事項（次のエントリの「未解決事項」にも反映）:

- `npm install`でdevDependencyとして`eslint-plugin-jsx-a11y`を追加した際、新たに8件の脆弱性（1 low, 7 high）がnpm auditで報告された。devDependency（ビルド成果物には含まれない）だが、内容は未調査
- Tier 5（フロントエンドのテスト基盤）は未着手

### 2026-08: 「本番品質にするための改善」Tier 5（フロントエンドのテスト基盤）とnpm auditの解消

- Vitest + React Testing Library + user-eventを導入。`vite.config.js`に`test`ブロックを追加（`environment: "jsdom"`、`setupFiles: "./src/test/setup.js"`）。`test.globals`はあえて`false`にし、他のimportと同じくvitestから`describe`/`test`/`expect`等を明示的にimportする方針にした（グローバルを暗黙で生やさない、という既存のコードスタイルに合わせた）
  - `src/test/setup.js`: `@testing-library/jest-dom/vitest`の読み込み、i18nをテスト内でも動く状態にし言語を`ja`へ固定（jsdomの`navigator.language`をLanguageDetectorが拾い、fallbackLng（ja）より優先されてテスト結果が環境依存になっていたため）、`@testing-library/react`の自動クリーンアップを明示的な`afterEach(cleanup)`で代替（`test.globals: false`にした副作用でreact-testing-library内部のグローバル検出によるクリーンアップ登録が効かず、テストごとに前回の`render()`結果がDOMに残ってしまう不具合を踏んだ）
- テストを2ファイル、21件作成:
  - `features/coffee-records/validation/recordFormValidation.test.js`: DOM非依存の純粋関数（`validateRecordForm`/`hasErrors`/`toApiPayload`）の正常系・異常系。backendの`coffeeRecordValidator.test.js`と対になる、フロントエンド側の入力検証テスト
  - `features/coffee-records/components/ConfirmDialog.test.jsx`: Tier 4で実装したフォーカストラップ（Tab/Shift+Tabでの循環）・Escapeでの閉鎖・確認ボタンのコールバックを、実際にuserEventでキーボード操作させて検証
- `.github/workflows/test.yml`の`frontend-build`ジョブに`npm run lint`・`npm test`のステップを追加（ジョブ名の実態に合わせてコメントも修正）。あわせて、`backend-tests`ジョブの「DB非依存のみが対象」という古いコメント（実際はmongodb-memory-serverを使ったDB込みの統合テストが大半）を実態に合わせて修正した
- Tier 1・4で「未調査」としていたnpm auditの脆弱性を、両方とも`npm audit fix`（`--force`無し、semver範囲内の更新のみ）で解消した:
  - frontend: 実際には`eslint-plugin-jsx-a11y`ではなく、`react-router-dom`（CSRF・XSS等を含む7件）・`vite`など既存の依存が原因だった（Tier 4時点の「jsx-a11y導入で新たに8件」という記録は誤りで、これは元々あった脆弱性だったと判明）。`npm audit fix`後、`package.json`の依存バージョン範囲（`^`）は変わらず、`package-lock.json`のみ更新。8件→0件
  - backend: `mongoose`のprototype pollution（moderate）を含む5件。同様に`package.json`は無変更、`package-lock.json`のみ更新。5件→0件
- `cd frontend && npm run lint && npm test && npm run build`成功（21件のテストすべて成功）。`cd backend && npm test`成功（23 suites / 330 tests、audit fix後のリグレッション無しを確認）

未解決事項（次のエントリの「未解決事項」にも反映）:

- フロントエンドのテストは検証ロジックと1コンポーネントのみ。`RecordForm`本体（フック・API通信を含む結合的な部分）、Graph関連（canvasに依存しjsdomでは動かない）はまだテスト対象外
- 「本番品質にするための改善」ロードマップの6段階（Tier 0〜5）はこれで一通り完了。残るのは各Tierのエントリに記載した個別の未解決事項と、デプロイ（Tier 6、任意）

### 2026-08: 「本番品質にするための改善」Tier 6（実デプロイの動作確認）

デプロイ自体（Vercel + Render）はユーザーが既に完了済みだったため、このエントリはDEPLOYMENT.mdの「デプロイ後の動作確認チェックリスト」を実際の本番環境で確認した記録。アカウント作成・秘密情報の入力はユーザーの領分のため関与せず、確認作業のみ担当した。

- コードレベルでのデプロイ readiness を先に確認: `backend/server.js`が`process.env.PORT`を正しく読む、`backend/package.json`に`start`スクリプトがある、`frontend/vercel.json`のSPA rewriteが正しい、`.env.example`がDEPLOYMENT.mdの環境変数表と一致、をそれぞれ確認した
- `fastapi-service/main.py`のCORS設定が`http://localhost:5001`にハードコードされたままだったが、実害は無いと判断した。アーキテクチャ上FastAPIを呼ぶのはブラウザではなくExpressサーバー間通信のみで、CORSはブラウザのみが強制する仕組みのため
- 本番URL（`https://coffee-app-seven-alpha.vercel.app/`）へブラウザ自動化ツールで実際にアクセスし、DEPLOYMENT.mdのチェックリストを確認した: フロントエンド表示、ログイン状態の維持、Records/Graph/Statsの各画面表示、コンソールエラー無し（CORSエラーもここに出るはずだが皆無）。ユーザーの許可を得た上で、実際に記録を1件作成→編集→削除するCRUDテストも行い、既存の記録には影響を与えずに一連の操作が正しく動くことを確認した
- ユーザーから「パスワードを教える」提案があったが、ログイン情報の入力は行わない方針のため辞退した。ブラウザが既にユーザー自身のセッションでログイン済みだったため、認証情報を扱わずにCRUDテストができた
- ユーザーからの質問（「FastAPIはそもそも使われているか」）に対して調査したところ、`backend/services/fastApiService.js`というファイルが実際には存在せず、`process.env.FASTAPI_URL`を読むコードもbackend全体に無いことが判明した。FastAPIはデプロイされているが、frontend・backendのどちらからも呼ばれていない（`docs/architecture.md`の方針通りの意図的な状態）
- 上記の過程で、`docs/mlb-legacy-inventory.md`（Tier 0で私が書き直した際に誤って記載）に`services/fastApiService.js`を「再利用した（現存）」としていた誤りを発見し、実態に合わせて修正した
- FastAPIのヘルスチェック確認・Renderのログ確認は、前者は「呼ばれていないため優先度低」と判断して省略、後者は私にRenderへのアクセス権が無いため対象外とした

未解決事項（次のエントリの「未解決事項」にも反映）:

- `fastapi-service/main.py`のCORS設定（`http://localhost:5001`ハードコード）は実害が無いため今回は修正していない。将来frontendから直接FastAPIを呼ぶ設計に変わった場合は要修正
- Renderのログにエラーが出ていないかは、ユーザー自身での確認が必要（未確認）
- これで「本番品質にするための改善」ロードマップ（Tier 0〜6）がすべて完了した

### 2026-08: CI（GitHub Actions）のfrontend-buildが落ちる不具合を修正

Tier 5でCIに`npm test`を追加した2コミット（Tier 5・Tier 6）がいずれも`Test / frontend-build`で失敗していたと報告を受け、`gh run view --log-failed`で実際のログを確認した。

原因: `jsdom@30.0.1`が`engines.node`に`^22.22.2 || ^24.15.0 || >=26.0.0`を要求しており、CI（`.github/workflows/test.yml`で`node-version: "20"`固定）で`vitest run`を実行すると`webidl.util.markAsUncloneable is not a function`（undiciのCacheStorage初期化時）で即座に落ちていた。ローカルで気づけなかったのは、開発機のNode（v24.15.0）がたまたま`jsdom@30`の対応範囲に入っていたため。`@testing-library/jest-dom@7.0.1`も同様に`node: '>=22'`を要求しており、警告は出ていたがこちらはエラーにはなっていなかった。

- READMEの「必要なもの: Node.js 20.11+」という既存の前提（`import.meta.dirname`のため）を維持する方針とし、CI側のNode版を上げるのではなく、依存側をNode 20対応バージョンへ固定した:
  - `jsdom`: `^30.0.1` → `^25.0.1`（`engines.node: '>=18'`）
  - `@testing-library/jest-dom`: `^7.0.1` → `^6.9.1`（`node: '>=22'`要求が入る直前の最終版。`node: '>=14'`）
- 修正後、`docker run node:20`でCIと同じNode 20環境を再現し、`npm ci && npm run lint && npm test && npm run build`が警告無しで通ることを確認してからコミットした（ローカルのNodeバージョンだけで確認して同じ失敗を繰り返さないため）
- `npm audit`は変更後も0件のまま

未解決事項:

- 今後`jsdom`・`@testing-library/jest-dom`を更新する際は、CIのNode版（20）と`engines.node`の整合を確認すること。CI側のNode版を上げる選択肢も、README・`docker-compose.yml`等の前提を含めて見直せば取れるが、今回は依存側の固定で対応した

### 2026-08: Profileページのデザイン刷新（RecordDetail/Statsと同水準の構成へ）

Records/RecordDetail/Statsは既に「カードの積み重ね」から「header→`divide-y`で区切ったsection群」という1本の縦の流れへ再設計済みだったが、Profileページ（`/profile`）だけがこの再設計から取り残され、`max-w-xl`（他の詳細系ページは`max-w-[900px]`で統一済み）・カード積み重ね・ローディング/エラー専用UIの欠如・未i18n化のh1、といった不整合を抱えていた。

- 全体構成をRecordDetailPage/StatsPage型（header+subtitle→`divide-y`のsection群）へ揃え、max-widthを`max-w-[900px]`に統一した
- `features/profile/`を新設し、`useProfile`（取得専用hook。`useCoffeeRecord`/`useStats`と同じ`{data, isLoading, error, reload}`形状）と`ProfileSkeleton`（`StatsSkeleton`と同じ考え方）を追加した。`features/discover`/`features/insights`/`features/stats`が機能規模に関わらず`hooks/`を持つ既存の慣習に合わせた。ミューテーション（名前変更・パスワード変更・退会）は他ページ同様pageコンポーネント側に残した（取得と更新の非対称はRecordDetailPage/RecordFormPageと同型）
- email欄は編集不可なのに`FormField`の「任意」バッジが付いていた不整合を修正し、RecordDetailPageのProperty Gridと同じ`dl/dt/dd`の読み取り専用表示に変えた
- `useProfile`の取得失敗が401の場合、HomePageと同じ`isUnauthorizedError`判定＋`clearAuthData()`に揃えた
- 実装中、ESLintの`react-hooks/set-state-in-effect`ルールに2箇所引っかかった。1つ目（`useProfile`の`setIsLoading`/`setError`）は`useCoffeeRecord.js`/`useStats.js`と同じ「effect内で`load`という非同期関数を定義して呼ぶ」形に合わせて解消。2つ目（`user`が取得できたらローカルの`name`stateへ同期する処理）はそもそもeffectを使うべきでないパターン（[React公式ドキュメントの"Adjusting some state when a prop changes"](https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes)）だったため、レンダー中に直接`setState`する公式パターンへ書き換えた
- `docs/design.md`に`### Profile / Settings`節を追加（他画面と同じ粒度の箇条書き）
- 検証: `npm run lint && npm run build && npm test`が通ることを確認。ブラウザでも実機確認した（名前変更→トースト→反映、日本語/英語表示、退会確認ダイアログの表示、コンソールエラー無し）
- なお`npm run build`が初回、ローカルの`node_modules`内`rolldown`のプラットフォーム別バイナリが見つからず失敗したが、`npm install`で解消した（今回の変更とは無関係な、ローカル環境側の既存の状態）

### 2026-08: 言語切り替え（LanguageSwitcher）をNavbarからProfileページへ移動

ユーザーからの依頼。Navbarは全ページ（`/login`・`/register`含む）に常時表示されるため、そのままProfileページ（ログイン必須）へ移すと未ログイン状態で言語を切り替える手段が無くなる。この点をユーザーに確認したところ、「未ログイン状態でもprofileページで良い」との回答だったため、Navbarから完全に削除する方針で実装した（`LandingPage.jsx`には別途専用の`LanguageSwitcher`があり、ログイン前に最初に訪れる画面では引き続き切り替えられる）。

- `Navbar.jsx`からモバイル用ドロワー・デスクトップ用ナビバー両方の`<LanguageSwitcher />`とimportを削除
- `ProfilePage.jsx`の`divide-y`セクション群の先頭に「表示言語」セクションを追加し、既存の`LanguageSwitcher`コンポーネントをそのまま再利用（新規コンポーネントは作らず）
- `profile.languageHeading`のi18nキーを追加し、`profile.subtitle`の文言も言語切り替えに触れる内容へ更新
- `docs/design.md`の`### Profile / Settings`に「表示言語の切り替え」を追記
- `ProfileSkeleton.jsx`を4セクション構成（表示言語／名前／パスワード変更／退会）に合わせて骨格を追加
- 検証: `npm run lint && npm run build && npm test`が通ることを確認。ブラウザでも実機確認した（Profileページでの言語切り替えがアプリ全体に反映されること、`/login`ページのNavbarに言語切り替えが表示されないこと、コンソールエラー無し）

### 2026-08: カラーテーマ刷新（モノクロ+モス差し色 + トークンのセマンティックリネーム）

ユーザーからの依頼「現状Linearを参考にしているカラーテーマを刷新するなら」に対して、複数の方向性案を提示し、ユーザーが「モノクロ+差し色1色のミニマル路線、差し色はモス(オリーブ)系」を選んだ。調査の結果、既存配色は「Catppuccinを装っているが実態はLinear本番CSSの実測値」（`prompts/design/00-design-principles.md` 6.1に既に明記されていた）であることを再確認し、この機会に配色だけでなくトークン名（`ctp-*`）自体もセマンティックな名前（`primary`/`danger`等）へリネームすることになった（値だけ変えて名前を残すと、今回の刷新動機と同種の「名前と実体の不一致」を再生産するため）。

- **新パレット**: primaryはモス`#7c8363`。背景階調（base/raised/surface-1/2/3/line/line-strong）と主要テキスト（text）は実質据え置き、text-secondary/text-tertiaryはLinear由来の青みを抜いて暖色寄りに微調整。danger/warn/rating/successは意味固定色として値を維持
- **グラフノード・産地アクセントの再設計**: 当初「グレー5段階」を提案したが、ユーザーから「グレーの濃淡は見分けにくい」という指摘を受けて撤回し、モスと彩度を揃えた「ミュートな多色」5色（`accent-slate`/`accent-clay`/`accent-ochre`/`accent-rose`/`accent-mist`）+モス2段階（`accent-moss-light`/`accent-moss-dark`）の7色パレットへ変更した。各色はノードアイコンの意味とゆるく対応させた（process=droplets→ブルーグレー、farm=leaf→テラコッタ、等）。`originAccent.js`のパレットもグラフと共有し、デザインシステムとして一貫させた
- **トークン管理の一元化**: `frontend/src/index.css`の`@theme`ブロックを唯一の定義箇所とし、`frontend/src/App.css`にあった重複`:root { --ctp-*: <hex> }`ブロック（値の手動同期が必要という既知の技術的負債）を削除。App.css内の`var(--ctp-旧名)`（~937箇所）は`var(--color-新名)`へ直接置き換え、二重管理を構造的に解消した
- **canvas描画色の動的化**: `nodeVisuals.js`の`canvasColor`（react-force-graph-2dのcanvas描画向けhexの手打ち値、@theme側との手動同期が必要だった）を、新規`features/graph/utils/canvasColors.js`（`getComputedStyle`ベース）で解決するgetterに変更した。`GraphCanvas.jsx`内のローカル`CTP`定数も同じ仕組みへ統合
- **副次的に見つかったバグの修正**: `process`ノードが使っていた`ctp-sky`が`index.css`の`@theme`に定義されておらず、Tailwind v4のCSS-first制約によりTailwindユーティリティが生成されていなかった（意図した色になっていなかった可能性が高い）。今回の再設計で解消
- **primaryボタンの文字色**: モス背景×白文字はコントラスト比約3.74:1でWCAG AA(4.5:1)未達だったため、`formStyles.js`の`primaryButtonClass`を`text-white`→`text-base`（既存の`dangerButtonClass`と同じダーク文字パターン）に変更
- **リネームの実行方法**: JSXのTailwindユーティリティ約459箇所・CSSの`var(--ctp-*)`約937箇所という規模のため、トークンごとに`ctp-<旧名>`→`<新名>`の機械的な文字列置換（sed）を適用し、都度`npm run lint && npm run build`で確認しながら進めた。`ctp-lavender`/`ctp-sapphire`は「グラフ/産地の可視化」用途と「一般UI」用途が混在していたため、`nodeVisuals.js`/`originAccent.js`を除外した上で残りをまとめて`primary`へ置換し、グラフ2ファイルは手動で新パレットへ書き換えた。個別に見つかった非機械的な残存箇所（`DiscoverCard.jsx`の装飾アイコン→`primary`、`RecordForm.jsx`のmasterDataErrorコールアウト→`warn`）も併せて修正した
- **ドキュメント**: `prompts/design/00-design-principles.md` 6.1節を新パレット・命名方針に合わせて全面書き直し。`docs/design.md`は色の具体値を持たないため変更不要と判断した
- **スコープ外として残したもの**: `App.css`に残るもう1箇所の未参照MLB系CSS（`.archetype-badge`/`.mbar-fill`/`.pred-bar-fill`/`.home-player-section`等。既存の未解決事項・次に実装すべき最小単位に記載済み）で使われている`ctp-mauve`/`ctp-teal`/`ctp-maroon`/`ctp-peach`/`ctp-sky`/`ctp-pink`は今回リネームせず据え置いた（`rosewater`/`flamingo`は完全未使用と確認できたため削除）。生きているUIには一切影響しないことをgrepで確認済み。このCSSブロック自体を削除すれば、残った`ctp-*`もまとめて消える
- 検証: `npm run lint && npm run build && npm test`（21件）がすべて成功することを確認。Docker Compose環境のブラウザ実機で、Home/Graph（ノード色・選択リング・凡例）/Stats（棒グラフ）/Profile（primary/danger各ボタン、言語切り替えの選択状態）/Records（フィルターチップ）/トースト（成功）を目視確認し、コンソールエラー無し

未解決事項:

- グラフ/産地アクセントの新7色（特に`accent-slate`等の値）は目安値であり、より広い実データ・実機での微調整の余地がある

### 2026-08: ローディングスケルトン表示の改善

ユーザーからの依頼「ローディング中のスケルトン表示を改善してください」。調査の結果、`StatsSkeleton.jsx`/`ProfileSkeleton.jsx`/`RecordListSkeleton`/`DiscoverSkeleton.jsx`は既に実レイアウトに忠実な専用スケルトンだったが、`RecordDetailPage.jsx`/`RecordFormPage.jsx`/`EntityDetailPage.jsx`/`GraphStates.jsx`の`GraphLoadingState`/`NodeDetailPanel.jsx`の5箇所は2〜3本の汎用バーだけの簡素なインラインプレースホルダのままだった。この5箇所を既存の水準へ引き上げた。

- `features/coffee-records/components/RecordDetailSkeleton.jsx`（新規）: Breadcrumb→Header→divide-yのProperty Grid/Tasting Note/Connectionsという実際の構成をそのまま骨格化。`RecordDetailPage.jsx`のisLoading分岐をこれへ差し替え
- `features/coffee-records/components/RecordFormSkeleton.jsx`（新規）: 編集時ローディング（`isEditing && isRecordLoading`）専用。Title/日時/種別/評価/メモのカード形を再現。新規作成時はこれまで通りスケルトン無し（即フォーム表示）を維持
- `EntityDetailPage.jsx`にページローカルな`EntityDetailSkeleton`関数を追加（`StatCard`/`RelatedAttributeGroup`と同じくファイル内のヘルパー。entity-detail専用のfeatureディレクトリが無いため）。統計カード3枚・関連属性チップ・関連記録一覧を再現
- `GraphStates.jsx`の`GraphLoadingState`: 円1個だけだったのを、円形（recordノード相当）・角丸矩形（属性ノード相当）を`absolute`配置で散りばめ、薄い斜め線でエッジを軽く連想させる形に拡充（物理演算の再現はしない）
- `NodeDetailPanel.jsx`のインラインスケルトン: `node.data.type`（選択した時点で既知）で record相当/属性相当の2パターンに出し分け。あわせて欠けていた`aria-label`を追加
- 未使用コードの削除: `components/SkeletonCard.jsx`（どこからもimportされていない死んだコンポーネント）と、`App.css`内`.discovery-card-skeleton`系4クラス（JSXから未参照、旧DiscoverSkeleton実装の残骸）を削除。`docs/mlb-legacy-inventory.md`のSkeletonCard.jsx記載も削除の旨へ更新
- 検証方法: `httpClient.js`の`apiRequest`に一時的に`setTimeout`遅延（1.5秒→確認しづらかったため4秒に延長）を仕込み、ブラウザ実機で5箇所すべてのスケルトンを実際に表示させて確認した後、変更を完全に元へ戻した（`git diff`で無変更を確認済み）。5箇所とも実際のレイアウトと一致した形で表示されることを確認
- 検証: `npm run lint && npm run build && npm test`（21件）成功。`grep -rn "SkeletonCard|discovery-card-skeleton" frontend/src`が0件であることを確認

### 2026-08: Home画面「Recent Records」のスケルトンをグリッド形状に合わせて修正

ユーザーからの依頼「homeのローディングを再度レビューしてください」。前エントリのスケルトン改善時にHomeページは対象外にしていたが、レビューの結果、`HomePage.jsx`が読み込み中に出す`RecordListSkeleton`（`/records`一覧・検索結果と共有、縦積み1カラムの形）と、読み込み完了後に実際に表示される`grid grid-cols-1 sm:grid-cols-3`の`HomeRecordCard`グリッド（小さめのタイル）とで形が一致しておらず、読み込み完了時にレイアウトが飛ぶ不具合を発見した。

- `features/coffee-records/components/HomeRecordCardSkeleton.jsx`（新規）: `HomeRecordCard.jsx`（産地アクセントバー+ラベル、タイトル+評価、精製方法、フレーバー）と同じ形を、実際に使われる3カラムグリッドで再現。`HomePage.jsx`の`RecordListSkeleton`をこれへ差し替え
- `RecordListSkeleton`自体は`/records`・検索結果（縦積みリスト）では引き続き正しい形のため変更していない。Home画面専用の別コンポーネントとして切り出した
- あわせてDiscoverCard/GraphPreviewの読み込み中表示（データが確定するまで何も表示しない設計）を確認し、意図的な「静かな道具」方針（コメントに明記済み）であり問題無いと判断、変更しなかった
- 検証: 前エントリと同じ`httpClient.js`への一時遅延挿入→ブラウザ実機確認→完全に元へ戻す、という方法で確認（`git diff`で無変更確認済み）。`npm run lint && npm run build && npm test`（21件）成功

### 2026-08: Discover専用ページ（`/discover`）を削除し、Home Teaser・Entity Detail埋め込みに集約

ユーザーからの依頼「discoverページを設計します」に対し、着手前に「そもそもこのページは必要か」を検討した。Discover機能は当時、Home画面のDiscoverCard（全産地横断で最良1件のteaser）・EntityDetailPage（産地のみ、その産地単体の提案を埋め込み表示）・`/discover`専用ページ（条件を満たす全産地の一覧）の3箇所に分散していた。

調査の結果、`/discover`ページへの導線はHomeカードの1行のみで常設ナビには意図的に入れていない（「静かな道具」方針）こと、`docs/design.md`のScreens節・Main Navigationに一度も記載されたことがない「未文書化の画面」だったことが判明した。さらに、よく作り込んだデモデータ（15件・7産地）で実際に検証したところ、`buildAllOriginDiscoveries`が返す産地グループはEthiopia・Kenyaの2件のみ（Guatemala/Colombiaは精製方法が同率首位のため対象外、Rwanda/Panama/Brazilは記録数不足で対象外）だった。「複数産地を横断して比較できる」という専用ページ固有の価値が実際にはほとんど発揮されないことをユーザーと確認し、削除する方針で合意した。

- フロントエンド削除: `pages/DiscoverPage.jsx`、`features/discover/hooks/useAllDiscoverSuggestions.js`、`features/discover/components/DiscoverSkeleton.jsx`
- `App.jsx`から`/discover`ルートを削除
- `DiscoverCard.jsx`のDiscover行のリンク先を、`teaser.nodeId`（元々レスポンスに含まれていた、提案の根拠になった産地のノードID）を使って`/entities/${teaser.nodeId}`へ変更。そこには既に`DiscoverSuggestions`として同じ提案が埋め込み表示されているため、機能の実質的な後退は無い
- i18nの`discover.pageSubtitle`・`discover.emptyDesc`（DiscoverPage専用、他画面で未使用と確認済み）を削除
- バックエンド削除: `GET /api/discover/all`一式（`discoverRoutes.js`のルート、`discoverController.js`の`getAllDiscoveries`、`discoverService.js`の`getAllOriginDiscoveries`、`discoverBuilder.js`の`buildAllOriginDiscoveries`）。`GET /api/discover`（teaser）・`GET /api/discover/nodes/:nodeId`は変更なし
- バックエンドテスト: `discoverBuilder.test.js`・`discoverApi.test.js`から該当describeブロックを削除
- `docs/features.md`の「Home Teaser・Discoverページ」節を「Home Teaser」に統合し、削除の経緯を追記
- 副次的に、複数ファイルに残っていた実体の無い`docs/discover.md`という古い参照（内容は既に`docs/features.md`「Discover」節へ統合済みだった）を、今回触れたファイルに限り`docs/features.md`参照へ修正
- 検証: `cd backend && npm test`（Test Suites: 23 passed, Tests: 325 passed。削除前330件から5件減、想定通り）、`cd frontend && npm run lint && npm run build && npm test`（21件）すべて成功。`grep -rn "DiscoverSkeleton|useAllDiscoverSuggestions|fetchAllDiscoverSuggestions|getAllOriginDiscoveries|buildAllOriginDiscoveries|getAllDiscoveries" backend frontend/src`が0件であることを確認。claude-in-chrome MCPサーバーが接続断だったため、ブラウザでの目視確認の代わりにDocker Compose環境へcurlで直接アクセスし確認した: 使い捨てのテストユーザーを`POST /api/auth/register`で作成→ログイン→`GET /api/discover`が`{"data":{"teaser":null}}`(200)、`GET /api/discover/all`が`{"message":"Route not found"}`(404)、`GET /api/discover/nodes/origin:foo`が404(NOT_FOUND)であることを確認。確認後、テストユーザーはMongoDBから直接削除して後始末した

未解決事項:

- なし（このエントリの範囲では）

### 2026-08: mobbin.com準拠のデザインシステムへ全面刷新（色・奥行き・モーション・レイアウト）

ユーザーからの依頼「アプリ全体のデザインをミニマルで高級な感じにしたい」に対し、参照先として`mobbin.com`が挙がった。ブラウザ操作ツール（claude-in-chrome）が接続断でWebFetchも403だったため、`curl`で実際のHTML/CSSソース（`/discover/apps/web/latest`のNext.js配信CSS）を直接取得して解析した。

**やり取りの中で2度、こちらの説明をユーザーに訂正された**:
1. 当初「ユーザーの言う"デザイン"はアニメーション・配置のことで、色は現状維持」と解釈していたが、「デザインもですね。現在のカラー配色は全て破棄です」と明確な訂正を受けた
2. 「mobbin.comは鮮やかな青をアクセントに使っている」と説明したところ、「青のアクセントとは何か、mobbinには使われていない」と指摘を受けた。HTML内のクラス使用箇所を再検証した結果、**ユーザーの指摘が正しかった**: 青（`blue-*`）はキーボードフォーカスリングにのみ使われており、主要CTAボタンにすら使われていなかった。実際のCTAボタンは`bg-background-inverse text-text-inverse rounded-full`という、色を使わない反転配色のピル型ボタンだった

この2つの訂正を経て、色・奥行き（影/すりガラス）・角丸・モーション・レイアウトのすべてをmobbin.comの実測値に基づいて忠実に再現し、全ページへ適用する方針で実装した。

**色トークン全面差し替え（`frontend/src/index.css`）**:
- 背景・テキストを完全な無彩色（彩度0%）へ。`base`/`raised`/`surface-1〜3`/`line`/`line-strong`/`text`/`text-secondary`/`text-tertiary`をmobbin.com実測のneutralスケール相当値に変更
- 新設`inverse`/`on-inverse`トークン: 主要ボタン専用の反転配色（色を使わない）
- `primary`を旧モス系（#7c8363）からmobbin.com実測の青（#0077ff、blue-60相当）へ変更し、**役割をキーボードフォーカスリング専用に限定**（`ring-primary/50`、約91箇所は変更不要、値が変わるだけで用途が一致する）
- `danger`/`warn`/`rating`/`success`はmobbin.com実測のhue系へ値を更新（用途・意味は維持）
- グラフノード・産地アクセントの多色パレット（`accent-moss-light`等）はmobbin.com側に対応する概念が無いためスコープ外、値は変更していない。ただし`record`ノードが直接`primary`を参照していたため、新設`accent-moss`（旧primaryと同値）へ切り離し、グラフの見た目自体は変えていない

**`primary`の非フォーカス用途の置き換え（役割分離）**:
- ボタン・アクティブ状態の塗り（`bg-primary`/`text-primary`/`border-primary`、非ring箇所で35箇所・11ファイル）を、色を使わない中立トーン（`surface-2`/`text`ベース）または新設の反転配色へ置き換え: `Navbar.jsx`、`LanguageSwitcher.jsx`、`GraphFilters.jsx`、`ChipMultiSelect.jsx`、`RecordFilters.jsx`、`RecordForm.jsx`、`MonthlyTrendChart.jsx`、`DiscoverCard.jsx`、`LandingPage.jsx`、`nodeVisuals.js`
- `formStyles.js`の`primaryButtonClass`: `bg-primary`（モス）+`rounded-lg` → `bg-inverse text-on-inverse`+`rounded-full`（色を使わない反転ピルボタン）
- 副次的に、`App.css`の`.home-link`（Login/Register/Landingページで使う共通CTAクラス）が、既に存在しない`var(--primary)`・`var(--ctp-teal)`という未定義のCSS変数を参照しており、hover時の背景グラデーションが実質無効化されていたバグを発見・修正した（同じ反転配色へ統一）

**奥行き（影・すりガラス）・角丸**:
- 新設`shadow-elevated`/`shadow-panel`トークン（mobbin.com実測の柔らかい大きな影＋暗い背景でも見えるよう濃度を上げ、縁に極薄の白いインセットハイライトを追加）
- `cardClass`をはじめ、`bg-raised`を持つカード状コンポーネント（`RecordCard`/`HomeRecordCard`/`EntityResultCard`/`StatCard`系/`DiscoverCard`/`GraphPreview`/`HomeVsCafeCard`/`RatingDistributionChart`/`GraphLoadingState`等）に`shadow-elevated`+`rounded-xl`→`rounded-2xl`を適用。読み込み中スケルトン（`HomeRecordCardSkeleton`/`RecordListSkeleton`）の角丸も合わせて更新し、読み込み完了時の見た目の飛びを防いだ
- `ConfirmDialog`/`NodeDetailPanel`（モーダル・パネル）は`shadow-panel`+`bg-raised/90 backdrop-blur-xl`のすりガラスへ
- 空状態・エラー状態の破線枠・警告色ボックスは影を付けないまま維持（「浮いている」という意味と矛盾するため、意図的な除外）
- `GraphCanvas.jsx`のノード描画（canvas 2D API）に`ctx.shadowBlur`/`ctx.shadowColor`を追加し、他要素と質感を揃えた（描画後に必ずリセットし、アイコン・文字に影が伝播しないようにした）

**モーション**:
- `page-transition`（`App.jsx`の`AnimatedRoutes`が全ページに適用済み）のキーフレームを、mobbin.com実測のイージング（新設`--ease-decel`、`cubic-bezier(0.32,0.72,0,1)`）とタイミング（380ms→450ms、移動距離12px→20px）へ更新
- **`frontend/src/hooks/useReveal.js`という、IntersectionObserverでスクロールイン検知するhookが実装済みだが一度も使われていなかった死んだコードを発見し、本来の目的通りに配線した**。`App.css`の`.reveal`系CSSクラスもmobbin.com準拠のタイミング（500ms、`--ease-decel`）へ更新
- 新設`frontend/src/utils/revealDelay.js`（インデックス→`.reveal-delay-1〜3`の変換）を使い、カード一覧（`RecordCard`/`HomeRecordCard`/`EntityResultCard`/`TopRankingList`のランキング行/`EntityDetailPage`の関連記録）が段階的にカスケード表示されるよう配線した。フックはコンポーネントのトップレベルでしか呼べない（Rules of Hooks）ため、`TopRankingList`の`RankingRow`・`EntityDetailPage`の`RelatedRecordRow`という小さな行コンポーネントをそれぞれ切り出した

**ドキュメント**:
- `prompts/design/00-design-principles.md`の6.1節（Color）・6.4節（Radius/Spacing）・6.5節（Borders over Shadows→Depth & Glass）・6.6節（Motion）を全面書き換え。2度の誤った推測とユーザーによる訂正の経緯も明記した

**検証**: `cd frontend && npm run lint && npm run build && npm run test`（21件）すべて成功。Tailwindのビルド成果物で`--color-inverse`/`--color-primary`（#0077ff）/`--color-accent-moss`（#7c8363、旧primaryと同値）が正しく生成されていることを確認。claude-in-chrome MCPサーバーが接続断だったため、ブラウザでの視覚的な最終確認は未実施（Docker dev環境のVite HMRが変更を反映していること、`curl`でindex.cssの配信内容が更新されていることは確認済み）。

未解決事項:

- ブラウザでの視覚的な最終確認が未実施（claude-in-chrome接続断のため）。次回セッションで実機確認が必要
- danger/warn/rating/successの新しい値は、mobbin.com上での実際の可視使用が確認できないまま採用した（CSS変数としては定義されているが、調査したページ内では表示されていなかった）。コントラスト・見やすさの最終確認が必要
- グラフキャンバスのノード影（`ctx.shadowBlur`）はパフォーマンス影響を実機で未検証。重い場合は選択中ノードのみへ限定する対応が必要

---

### 2026-08: Navbarアイコンへホバーアニメーションを導入（`@animateicons/react`）

ユーザーからmobbin.comで見た「保存アイコンがホバー時に動く」体験（`DotLottieReact`というLottie再生コンポーネントのHTML断片を共有された）をNavbarの6アイコン（Home/Records/Graph/Stats/Profile/Logout）に再現したいという依頼。

Mobbin自体のLottieアセットは取得・流用できず、`lottiefiles.com`もCloudflareのJS challengeで調査不能だったため、同じ「ホバーで動く」体験を代替ライブラリで用意する方針に切り替えた。npm registry・GitHub上のソースを直接調査し、**`@animateicons/react`**（MIT、Lucideベース509アイコン、GitHub 1,081スター）を採用した。収録アイコンが`house`/`coffee`/`chart-network`/`chart-bar`/`user`/`log-out`とNavbarの6項目すべてに意味的に一致し、実装規約（`stroke="currentColor"`/`viewBox="0 0 24 24"`）が既存の自前SVGと同じで`currentColor`継承がそのまま使えたため。

**変更内容**:
- `frontend/package.json`に`@animateicons/react`を追加（`npm install`）
- `frontend/src/components/Navbar.jsx`: 自前定義していた6個のインラインSVGアイコン（`HomeIcon`/`GraphIcon`/`RecordsIcon`/`StatsIcon`/`UserIcon`/`LogoutIcon`）をすべて削除し、`import { HouseIcon, ChartNetworkIcon, CoffeeIcon, ChartBarIcon, UserIcon, LogOutIcon } from "@animateicons/react/lucide"`へ置き換え。`PRIMARY_ITEMS`とモバイル/デスクトップ両方の呼び出し箇所（計6箇所）に`size={16}`を明示指定（ライブラリ既定が24pxのため）。色は`color`propを渡さず既存の`navLinkClass`（`text-text-secondary`/`text-text`）にそのまま任せている
- ホバー検知・`prefers-reduced-motion`対応（`useReducedMotion()`）はライブラリ内蔵のため追加実装なし

**バンドルサイズの見積もりミス（正直な報告）**: 実装前の事前調査では、npm tarballを展開して`motion`のバンドル済み共有チャンクが74KB（未圧縮）であることを確認し、「+15〜25KB gzip程度」と見積もっていた。しかし実際に`npm run build`した結果、**+89.6KB gzip**（122.90kB→212.49kB）という、見積もりを大きく超える増加になった。原因を`grep -c`で調査したところ、`node_modules/@animateicons/react/dist/lucide.js`が509アイコン全部を1つのファイル内に`forwardRef(...)`のトップレベル呼び出しとして持つ構造で、`sideEffects: false`があってもVite/Rollupのツリーシェイキングが機能せず、インポートしていない505種のアイコンも含めてバンドルされていたことが判明した（未使用アイコン名がビルド成果物に同じ回数出現することを確認）。

この事実をユーザーに報告し、`npx animateicons add`によるソースコピー方式（使うアイコンだけ`.tsx`としてコピーし`motion`を個別依存として追加する方式）への切り替えを推奨したが、ユーザーから「npm依存のまま進める」と明確な指示を受け、バンドルサイズ増加を受け入れた上でnpm依存のまま実装を完了した。ソースコピー方式は将来アイコンライブラリ自体を更新する際の手間が増えるトレードオフがあり、その点も含めてユーザーが判断した。

**Vite dev server（Docker）のimport解決エラー**: 実装後、Docker Compose上の`coffee-app-frontend`コンテナ（ホストとは別のnode_modulesを持つ）で`npm install`を実行して依存を同期させたが、その後もViteのdevサーバーが`Failed to resolve import "@animateicons/react/lucide"`エラーを返し続けた。原因はViteの依存事前バンドルキャッシュ（`node_modules/.vite`）が、パッケージインストール前の状態のまま残っていたこと。`docker exec coffee-app-frontend sh -c "rm -rf /app/node_modules/.vite"`でキャッシュを削除し、`docker restart coffee-app-frontend`でViteプロセスを再起動したところ解消した（`/src/components/Navbar.jsx`のトランスフォーム、`/node_modules/.vite/deps/@animateicons_react_lucide.js`のいずれも200を返すことを確認）。

**検証**: `cd frontend && npm run lint && npm run build && npm run test`すべて成功（21件のテストがパス、ビルド成功、gzip 212.49kB）。claude-in-chrome MCPサーバーが未接続のため、ブラウザでの実際のホバー動作・キーボードフォーカス時の挙動・`prefers-reduced-motion`環境での無効化確認は未実施（コードレベルではライブラリの`useReducedMotion()`実装に依拠していることのみ確認済み）。

未解決事項:

- ブラウザでの視覚的な最終確認が未実施（claude-in-chrome接続断のため）。次回セッションで、デスクトップ/モバイル両方のNavbarでの実際のホバーアニメーション、アクティブ/非アクティブ時の色継承、キーボードフォーカス時の挙動、`prefers-reduced-motion`環境での無効化を確認する必要がある
- バンドルサイズが+89.6KB gzip増加した状態を受け入れている。将来的にバンドルサイズが問題になった場合は、ソースコピー方式（`npx animateicons add`）への切り替えを再検討する

---

### 2026-08: Navbarアイコンのホバー発火範囲をアイコン単体からナビ項目全体へ拡張

上記エントリの実装直後、ユーザーから「アニメーションの発火をアイコンのホバーだけでなく、アイコン＋テキスト周りのホバーで発火する方が自然」という指摘を受けた。ナビ項目は`hover:bg-surface-1/60`により見た目上すでに1つのホバー領域として扱われているのに、アニメーションだけアイコンの絵柄部分に限定されているのは確かに不自然と判断し、同意の上で対応した。

**実装方法**: `@animateicons/react`の各アイコンは`ref`を渡すと内蔵の自動ホバー検知（アイコン自身の`onMouseEnter`/`onMouseLeave`）が無効化され、外部から`startAnimation()`/`stopAnimation()`を呼ぶ方式に切り替わる仕様になっている（`dist/lucide.js`を直接確認し、`useImperativeHandle`装着時に内部の自動発火ロジックが迂回されることを確認済み）。これを利用し、`frontend/src/components/Navbar.jsx`に2つの小さなラッパーコンポーネントを新設した:

- `NavIconLink`: `NavLink`+アイコンの組み合わせ用（Home/Records/Graph/Stats/Profile）。`iconRef`を保持し、`NavLink`の`onMouseEnter`/`onMouseLeave`から`iconRef.current.startAnimation()`/`stopAnimation()`を呼ぶ
- `NavIconButton`: Logoutボタン用（`<button>`のため`NavIconLink`とは別コンポーネントとして分離）

`PRIMARY_ITEMS.map()`内の直書きJSXはこの2コンポーネントの呼び出しに置き換え、Profile/Logoutの4箇所（モバイル/デスクトップ×2）も同様に置き換えた。個別に`ref`を持つ必要があるためフックをmap内で直接呼べず（Rules of Hooks）、コンポーネントとして切り出す設計は`TopRankingList`の`RankingRow`等、既存のカラーテーマ刷新時に確立したパターンを踏襲した。

**lintエラーの原因と対処**: 実装直後、`Icon`が「未使用」とESLintに指摘された。プロジェクトの`eslint.config.js`は`no-unused-vars`に`varsIgnorePattern: '^[A-Z_]'`を設定しており、これは大文字始まりの**変数**（`const`宣言等）をJSXコンポーネントとして使う場合の誤検知を避けるための既存の回避策だが、`argsIgnorePattern`は設定されていないため関数**引数**の分割代入には適用されない。`NavIconLink({ Icon, ... })`のように直接引数で分割代入すると誤検知が発生したため、`function NavIconLink(props) { const { Icon, ... } = props; }`という、関数本体内で分割代入する形に変更した（既存の`PRIMARY_ITEMS.map()`内の`const { Icon } = item;`と同じ回避パターン）。

**検証**: `cd frontend && npm run lint && npm run build && npm run test`すべて成功（21件パス、ビルド成功、gzip 212.58kB、変更前と実質同サイズ）。Docker dev環境で`curl`により`Navbar.jsx`の変換結果に新コンポーネント名（`NavIconLink`）が反映されていることを確認済み。claude-in-chrome未接続のため、実際のホバー操作でのブラウザ確認は上記エントリと合わせて未実施のまま。

---

### 2026-08: アプリロゴ（CoffeeLogo）を新規作成し全ブランド表示箇所へ導入

これまでこのアプリには専用のロゴマークが無く、「Coffee App」という文字だけがNavbar 3箇所・LandingPage 1箇所に直書きされていた。`frontend/public/favicon.svg`も、コーヒーと無関係な紫のグラデーション画像（starterテンプレート由来と思われるプレースホルダー）のまま残っていた。

ユーザーから、産地・農園・品種などがrecordへリンクし合う知識グラフ（`docs/product.md`のCore Experience: Record → Connect → Discover）を、ノード・エッジ+コーヒー豆のモチーフで表現したSVGロゴ案が提示され、それをベースに実装した。

**新規コンポーネント `frontend/src/components/CoffeeLogo.jsx`**:
- ユーザー提示のSVGをほぼそのまま採用しつつ、2点だけこのアプリの規約に合わせて調整した
  1. 豆の溝（groove）が`stroke="white"`とハードコードされていたのを`stroke="var(--color-base)"`へ変更。このアプリの`currentColor`は基本`--color-text`（#fafafa、ほぼ白）になるため、`white`のままだと豆の塗りと溝がほぼ同色になり溝が見えなくなるため
  2. 常に「Coffee App」という可視テキストの直前に置く用途しか無いため、`aria-label`は付けず`aria-hidden="true"`にし、スクリーンリーダーでの二重読み上げを避けた（`ConfirmDialog`のバックドロップ等、既存のa11y方針を踏襲）
- ノード・エッジ・豆の塗りは`currentColor`のままなので、置き先の`text-text`等の色をそのまま継承する

**導入箇所（5箇所、ユーザーへの確認の上で決定）**:
- `Navbar.jsx`: モバイル用トップバー・モバイル用ドロワー・デスクトップ用上部ナビバーの3箇所
- `LandingPage.jsx`: ミニナビの「Coffee App」を`flex items-center gap-2`でラップしロゴを追加
- `LoginPage.jsx` / `RegisterPage.jsx`: これまでブランド表示が一切無かったため、新規`.auth-brand`（`frontend/src/App.css`に追加、`display: flex; justify-content: center;`）でカード上部にロゴのみ中央配置

**`frontend/public/favicon.svg`の全面差し替え**:
- 旧ファイルはフィルター・マスク・十数個の楕円で構成された紫のグラデーション画像で、コードからの参照は`index.html`のfaviconリンクのみ、意味的な繋がりは無かった
- favicon.svgはブラウザが直接読み込む独立したファイルでアプリの`@theme`（CSS変数）にアクセスできないため、`currentColor`/`var(--color-base)`ではなく実際の16進値をハードコードした: ノード・エッジ・豆の塗りは`#7c8363`（`--color-accent-moss`と同値。グラフのorigin/recordノードで既に使っている差し色で、単色よりタブアイコンとして認識しやすいため採用）、豆の溝は元のスニペット通り`#ffffff`固定

**検証**: `cd frontend && npm run lint && npm run build && npm run test`すべて成功（21件パス、ビルド成功、gzip 212.83kB）。Docker dev環境で`curl`により、Navbar/LandingPage/LoginPage/RegisterPageの変換結果に`CoffeeLogo`が反映されていること、`favicon.svg`が新しい内容（`#7c8363`）で配信されていることを確認済み。

未解決事項:

- ブラウザでの視覚的な最終確認が未実施（claude-in-chrome接続断のため）。ロゴのサイズ・位置バランス、豆の溝の視認性、ブラウザタブでのfavicon表示を次回セッションで確認する必要がある
- 実装中に`.auth-card-kicker`（`frontend/src/App.css`）が`color: var(--primary)`という、現行の`@theme`には存在しない変数（正しくは`--color-primary`）を参照していることに気付いた。今回のロゴ追加とは無関係のため修正していないが、意図しない色（未定義変数のフォールバックで実質`inherit`）で表示されている可能性がある。次回調査・修正が必要

---

### 2026-08: Navbarの「Coffee App」をSpace Mono、アプリ全体のフォントをMaple Monoへ変更

ユーザーからの依頼で、本文フォントを`Inter`から`Maple Mono`へ、Navbarのブランド文字「Coffee App」を（既存のデータ表示用トークンである）`Space Mono`へ変更した。

**Maple Monoの導入方法の調査**: Maple MonoはGoogle Fontsで配信されていないため、npm registryを調査し`@fontsource/maple-mono`（OFL-1.1ライセンス、latinサブセットのwoff2/woffをバンドルしたセルフホスト用パッケージ）を採用した。tarballを展開して確認したところ、収録サブセットは`latin`のみで日本語グリフを含まない。ただし、このアプリの既存の`:root`フォントスタック（`"Inter", -apple-system, BlinkMacSystemFont, sans-serif`）はそもそも`Inter`も日本語グリフを持たないため、日本語テキストは元々`-apple-system`等のOSシステムフォントへフォールバックしていた。`Maple Mono`をスタックの先頭に追加してもこの経路は変わらないため、日本語表示への影響は無いと判断した。

**読み込むweightの選定**: `grep`で実際に使われているTailwindのfont-weightユーティリティ（`font-semibold` 47件、`font-medium` 12件、`font-bold` 12件、`font-black` 4件、`font-normal` 1件、italicは0件）を調査し、400/500/600/700/800（`font-black`=900はMaple Monoに存在しないため、CSSの標準的なフォントマッチングで最も近い800が自動的に使われる）の5weightのみを`frontend/src/index.css`で`@import`した。ビルド後、`dist/assets/`に各weightのwoff2/woffファイルが出力されていることを確認済み（フォントファイルはJSバンドルとは別の静的アセットとしてオンデマンドで読み込まれるため、JSバンドルのgzipサイズには影響しない）。

**変更内容**:
- `frontend/package.json`: `@fontsource/maple-mono`を追加
- `frontend/src/index.css`: `@import "@fontsource/maple-mono/{400,500,600,700,800}.css";`を追加、`:root`の`font-family`を`"Maple Mono", "Inter", -apple-system, BlinkMacSystemFont, sans-serif`へ変更
- `frontend/src/App.css`: 同じ理由で`--app-font`（レガシーCSSクラスが`var(--app-font)`で参照している変数）も同じスタックへ変更
- `frontend/src/components/Navbar.jsx`: 「Coffee App」の`<span>`3箇所（モバイルトップバー・モバイルドロワー・デスクトップナビバー）に、既存のTailwindトークン`font-mono`（`frontend/src/index.css`の`--font-mono: "Space Mono", monospace`）を追加。新しい依存追加は不要だった（Space Monoは既にGoogle Fontsから読み込み済みで、評価・日付・グラフの件数など「事実としての値」表示に既に使われているトークンを流用した）

**検証**: `cd frontend && npm run lint && npm run build && npm run test`すべて成功（21件パス、ビルド成功、gzip 212.83kB、フォントファイルは別アセットのため対象外）。Docker dev環境でも`npm install`実行後、`curl`で`index.css`の配信内容に`maple-mono`が含まれること、`@fontsource/maple-mono/400.css`が200を返すことを確認済み。

未解決事項:

- ブラウザでの視覚的な最終確認が未実施（claude-in-chrome接続断のため）。Maple Monoが本文に、Space MonoがNavbarのブランド文字に正しく適用されていること、`font-black`(900)が800へフォールバックした際の見た目に違和感が無いことを次回セッションで確認する必要がある

---

### 2026-08: Navbarの「Coffee App」の文字色を白に変更

上記のフォント変更直後、ユーザーから「Navbarのcoffee appフォントの色が見づらい」という指摘を受けた。変更前は親`NavLink`の`text-text`（`--color-text: #fafafa`、ほぼ白）を継承していたが、視認性向上のため`frontend/src/components/Navbar.jsx`の「Coffee App」`<span>`3箇所に、既存の反転配色トークン`text-inverse`（`--color-inverse: #ffffff`、純白）を明示的に追加した。ハードコードした16進値ではなく、既にボタン等で使っている既存トークンを再利用している。

なお、この変更により当該`<span>`は親`NavLink`の`hover:text-text-secondary`（ホバー時に暗くする効果）の対象外になる（要素自身のcolorが親より優先されるため）。隣接する`CoffeeLogo`アイコンは`currentColor`のまま親のホバー効果を受け続けるため、ホバー時にアイコンだけ暗くなりテキストは白のまま、という差が生まれる。ユーザーからの指摘は文字色の視認性のみだったためこの挙動差は許容し、見た目に問題があれば次回調整する。

**検証**: `cd frontend && npm run lint && npm run build && npm run test`すべて成功（21件パス、ビルド成功）。Docker dev環境で`curl`により`Navbar.jsx`の変換結果に`text-inverse`が反映されていることを確認済み。

未解決事項:

- ブラウザでの視覚的な最終確認が未実施（claude-in-chrome接続断のため）。文字が白になっていること、ホバー時にアイコンとテキストの明るさが異なる見た目に違和感が無いかを次回セッションで確認する必要がある

---

### 2026-08: アプリ全体のフォントをMaple MonoからSpace Monoへ統一

前回、本文を`Inter`から`Maple Mono`へ変更した直後、ユーザーから「フォントを統一するか使い分けるか」の相談を受けた。以前は本文（Inter、プロポーショナル）とデータ値（Space Mono、モノスペース）の対比で「これは事実としての値」という区別が伝わっていたが、本文が既にモノスペース（Maple Mono）になった今、似て非なる2種類のモノスペースフォントが並ぶと「意図した使い分け」ではなく「微妙にズレたフォント」に見えるリスクがあると説明し、統一するなら本文と同じMaple Monoへ寄せることを推奨した。しかしユーザーは**Space Monoへの統一**を選択した。

**実装内容**:
- `frontend/package.json`から`@fontsource/maple-mono`を削除（`npm uninstall`。本文フォントとして不要になったため）
- `frontend/src/index.css`: 冒頭にあった`@import "@fontsource/maple-mono/{400,500,600,700,800}.css";`を削除（Space Monoは`frontend/index.html`のGoogle Fontsリンクで既に読み込み済みのため新規の読み込みは不要）。`:root`の`font-family`を`"Space Mono", "Inter", -apple-system, BlinkMacSystemFont, sans-serif`へ変更。`--font-mono`トークンの説明コメントも、本文と同じ値になった旨へ更新した
- `frontend/src/App.css`: `--app-font`を同じスタックへ変更
- 評価・日付・件数・Navbarの「Coffee App」に個別で付いている`font-mono`クラスは、本文と同じフォントになり見た目上は冗長になるが、「意図的にモノスペースにしている」という設計意図の記録として削除せず残した

**技術的な注意点（ユーザーに実装前に説明済み）**: Space MonoはGoogle Fonts上で400（Regular）と700（Bold）の2 weightしか存在しない（Maple Monoは100〜800の8段階あった）。そのため`font-medium`(500)・`font-semibold`(600)・`font-black`(900)は、ブラウザの標準的なフォントマッチングにより全て実質的に700（Bold）へ丸められ、太さによる視覚的な階層がRegular/Boldの2段階に単純化される。Space Mono自体の制約であり回避できないことを説明した上で、ユーザーの選択どおり実装した。

**検証**: `cd frontend && npm run lint && npm run build && npm run test`すべて成功（21件パス、ビルド成功、gzip 212.84kB。Maple Monoのフォントファイルが無くなった分、ビルド成果物自体は減った）。Docker dev環境でも`npm uninstall`実行後、`curl`で`index.css`の配信内容から`maple-mono`への参照が消えたこと、`Space Mono`が反映されていることを確認済み。

未解決事項:

- ブラウザでの視覚的な最終確認が未実施（claude-in-chrome接続断のため）。本文・見出し・Navbar・データ値すべてがSpace Monoで統一されていること、font-weightの階層が縮まったことによる見た目への影響を次回セッションで確認する必要がある

---

### 2026-08: italicで「主役ではない情報」を視覚的に差別化

Space Monoへの統一（上記エントリ）で、font-weightによる階層がRegular/Boldの2段階に縮まった。ユーザーから「italicを使い分けるのも効果的だと思う」という提案があり、どこに適用するか候補を出した上で実装した。

**候補の選定基準**: Space Monoは`frontend/index.html`のGoogle Fontsリンクで`ital,wght@0,400;0,700;1,400;1,700`とitalicも既に読み込み済みのため追加コストは無い。ただし本文サイズでの多用は可読性を落とすため、「主役ではない情報」に絞って提案した。`auth-card-kicker`・`LandingHero.module.css`の`.kicker`は、既に大文字+letter-spacing 0.08〜0.14em+font-weight 700が重なっており、そこにitalicまで足すと詰め込みすぎになるため対象から除外した。

**適用箇所（8箇所、ユーザー確認の上ですべて採用）**:
- 記録のメモ本文（自由記述、`record.notes`）: `frontend/src/pages/RecordDetailPage.jsx`、`frontend/src/features/graph/components/NodeDetailPanel.jsx`
- メモの抜粋（`record.notesExcerpt`）: `frontend/src/pages/EntityDetailPage.jsx`、`frontend/src/features/graph/components/NodeDetailPanel.jsx`
- 空状態・絞り込み結果0件の説明文（`text-text-tertiary`、`records.emptyDesc`/`records.noMatchDesc`/`graph.emptyDesc`/`stats.emptyDesc`）: `frontend/src/features/coffee-records/components/RecordListStates.jsx`（2箇所）、`frontend/src/features/graph/components/GraphStates.jsx`、`frontend/src/features/stats/components/StatsEmptyState.jsx`

いずれもTailwindの`italic`ユーティリティを既存のクラス文字列に追加するのみで、新規CSS・新規依存は無い。

**検証**: `cd frontend && npm run lint && npm run build && npm run test`すべて成功（21件パス、ビルド成功）。Docker dev環境で`curl`により、変更した6ファイルすべての変換結果に`italic`が含まれることを確認済み。

未解決事項:

- ブラウザでの視覚的な最終確認が未実施（claude-in-chrome接続断のため）。italicが可読性を落としていないか、Space Monoのitalic書体の見た目に違和感が無いかを次回セッションで確認する必要がある

---

### 2026-08-19: mobbin.com刷新一式のブラウザ実機確認、`.auth-card-kicker`のCSSバグ修正

前回セッションでclaude-in-chrome接続断のため確認できなかった一連の視覚変更（配色・影・モーション、Navbarアイコンのホバーアニメーション、新ロゴ`CoffeeLogo`、Space Monoへのフォント統一、メモ本文・メモ抜粋・空状態説明文へのitalic適用）を、起動済みのDocker Compose環境（`http://localhost:5174`）に対してclaude-in-chromeで実機確認した。

**確認内容と結果**:

- Navbar: ロゴ（コーヒー豆モチーフ）・「Coffee App」の白文字・Home/Records/Graph/Statsの各アイコン、いずれも問題なし。アイコンのホバー範囲がナビ項目全体（アイコン+テキストの背景ピル）に効いていることも確認
- Space Monoへの統一: Home/Records/Graph/Stats/Login/Register全画面で適用を確認。日本語部分は別フォントへフォールバックするが違和感は無い
- italic適用（8箇所）: `RecordsEmptyState`・`RecordsNoMatchState`・`GraphEmptyState`・`StatsEmptyState`の空状態説明文、`RecordDetailPage`のメモ本文（日本語ノート含む）、`NodeDetailPanel`の記録ノート/メモ抜粋、`EntityDetailPage`の関連記録メモ抜粋を、実データ（Demo Userアカウント）で1件ずつ表示・zoom screenshotで確認。可読性・書体とも問題なし
- グラフ画面: 凡例（ノード種別ごとのアイコン付きフィルターチップ）、ノード選択時のサイドパネル（Record種別・属性種別）、いずれも`docs/design.md`のGraph Visual Semanticsどおり
- コンソールエラー: Home/Records/Graph/Stats/Login/EntityDetail遷移を通して、リロード後の`read_console_messages`で確認した範囲ではエラー・警告なし

**発見したバグとその場で修正したもの**: `frontend/src/App.css`の`.auth-card-kicker`が未定義の`var(--primary)`を参照しており、Login/Registerページの「WELCOME BACK」「GET STARTED」が意図した青（`--color-primary`）ではなく白（見出しからの`inherit`相当）になっていた。ブラウザで実際に白文字であることを確認したうえで`var(--color-primary)`へ修正し、Vite HMRで即座に青へ変わることを確認した。

**次に実装すべき最小単位のリストの誤りを訂正**: リストの項目5「記録詳細画面に「関連ノード」を直接埋め込む」は、`RecordDetailPage.jsx`の`RecordConnectionsDiagram`（Connectionsセクション）としてすでに実装済みだった（`git log`未確認のままリストを更新し忘れていたことが判明）。未実装ではなく完了済みとして扱う。

**検証**: `cd frontend && npm run lint && npm run build`成功（CSS修正1行のみのためbackend/fastapi-serviceのテストは対象外）。

---

### 2026-08-19: RecordsページのNew Record・Editボタンが背景色と同化して見づらいバグを修正

ユーザーから「recordsページのnew recordボタンとeditボタンがフォントと背景色が似ていてとても見づらい」と報告があり、claude-in-chromeで実機確認したところ、白背景の反転ボタン（`primaryButtonClass`、`bg-inverse` + `text-on-inverse`）に対し、`<Link>`（`<a>`タグ）で実装された箇所だけ文字色がほぼ白（`getComputedStyle`で`rgb(250, 250, 250)` = `--color-text`）になっており、白背景に白文字で事実上読めなくなっていた（`<button>`で実装された箇所は正常）。

**原因**: `frontend/src/index.css`の`a { color: inherit; }`が`@import "tailwindcss";`の作る`@layer`の外（レイヤー無し）に書かれていた。CSSカスケード層の仕様上、レイヤー無しの宣言はどのレイヤーに属す宣言（Tailwindのutilityクラスも含む）よりも常に優先されるため、クラス名の特異性に関わらず`.text-on-inverse`（`color: var(--color-on-inverse)`、意図した値は`#141414`）が`a { color: inherit }`に負け、親要素から継承した`--color-text`（`#fafafa`）が使われていた。`<button>`は`a`セレクタの対象外のため影響を受けず、この非対称性が「一部のボタンだけ見づらい」という見え方の原因だった。

**影響範囲**: `primaryButtonClass`・`secondaryButtonClass`・`dangerButtonClass`を使う`<Link>`実装全箇所（RecordsページのNew Record、RecordDetailページのEdit・戻る・Delete関連ボタン等）。白背景の`primaryButtonClass`は文字が実質見えなくなる重大な見づらさだったが、透明背景の`secondaryButtonClass`は継承色がたまたま読める色になっていたため、今回指摘された箇所以外では気づかれていなかった。

**修正**: `a { color: inherit; }`を`@layer base { ... }`で囲み、Tailwindのbaseレイヤーに参加させることで、utilityクラスとの優先度がクラス特異性どおりに決まるようにした（`frontend/src/index.css`）。ボタン側のクラス指定は変更していない。

**検証**: 修正前後で`getComputedStyle`により対象リンクの`color`を確認（修正前`rgb(250, 250, 250)`→修正後`rgb(20, 20, 20)`）。Records/RecordDetail/RecordFormの各画面をclaude-in-chromeでzoom screenshotし、New Record・Edit・Save Recordボタンが黒文字で明瞭に読めることを目視確認。`cd frontend && npm run lint && npm run build`成功。

---

### 2026-08-19: デスクトップ表示の左右余白を解消（ページ幅の統一）

ユーザーから「デスクトップ表示で画面全体を満遍なく表示させたい。左右の空白が気になる」と要望があった。調査したところ、原因は共通レイアウトではなく、各ページが個別に`max-w-[Npx] mx-auto`のラッパーで自分の中身を狭く固定しており、値もページごとにバラバラ（900px/1100px/1480px/768px）で、`docs/design.md`にも幅の方針の記載が無い、根拠のない既定値だったことが判明した（`App.jsx`の`<main>`・`Navbar.jsx`は元々フル幅で無関係）。

ユーザーに方向性を確認し、「一覧・ダッシュボード系はほぼ画面幅いっぱいに、記録詳細・フォーム・プロフィールのような読み物/入力系は読みやすい適度な幅に保つ」という、ページ種別で使い分ける方針（Linear/Notion/GitHubと同じ考え方）を採用した。

**実装**: `frontend/src/styles/pageContainer.js`を新設し、2つの幅ティアを定数化した（`features/coffee-records/components/formStyles.js`と同じ「クラス文字列を定数化してJSXへ何度も書かない」パターン）:
- `wideContainerClass`（`max-w-[1600px]`）: `HomePage.jsx`（旧1480px）、`RecordsPage.jsx`（旧900px）、`StatsPage.jsx`（旧1100px、4箇所）
- `contentContainerClass`（`max-w-5xl`=1024px、Tailwindの標準トークン）: `RecordDetailPage.jsx`（旧900px、3箇所）、`RecordFormPage.jsx`（旧768px=`max-w-3xl`、3箇所）、`ProfilePage.jsx`（旧900px、3箇所）、`EntityDetailPage.jsx`（旧900px、3箇所）

各ページのloading/error/success分岐に3回ずつ重複していた同一のラッパー文字列リテラルも、この定数への置き換えにあわせて解消した。

**対象外（意図的に変更しなかったもの）**: `GraphPage.jsx`（元々幅制限なし）、`LoginPage.jsx`/`RegisterPage.jsx`の`.auth-card`（420px、中央寄せの小さい認証カードとして意図的な幅）、`App.css`の未使用`.app { max-width: 900px }`（`className="app"`を使うJSXが存在しない死んだCSSで、今回の問題とは無関係）。

**追記（同日）**: リリース後、ユーザーから「RecordDetail・EntityDetailページは変化していないように見える」と指摘があった。実測（`getBoundingClientRect`）で確認したところ、900px→1024pxへは正しく拡大されていたが、`wideContainerClass`側の変化（最大+700px）と比べて+124pxと控えめなため体感しづらかっただけで、バグではなかった。ユーザーに確認のうえ、`contentContainerClass`を`max-w-5xl`（1024px）から`max-w-[1200px]`へ再度拡大した（対象4ページとも自動的に反映）。

**検証**: `cd frontend && npm run lint && npm run build`成功。claude-in-chromeでウィンドウ幅1800px相当にリサイズし、Home/Records/Statsが`max-w-[1600px]`（`getComputedStyle`のgetBoundingClientRectで実測1600px）まで広がること、RecordDetail/RecordFormが適度な幅で本文・フォーム欄が間延びしていないことを目視確認。モバイル幅での実機確認は、claude-in-chromeの`resize_window`がこの環境では反映されなかったため未実施だが、`max-w-*`は`w-full`と併用しており、ビューポートがmax-width未満なら常に画面幅に収まる（今回の変更前から成立していた挙動で、上限値を上げても小さい画面の見た目には影響しない）ため実害は無いと判断した。

---

### 2026-08-20: UI/UXレビュー（Artifact）で見つかった6件をまとめて修正

前回セッションで実施したUI/UXレビュー（claude-in-chromeでの全ルート実機確認、`prompts/design/00-design-principles.md`との整合性チェック）の結果をArtifactとして発行し、ユーザーから「まとめて、着手してください」と実装の指示があった。重大度順にすべて対応した。

**1. `consumedAt`のタイムゾーン変換バグ（Critical）**: `frontend/src/features/coffee-records/validation/recordFormValidation.js`の`toApiPayload()`が、datetime-local入力の生文字列（タイムゾーン情報なし）をそのまま`consumedAt`として送信しており、UTCで動くバックエンドがそれをUTCとして誤って解釈するため、記録を編集するたびに+9時間（ブラウザのタイムゾーン分）ずつ加算されるバグを修正した。変換用に既に存在していたが呼ばれていなかった`fromDateTimeLocalValue()`（`utils/recordFormat.js`）を送信直前に通すよう1行変更。実機で新規作成→編集→再編集を行い、時刻が動かないことを確認した（バックエンドが`docker exec`でUTC稼働と確認済み）。検証時にDemo Userの既存記録（Onibus Coffee - Ethiopia）の時刻を誤って壊してしまったため、MongoDB上で元の値（`2026-07-24T16:00:00.000Z`）へ復元済み。

**2. LandingヒーローCTAの色（High）**: `frontend/src/pages/LandingHero.module.css`の`.cta`が`background: var(--color-primary)`（キーボードフォーカス専用の青、`00-design-principles.md` 6.1）を主要CTAに使ってしまっていたのを、他の主要ボタンと同じ反転配色（`--color-inverse` / `--color-on-inverse`）へ修正。同じページのヘッダーCTA（`home-link`）と見た目が揃った。

**3. Navbar/BottomTabBarの英語固定ラベル（Medium）**: `PRIMARY_ITEMS`（`Navbar.jsx`）・`TABS`（`BottomTabBar.jsx`）が`label`にリテラル文字列を持ち`t()`を通していなかったため、言語を日本語に切り替えても常時表示のナビだけ英語のままだった。`labelKey`へ置き換え、i18nの`nav.*`キー（ja: ホーム/記録/グラフ/統計/プロフィール/ログイン/ログアウト/新規登録）を新設して翻訳されるようにした。実装中に、NavbarのLogin/Logout/Registerボタン・Profileのフォールバック表示（`label={userName || "Profile"}`）も同じ理由で未翻訳だったことが分かり、あわせて修正。さらに`RecordsPage.jsx`の`<h1>Records</h1>`も同じパターンの未翻訳（`StatsPage.jsx`は`t("stats.heading")`で翻訳済みなのに`RecordsPage.jsx`だけ素の文字列だった）と分かったため、`records.heading`キーを新設して統一した。

**4. Login/Registerのバリデーション表示（Medium）**: 認証フォームには元々クライアント側検証が無く、必須項目が空でもサーバーへ送信され、サーバーからの単一のエラー文言（例: `"Name is required"`、`errors.legacy`に無いため未翻訳のまま表示）が欄の外に1件だけ出る作りだった。`utils/authFormValidation.js`を新設し（`recordFormValidation.js`と同じ形の純粋関数）、`LoginPage.jsx` / `RegisterPage.jsx`を`FormField` + `controlClass`（`features/coffee-records/components/formStyles.js`）を使う構成に書き換え、記録フォームと同じ「欄ごとの赤枠＋直下にアイコン付きメッセージ、全項目のエラーを一度に表示」にそろえた。あわせて、この2ページの見出し・ラベル・ボタン・切り替えリンク（"Login"/"Email"/"Password"/"Create Account"等）がすべて未翻訳だったことも判明したため、`auth.*`キーを新設して翻訳した（`profile.name`/`profile.email`は既存キーを再利用）。

実装中に、`frontend/src/App.css`の要素セレクタ`input { ... border: 1px solid var(--color-surface-2); ... }`（250行目）が、`@layer`の外にあるため詳細度に関係なくTailwindの`border-danger`等のutilityクラスに常に勝ってしまい、`controlClass`のエラー枠線が機能しない問題を発見した。これは`frontend/src/features/coffee-records/coffee-records.css`の`.coffee-page input { ... revert-layer ... }`が既に同じ理由で対処済みの問題と同一で、Login/Registerは`.coffee-page`を使っていないため対象外だった。同じ`revert-layer`の手法を`.auth-form input`に適用して解決した（`.auth-form input:focus`の独自の枠線色・box-shadowも、`controlClass`の`focus:ring-2 focus:ring-primary/50`と二重管理にならないよう削除）。

**5. 404ページが存在しない（Medium）**: `App.jsx`にcatch-allルートが無く、無効なURLへアクセスするとNavbar以外が完全に空白になっていた。`NotFoundPage.jsx`を新設し（`RecordsEmptyState`等と同じ「破線枠+アイコン+見出し+説明文+CTA」の見た目）、`ProtectedRoute`配下の最後に`<Route path="*">`として追加した。未ログイン時は従来どおり`ProtectedRoute`が先に`/landing`へリダイレクトするため、この画面が出るのはログイン済みユーザーのみ。

**6. 言語切り替え時に`<html lang>`が更新されない（Medium）**: `frontend/index.html`に`lang="en"`が静的に書かれたままで、i18nextの言語切り替えに追従していなかった。`frontend/src/i18n/index.js`に`i18n.on("languageChanged", ...)`で`document.documentElement.lang`を同期する処理を追加し、初期化時にも一度同期するようにした。

**ついでに修正したもの**: `App.css`の`.auth-switch a:hover { color: var(--primary); }`が、`.auth-card-kicker`で以前修正したのと同じ「存在しない`--primary`変数を参照する」バグだったため、`.auth-switch`が実際に使われているCSS（未使用の`.back-link`等、`docs/mlb-legacy-inventory.md`記載の死んだCSSは対象外）である今回に限り、あわせて`--color-primary`へ修正した。

**検証**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。`cd backend && npm test`（Test Suites: 23 passed, Tests: 325 passed、フロントエンドのみの変更のため回帰確認目的）。claude-in-chromeで、①新規作成→編集→再編集で時刻が動かないこと、②Landing・Login・Register・Navbar・BottomTabBarが日本語/英語両方で正しく表示されること、③Register/Loginで空欄のまま送信すると欄ごとの赤枠とメッセージが出ること、④存在しないURLでNotFoundPageが表示され「Homeへ戻る」が機能すること、⑤言語切り替えで`document.documentElement.lang`が`ja`/`en`に切り替わることを、それぞれ実機で確認した。

---

### 2026-08-20: Landingページの再設計

`docs/design.md`のMain Navigation・Screens一覧のどちらにもLandingページの記載が無く（調査で判明）、仕様が無い白紙の状態だった。ユーザーと相談のうえ、Landingページのみを対象に、既存の枠組み（ミニナビ・ヒーロー・単一CTA）を保ちながら次を実装した。

**構成（ユーザー提案のワイヤーフレームをベースに、ユーザーの指示で一部を調整）**:
1. Hero: 見出し（未翻訳だったのをi18nキー化）+ Get Started CTA + 背景にごく薄く漂う装飾グラフ
2. How it works: 以前は「Record→Connect→Discoverカード」と「How it works ①②③」が別々のセクションで同じ内容を2度説明していたため、ユーザーの指示で1つに統合（既存3カードに番号バッジ+矢印を追加）
3. Your Knowledge Graph: 知識グラフを実際に視覚で見せるセクション（新規）
4. Why Coffee App?: 他のジャーナル型アプリとの比較（`docs/product.md`のVisionにある「ジャーナル型・SNS型との違い」に対応、新規）
5. 末尾のGet Started CTA（Heroと同じ導線の再掲）

**Footerは検討したが、ユーザーの判断で今回は追加しないことにした。**

**装飾グラフイラスト**: 未ログインの訪問者には見せられる実データが無いため、Home画面の`GraphPreview`（`useGraph()`で認証必須のAPIを叩く構造）はそのまま使えない。新規に`frontend/src/pages/LandingGraphIllustration.jsx`を作り、固定座標のサンプルノード（record 2件が属性ノード2件を共有してつながる構成。単なる星型ではなく「記録どうしが属性を介してつながる」というConnectの体験を図にした）をSVGで描く、DB/API非依存の純粋な装飾コンポーネントにした。色は`features/graph/utils/nodeVisuals.js`の`getNodeVisual().colorClass`をそのまま使い、Graph画面と同じ配色。Hero背景用（`variant="ambient"`、大きく・薄く・ゆっくり漂う）とYour Knowledge Graph用（`variant="feature"`、くっきり）で同じコンポーネントを共有し、CSSのみ（`node-pulse`・`graph-drift`のkeyframes）でアニメーションさせている（新しいJSアニメーションライブラリは追加していない）。`prefers-reduced-motion: reduce`で無効化される既存の仕組みに、このアニメーションも合流させた。

**ついでに修正したバグ**: `LandingHero.module.css`の`.stepIcon`が`color: var(--color-primary)`（キーボードフォーカスリング専用色、`00-design-principles.md` 6.1）を装飾アイコンに使ってしまっていた。前回のUI/UXレビューで見つけたヒーローCTAの同型バグ（修正済み）と同じ問題で、`var(--color-text-secondary)`へ修正した。

**ドキュメント**: `docs/design.md`のScreens一覧に無かったLanding節を新設した（目的・構成・Record/Connect/Discoverを翻訳しない方針を明記）。

**検証**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。claude-in-chromeでログアウト状態から`/landing`を開き、日本語・英語両方で全セクション（Hero・How it works・Your Knowledge Graph・Why Coffee App?・末尾CTA）を確認。装飾グラフの`node-pulse`アニメーションが実際に適用されていることを`getComputedStyle`で確認（Hero背景用+Knowledge Graph用の計12ノードすべて）。コンソールエラー無し。

未解決事項:

- Heroの背景アニメーション（`graph-drift`）は「まず試してから採否を判断する」という前提で実装した。ユーザーによる見た目の最終確認はまだ

---

### 2026-08-20: Landingページのフィードバック対応（余白・Hero背景）

上記の再設計直後、ユーザーから実機を見たフィードバックが2件あった。

1. **左右の空白が気になる**: `.landing-nav` / `.landing-body`（`App.css`）が`max-width: 860px`に固定されていたのが原因。デスクトップの余白問題（2026-08-19のエントリ参照）と同種の問題がLandingにも残っていた。860px→1100pxへ拡大。各セクションの`.section`（`LandingHero.module.css`）も760px→960pxへあわせて拡大した
2. **Hero先頭が背景色と同じに見えない**: Hero内の装飾ノイズテクスチャ（`.grain`、`feTurbulence`によるSVG、opacity 0.05）が、その矩形の範囲だけページ背景よりわずかに明るく見え、「箱」のような境界線を作ってしまっていた。`getComputedStyle`で`.hero`自体の`background-color`は`transparent`（ページ背景と同じ）であることを確認したうえで、視覚的な差の原因が`.grain`だと特定し、`.grain`のdiv・CSS定義ごと削除した

**検証**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。claude-in-chromeでHero先頭の境界線が消え背景と一体化したこと、左右の余白が減ったこと、他セクション（How it works以降）のレイアウトが崩れていないことを目視確認。

---

### 2026-08-21: Login/Registerページの設計

Landingページに続き、Login/Registerページを設計した。ユーザーに「バグ修正のみ／ビジュアルを作り込む／具体的な変更点がある」の3択を提示し、「ビジュアルを作り込む」を選んだ。

調査の結果、`docs/design.md`のScreens一覧にLogin/Registerの記載も無く（Landingと同じ欠落パターン）、実装にも複数の問題が見つかった。

**1. Login/Registerが未ログイン者に壊れたナビリンクを見せていた**: `App.jsx`は`/landing`のときだけ通常のNavbar（Home/Records/Graph/Stats）を隠していたが、`/login`・`/register`では隠していなかった。未ログイン者がこれらのリンクを押すと`ProtectedRoute`に弾かれて`/landing`へ戻されるだけの壊れた導線になっていた。`App.jsx`の判定を`isLanding`から`PUBLIC_PATHS`（`/landing`・`/login`・`/register`の配列）へ拡張し、3ページとも通常のNavbar/BottomTabBarを出さないようにした。

Landingの`<nav className="landing-nav">`直書きだった中身（ロゴ、`LanguageSwitcher`、Loginリンク、Get Startedリンク）を`frontend/src/components/AuthNav.jsx`として切り出し、Landing/Login/Registerの3ページで共通利用する形にした。切り出しと同時に、`LandingHero.module.css`の`a.navCta`（`.home-link`が配色刷新で既に同じ見た目になっており死んでいたルール。コメントも刷新前の「緑グラデーション」時代のまま残っていた）を削除した。

**2. 装飾グラフをLogin/Registerの背景にも**: `LandingGraphIllustration.jsx`を`GraphIllustration.jsx`へリネームし、グラフ関連CSS（`.graphIllustration`等6クラス+`node-pulse`/`graph-drift`のkeyframes）を`LandingHero.module.css`から独立した`GraphIllustration.module.css`へ切り出した（Landing専用のスタイルファイルに、Landing以外のページが依存する状態を解消するため）。Login/Registerの`.auth-page`に、Heroと同じ`variant="ambient"`の装飾グラフを背景としてごく薄く配置した。

実装中、`.auth-page`がデフォルトの`flex-direction: row`だったため、AuthNavとカードが横並びになってしまう問題に気づき、`.landing-page`と同じ`flex-direction: column; align-items: center;`構造へ変更（`.auth-page-content`という新しいラッパーで、カードの中央寄せロジックをAuthNavの下の領域に限定した）。また、Heroにならって`.auth-page`に`overflow: hidden`を付けたところ、`AuthNav`の`position: sticky`が効かなくなることに気づき、`.landing-page`が元々`overflow: hidden`を使っていないことを確認したうえで削除した（装飾グラフの`graph-drift`によるはみ出しはごくわずかで、クリップの必要が無いと判断）。

**3. `.auth-card`がdesign tokensを使っていなかった**: `border: 1px solid rgba(137, 180, 250, 0.12)`（配色刷新前の青系の値の名残）を`var(--color-line)`へ、独自のbox-shadowを`var(--shadow-panel)`（カードがページ上で唯一のフォーカス要素というモーダル的な性質のため、`00-design-principles.md` 6.5の「モーダル・ボトムシート」用途に合致すると判断）へ、`border-radius: 20px`（角丸3段階のどれにも該当しない中間値）を`1rem`（16px、`rounded-2xl`と同値）へ、それぞれ変更した。

**4. `.auth-form label`のCSSバグ**: `display: grid; gap: 7px;`という指定が、`Email`ラベルと`REQUIRED`バッジの横並び（FormFieldのTailwind `flex`クラス）を改行させてしまっていた（`getComputedStyle`で`display: grid`を確認）。調査の結果、このルールはFormField導入前の旧DOM構造（`<label>Email<input/></label>`のようにlabelがinputごと囲んでいた形）向けのスタイルで、現在のFormFieldはlabelとinputが兄弟要素になっているため、丸ごと不要になっていたと判明。`@layer`で囲むのではなく、ルールそのものを削除した（今回のセッションで発見した中では珍しく「レイヤーの外にある」こと自体は問題の一部でしかなく、根本原因はDOM構造の変化に追従していなかったことだった）。

**ドキュメント**: `docs/design.md`のScreens一覧にLogin/Register節を追加した。

**検証**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。claude-in-chromeで、①AuthNav表示（Home/Records/Graph/Statsのリンクが消えていること）、②背景の装飾グラフ、③空欄のまま送信するとREQUIREDバッジがラベルと同じ行に収まりつつ赤枠エラーが出ること、④日本語/英語両方の表示、をLogin/Register両方で確認。`getComputedStyle`で`.auth-card`の`border`（`rgb(64, 64, 64)`=`--color-line`）・`box-shadow`（`--shadow-panel`の値と一致）・`border-radius`（16px）、`label`の`display`（`flex`）、AuthNavの`position`（`sticky`、`overflow:hidden`削除後も機能）を確認。Landingページに回帰が無いこと（AuthNav切り出し後も見た目が変わらないこと、`GraphIllustration`リネーム後も表示されること）も確認。`navCta`・`LandingGraphIllustration`という古い名前への参照がコード中に残っていないこともgrepで確認済み。

---

### 2026-08-21: Loginページを作り直し（装飾グラフ削除・幅拡大・AuthNav簡素化）

前日に設計・実装したLogin/Register（上記エントリ）を実機で見たユーザーから「全体を作り直したい」というフィードバックがあり、掘り下げたところ次の2点だった。

1. **装飾グラフは不要**
2. **幅が狭い**

2点目について、このセッションを通してRecords・Stats・RecordDetail・Landingのナビでも同種の指摘を受けていたため、ユーザーから「なぜ狭く作る傾向があるのか」と問われ、率直に振り返った: 「ログインカードは380〜450px」という業界の定番パターンを、このアプリ自身の見た目（大きめのSpace Mono・太いピルボタン）や`docs/product.md`の方向性と照らし合わせずに踏襲してしまっていた、`docs/product.md`の「静けさ」を「狭さ」と混同していた、移植元mlb-appの古いレイアウトの影響、の3点。

**構造は変えず幅と要素を見直した**（2カラム分割等の大きな構造変更は、フォーム自体が2〜3項目しかなく空間が持て余される懸念から不採用と判断し、ユーザーにも確認済み）:

- `LoginPage.jsx` / `RegisterPage.jsx`から`GraphIllustration`の使用と`<div className="auth-page-graph">`を削除。`App.css`の`.auth-page-graph`ルールも削除（Landingページは今も`GraphIllustration`を使うため、コンポーネント自体は残した）
- `.auth-card`の`max-width`を420px→520pxへ拡大

**AuthNavの追加指摘**: ユーザーから続けて「navbarもボタンが多くて気になります。しかも形もサイズもバラバラです」という指摘があり、実機で確認したところ、AuthNav内に「言語切り替え（`rounded-lg`の枠付きトグル）」「ログインリンク（枠も背景も無いテキストリンク）」「はじめましょうボタン（`rounded-full`の塗りつぶしピル+影）」という3種類の異なる見た目が並んでいたことを確認した。加えて、Recordsページの「All/Home/Cafe」フィルターが`rounded-full`を使っている（`RecordFilters.jsx`）ことを確認し、`LanguageSwitcher`の`rounded-lg`がこのアプリ自身の慣習からも外れていると判明した。

さらに、Login/Registerページ自身でAuthNavに「ログイン」「はじめましょう」の両方を出すのは冗長（Loginページ上部の「ログイン」リンクは押しても何も起きず、「はじめましょう」もカード下部の「アカウントをお持ちでないですか？新規登録」と同じ行き先）と気づき、ユーザーに選択肢を提示したところ、「Login/Registerではロゴ+言語切替だけにする」案が選ばれた。

- `components/AuthNav.jsx`に`minimal`propを追加。Landing（デフォルト）はロゴ+言語切替+Login+Get Startedのフルナビのまま、Login/Registerは`<AuthNav minimal />`でロゴ+言語切替のみに絞った
- `components/LanguageSwitcher.jsx`の`rounded-lg`を`rounded-full`へ修正（Recordsページのフィルターチップと同じ慣習にそろえた）

**ドキュメント**: `docs/design.md`のLogin/Register節を、装飾グラフ削除・AuthNav簡素化に合わせて更新。`GraphIllustration.jsx`冒頭のコメントも「Landing専用に戻した」旨へ更新。

**検証**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。claude-in-chromeで、①Login/Registerの装飾グラフが消えていること、②AuthNavがロゴ+言語切替のみになっていること、③言語切替がピル型（`rounded-full`）になっていること、④カード幅が広がっていること、をLogin/Register両方で確認。Landingページのフルナビ・Hero背景グラフに回帰が無いことも確認。`GraphIllustration`・`auth-page-graph`への参照がLogin/Register側に残っていないこともgrepで確認済み。

---

### 2026-08-21: Landingのナビ（AuthNavのフル版）も同じ問題を修正

上記のLogin/Register修正の直後、ユーザーから「landing pageのnavbarも同様です」という指摘があった。Landingは訪問者がまだどちらへ進むか決めていないため「ログイン」「はじめましょう」の両方を残す必要があり、Login/Registerのように削除する対象ではないが、この2つの見た目がバラバラだった点は同じ問題だった。

実機で確認したところ、「ログイン」は枠も背景も無いただのテキストリンク（`.landing-nav-login`）、「はじめましょう」は`.home-link`（`rounded-full`の塗りつぶしピル、`padding: 13px 20px`、影付き）で、高さも角丸も全く異なっていた。

このアプリには`.home-link.secondary`という、まさにこの用途（`.home-link`と完全に同じpadding/角丸で、色だけアウトライン版にする修飾クラス）向けのCSSが既に存在していたが、どこからも使われておらず、しかも配色刷新前の`rgba(137, 180, 250, ...)`という青系の値が残ったままの死んだコードだった（このセッションで繰り返し見つけてきた「配色刷新前の値が残る」バグの同型）。これを`--color-line` / `--color-text-secondary` / `--color-text`ベースへ修正して復活させ、AuthNavの「ログイン」リンクに`className="home-link secondary"`を適用した。`.home-link`本体のpadding/border-radius/フォントをそのまま継承するため、「はじめましょう」と完全に同じ高さ・角丸になる。

もう使われなくなった`.landing-nav-login` / `.landing-nav-login:hover`は削除した。

**検証**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。claude-in-chromeでLandingの「ログイン」「はじめましょう」が同じ高さ・角丸のピルボタンになっていること、ホバー時に枠線・文字色が明るくなること、Login/Registerページ（`minimal`のまま）に回帰が無いことを確認。`home-link.secondary`がAuthNav以外で使われていないこともgrepで確認済み。

---

### 2026-08-21: Landingのナビから「はじめましょう」も削除（ボタン数をさらに削減）

上記の見た目統一の直後、ユーザーから重ねて「landing pageのnavbarも同様にボタンが多いです。少なくするべきです」という指摘があった。

Landingページ全体を見返すと、Heroセクション（ナビのすぐ下、スクロール不要で常に見える位置）に既に大きな「はじめましょう」CTAがあり、ナビの「はじめましょう」はこれと完全に重複していた（How it works・Your Knowledge Graph・Why Coffee App?・末尾CTAのどのセクションにも「ログイン」への導線は無く、ナビの「ログイン」だけが唯一のログイン導線だったのとは非対称）。そのため、ナビからは「はじめましょう」のみを削除し、「ログイン」は残した。`AuthNav.jsx`の`minimal=false`（Landing用）は現在ロゴ+言語切替+ログインの3要素のみ。`auth.getStarted`翻訳キーはHero・末尾CTA・Registerページのkickerで引き続き使用中のためそのまま残した。`docs/design.md`のLanding節も更新。

**検証**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。claude-in-chromeでLandingのナビが「言語切替+ログイン」のみになっていること、Hero以下のセクションに回帰が無いこと、Login/Registerページ（`minimal`のまま）に影響が無いことを確認。

---

### 2026-08-22: ログイン済み状態で`/login`を開いた画面の崩れを修正

ユーザーがスクリーンショット付きで「ログイン確認の画面（ログイン済み状態で`/login`を開いたときの画面）の表示が崩れている」と報告した。実機は、カードと2つのボタン（Homeへ/ログアウト）が異常に縦長に引き伸ばされ、ボタン内テキストも上端に寄る、明らかな崩れだった。

原因は`LoginPage.jsx`の`if (token) {...}`分岐（ログイン済みユーザーが`/login`へ直接アクセスしたときの表示）だけが、これまでのLogin/Register作り直し作業で一度も触れられておらず、`HomePage.jsx`の旧実装が使っていた`.home-page`（`display: grid; min-height: 80vh;`）・`.home-empty-state`・`.home-actions`・`.home-link`のままだったこと。現在の`HomePage.jsx`はこれらのクラスをもう使っておらず、`grep`で確認したところ`LoginPage.jsx`のこの1箇所だけが最後の利用者だった。

**根本原因（CSSの入れ子Grid/Flexのstretch）**: `.home-page`（`display: grid`、子1つ）→`.home-empty-state`（同じく`display: grid`）→`.home-actions`（`display: flex`）という3重の入れ子で、いずれも`align-items`/`align-content`を明示していなかったため、CSS Gridのデフォルト値（`normal`、実質`stretch`相当）が連鎖し、`.home-page`の`min-height: 80vh`が子→孫→曾孫まで伝播して、最終的に`.home-actions`内の`.home-link`ボタンまで異常な高さに引き伸ばされていた。これまでのセッションで見つけてきた「レイヤー外のCSSが`@layer`のutilityクラスに勝つ」バグとは異なる、初めて見つけた種類のCSSバグ。

**修正**: この分岐を、Login本体・Register・「ログイン済みです」以外の状態と同じ`.auth-page`/`.auth-page-content`/`.auth-card`（`auth-brand`のCoffeeLogo込み）へ作り直した。ボタンも`.home-link`/`.home-link.danger`（生CSS）から`primaryButtonClass`/`dangerButtonClass`（`formStyles.js`、Tailwind、他のLogin/Register/RecordForm等と同じ共通クラス）へ置き換えた。AuthNavはあえて出さない（ログイン済みの状態でAuthNavの「ログイン」リンクを見せても意味が無いため）。

**ついでに行った片付け**: この修正で完全に未使用になった`.home-page`・`.home-onboarding-callout`（`.home-empty-state`と共有していた1つ目の定義）・`.home-empty-state`（2つ目の定義）・`.home-actions`（base）・`.empty-state-icon`・`.empty-state-title`・`.home-link.danger`を`App.css`から削除した（いずれも自分の今回の編集で使用箇所が無くなったもののみ。`docs/mlb-legacy-inventory.md`に記載済みの、別途対応予定の大きなMLB系未参照CSSブロック（`@media`内の`.app`/`.home-actions`等）は今回のスコープ外として触れていない）。CSSバンドルサイズが174.56KB→173.38KBへ縮小したことをビルドログで確認。

**検証**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。claude-in-chromeでログイン→`/login`へ直接アクセスし、カードが他のLogin/Registerカードと同じ高さ・見た目になっていること、「Homeへ」ボタンでHomeへ遷移すること、「ログアウト」ボタンで実際にログアウトし通常のLoginフォームへ戻ることを実機確認。Landing・Login・Register（いずれも未ログイン状態）に回帰が無いことも確認。

---

### 2026-08-23: notesの自由記述からキーワードを抽出し、知識グラフの新ノード種別`keyword`として追加

ユーザーから「メモに書いた『甘い』『苦い』などのキーワードをノード化して繋げたい」という要望があった。既存の知識グラフは、産地・農園・品種・精製方法・焙煎度・フレーバー・カフェという構造化フィールドのみをノード化しており、自由記述の`notes`はグラフから見えない状態だった。

**docsとの矛盾の扱い**: `docs/product.md`「MVP Before Intelligence」・`docs/features.md`のInsight/Stats節は「notesを一切読まない」「自由記述の分析は将来機能」としていたため、着手前にユーザーへ矛盾点を報告した。ユーザーと相談のうえ、「固定辞書によるルールベースのキーワード検出（AI/NLPではない）は許容する」という形へ原則を精緻化する方針で合意し、実装した。Insight/Stats/Discoverはスコープ外のまま維持（意図的な境界として`docs/features.md`に明記）。

**実装内容**:

- `backend/data/tasteKeywords.json`（新規）: 甘み・苦み・酸味・コク/質感・香り・後味・総評の7カテゴリ、約28語の固定辞書。`backend/data/cqiDatabase.json`と同じ`_comment`+`entries`形式
- `backend/core/graph/noteKeywordExtractor.js`（新規）: `extractKeywords(notes)`。辞書との部分文字列一致でキーワードを検出。否定表現（くない/じゃない/ではない/ない/なかった）が直後に続く場合は誤検出としてスキップする否定ガード付き。長い辞書語を優先し、重なる短い辞書語（例:「コクがある」と「コク」）は二重ノード化しないようにした
- `backend/core/graph/nodeId.js`: `keywordNodeId`を追加（farm/cafeと同じ、DBコレクションを持たない文字列由来ID）
- `backend/core/graph/graphBuilder.js`: `ATTRIBUTE_NODE_TYPES`に`"keyword"`を追加（`graphQueryValidator.js`が直接参照するため、フィルター側は自動対応）。`collectAttributeRefs`内で`extractKeywords(record.notes)`の結果を`KEYWORD`エッジとしてrefsへ追加。`buildGraph`本体・重複排除・エッジ生成ロジックは型に対して汎用的なため無変更
- フロントエンド: `frontend/src/index.css`に新規アクセントカラー`--color-accent-teal`を追加。`features/graph/utils/nodeVisuals.js`（Quoteアイコン・`ATTRIBUTE_NODE_TYPES`追加）、`features/graph/utils/canvasIcons.js`（Canvas描画用にQuoteアイコンのSVGパスを手動複製、`TYPE_TO_ICON_KEY`追加）、`i18n/locales/ja.json`・`en.json`（`graph.nodeTypes.keyword`）。`GraphFilters.jsx`・`GraphLegend.jsx`・`GraphCanvas.jsx`・`NodeDetailPanel.jsx`等は`ATTRIBUTE_NODE_TYPES`を汎用的に参照しているため無変更で対応
- docs更新: `docs/product.md`（MVP Before Intelligence原則の精緻化）、`docs/features.md`（Insight節に「Graphとの境界」小節を新設、Stats節に一言追記）、`docs/domain-model.md`（Knowledge Graph Termsにkeywordノードを追加）、`docs/knowledge-graph.md`（Graph Generation手順4に追記）、`docs/design.md`（Graph Visual Semanticsに`keyword: quote`を追加）

**データフロー**: `CoffeeRecord.notes`（保存済み、変更なし）→ `coffeeRecordSerializer.js`が既に`notes`をシリアライズ済み → `graphBuilder.js`の`collectAttributeRefs`が`noteKeywordExtractor.js`で辞書照合 → マッチした語ごとに`keyword:<語>`ノードと`KEYWORD`エッジを生成 → 既存の重複排除（Map）で同じキーワードを含む複数記録が1ノードへ統合 → フロントエンドは既存の汎用的なノード描画パイプラインでそのまま表示。グラフは都度計算されるため、既存記録のnotesにも自動的に遡って適用される（マイグレーション不要）。

**実行したテストと結果**:

- `backend/tests/noteKeywordExtractor.test.js`（新規、8件）: 空/null判定、単一・複数キーワード抽出、否定ガード2パターン、い形容詞の活用による自然な回避、長い辞書語優先のドキュメント的テスト、すべて成功
- `backend/tests/graphBuilder.test.js`に`describe("keywordノード")`ブロックを追加（6件）: ノード生成、記録間の重複排除、否定ガードでのノード非生成、複数キーワードでの複数ノード/エッジ生成、`nodeTypes`フィルターでの絞り込み、すべて成功
- `cd backend && npm run test`: 24 test suites / 339 tests すべて成功（既存テストの回帰なし）
- `cd frontend && npm run lint && npm run build`: 両方成功
- claude-in-chromeで実機確認: メモに「とても甘いコーヒーで、すっきりした後味だった。フルーティーじゃない味だと思う。」と記録を作成し、`/graph`で「甘い」「すっきり」の2つのkeywordノードが記録ノードと接続され、「フルーティー」（否定文脈）が正しく除外されていることを確認。Quoteアイコン・新色（teal）が凡例・フィルター・Canvas描画・ノード詳細パネルすべてで一致（コーヒーカップへのフォールバック無し）。日本語/英語切り替えで「キーワード」/「Keyword」ラベルが正しく表示されることも確認。検証用の記録は確認後に削除済み

**未解決事項**: なし（今回のスコープ内では完了）。

**次に実装すべき最小単位**: Insight/Statsへのkeywordノード活用の拡張（意図的に今回のスコープ外とした。docs/features.mdの「Graphとの境界」節に将来検討の余地として記載）。

---

### 2026-08-23: notesのキーワードとFlavorマスターが意味的に重複する場合、同一ノードへ統合（flavorAlias）

上記のkeywordノード追加をユーザーがグラフ画面で確認したところ、「Chocolate」（flavorとして明示選択）と「チョコレートのような」（notesから自動抽出したkeyword）が別々のノードに分かれていることに気づき、「同じノードにするべきだと思う」という指摘があった。

**設計判断**: 単純なID統一ではなく、`backend/data/tasteKeywords.json`の辞書語のうち、`backend/seeds/data/flavors.js`のFlavorマスター名と**意味的に完全一致**するものだけを`flavorAlias`フィールドで対応付けた（チョコレートのような→Chocolate、ナッツのような→Nutty、フローラル→Floral、クリーミー→Creamy、スパイシー→Spice の5語）。「甘い」「フルーティー」のように対応する単一のFlavorが存在しない一般語は、複数候補から1つを恣意的に選ぶと誤った統合になるため、意図的に対応付けなかった。

**実装内容**:

- `backend/data/tasteKeywords.json`: 該当5語に`flavorAlias`を追加
- `backend/core/graph/noteKeywordExtractor.js`: `extractKeywords`の結果に`flavorAlias`をそのまま含める（DB参照はせず、純粋関数のまま維持）
- `backend/core/graph/graphBuilder.js`: `collectAttributeRefs`が新たに`flavorsByNormalizedName`（Flavorマスターの正規化名索引）を受け取れるようにし、`flavorAlias`が実在のFlavorと一致すれば`keyword`ノードではなく既存の`flavor:<実ID>`ノードへ統合するrefを生成（一致しなければ従来どおり`keyword`ノードへフォールバック）。同一記録が明示的なflavor選択とnotesのflavorAlias両方で同じflavorを指した場合に記録が2回カウントされないよう、ref配列の末尾でid重複除去も追加
- `backend/services/coffee/graphService.js`: `masterDataRepository.findMany("flavors")`を`coffeeRecordRepository`の取得と並行実行し、正規化名でMap化して`buildGraph`の3つの呼び出し箇所（`buildGraphForUser`・`getRelatedRecords`・`getNodeDetail`）すべてに渡すよう変更
- docs更新: `docs/knowledge-graph.md`（Graph Generation手順4に統合ロジックを追記）、`docs/domain-model.md`（Knowledge Graph Termsに統合の説明を追記）

**影響範囲**: `graphBuilder.js`が初めてrecords以外の入力（Flavorマスター索引）を受け取るようになったが、DB/HTTPを直接呼ばない構造は維持しているため「純粋関数」という設計上の性質は変わらない。`flavorsByNormalizedName`は任意引数のため、既存の呼び出し（省略時）は従来どおり動作する（後方互換）。

**データフロー**: `masterDataRepository.findMany("flavors")`（Flavorマスター全件、lean）→ `normalizedName`をキーにMap化 → `graphService.js`が`buildGraph(serialized, { nodeTypes, flavorsByNormalizedName })`へ渡す → `collectAttributeRefs`内でnotesのキーワードマッチが`flavorAlias`を持つ場合にMapで実在確認 → 一致すれば`flavorNodeId(matchedFlavor.id)`で既存flavorノードのrefを生成 → 既存の重複排除（Map）がそのまま統合してくれる。

**実行したテストと結果**:

- `backend/tests/noteKeywordExtractor.test.js`に2件追加（`flavorAlias`のpassthrough確認、`flavorAlias`を持たない語には含まれないことの確認）、成功
- `backend/tests/graphBuilder.test.js`に`describe("keywordとflavorの統合（flavorAlias）")`を追加（5件）: 統合成功、索引未指定時の後方互換フォールバック、マスターに存在しないaliasのフォールバック、同一記録内での二重カウント防止、複数記録にまたがる統合、すべて成功
- `cd backend && npm run test`: 24 test suites / 346 tests すべて成功（既存テストの回帰なし）
- claude-in-chromeで実機確認: notesに「チョコレートのような風味がした。」とだけ書いた記録（flavor欄は未選択）を作成し、`/graph`の既存「Chocolate」flavorノードのrecordCountが2→3に増加し、ノード詳細パネルの関連記録一覧に、明示的にChocolateフレーバーをタグ付けした既存記録と並んで表示されることを確認。検証用の記録は確認後に削除済み

**未解決事項**: なし。

**次に実装すべき最小単位**: 上記エントリと同じ（Insight/Statsへのkeywordノード活用の拡張）。

---

### 2026-08-24: コーヒー詳細に味覚グラフ（6軸レーダーチャート）を導入

ユーザーから「コーヒーの詳細について、味覚グラフを導入したい」という要望があった。記録詳細画面には総合評価（`rating`、1〜5）しかなく、コーヒーの「味の形」を視覚的に把握できなかった。

**方式の検討**: 元データをnotesからの自動抽出（`noteKeywordExtractor.js`の再利用）にするか、手動評価の新項目にするかをユーザーに確認した。自動抽出は「語が存在するか」の二値判定しかできず1〜5の強度を表せないこと、ユーザー自身がAI/NLPへ踏み込まない方針を選んだことから、既存の`rating`と同じ手動評価パターンを6軸（甘み/苦み/酸味/コク/香り/後味）に拡張する方式を採用した。軸の語彙は`backend/data/tasteKeywords.json`のcategoryと呼び名を揃えているが、notesは読まない独立した項目。

**実装内容**:

- `backend/models/CoffeeRecord.js`: `tasteSweetness`/`tasteBitterness`/`tasteAcidity`/`tasteBody`/`tasteAroma`/`tasteAftertaste`の6フィールドを追加。既存の`rating`と全く同じ定義（`default: null, min: 1, max: 5`、整数バリデーション）。知識グラフのノードにはならない
- `backend/validators/coffeeRecordValidator.js`: `TASTE_FIELDS`定数と`validateTasteScore`を追加し、作成・更新それぞれの検証、`pickCoffeeRecordFields`の許可リストに反映
- `backend/services/coffee/coffeeRecordSerializer.js`: 6フィールドを`rating`と同じ`?? null`パターンでレスポンスに追加（一覧・詳細どちらにも自動的に含まれる）
- フロントエンド: `features/coffee-records/utils/recordFormat.js`に`TASTE_AXES`（軸定義の単一情報源）を追加し、`useRecordForm.js`・`recordFormValidation.js`・`RecordForm.jsx`の3箇所で共有。`RecordForm.jsx`のCoffee Details内に「Taste Profile」小見出し＋既存`RatingInput`を6回利用した入力を追加
- 新規コンポーネント`TasteRadarChart.jsx`+`tasteRadarLayout.js`（`frontend/src/features/coffee-records/`）: `RecordConnectionsDiagram.jsx`と同じ設計（純粋関数のレイアウトユーティリティ+自前SVG、チャートライブラリ不使用）。6角形の同心目盛り、評価値を結んだポリゴンを描画。色は`RatingInput`の星と同じ`warn`トークンを使用し「評価」の視覚言語を統一。未評価軸は中心（0扱い）にプロットする
- `RecordDetailPage.jsx`: Coffee InformationとTasting Noteの間に「Taste Profile」セクションを追加。全軸未設定なら非表示（既存の`hasCoffeeInfo`/`hasConnections`と同じパターン）
- i18n: `ja.json`/`en.json`に6軸のラベル+見出しを追加
- docs更新: `docs/domain-model.md`（Optional項目リストへ追記、知識グラフのノードにはならない旨を明記）、`docs/design.md`（New/Edit RecordとRecord Detailのセクション構成に追記）

**データフロー**: `RecordForm`の6つの`RatingInput`（既存コンポーネント再利用）→ `toApiPayload`が文字列⇄数値変換 → POST/PATCH `/coffee-records` → validatorが1〜5整数チェック → `CoffeeRecord`に保存 → GET時にserializerが`?? null`で返却 → `RecordDetailPage`が`TasteRadarChart`へ渡してSVGレーダーチャート描画。

**実行したテストと結果**:

- `backend/tests/coffeeRecordModel.test.js`: `describe.each`で6軸それぞれのバリデーション（null許可、1〜5整数のみ許可、0/6/小数拒否）を追加、成功
- `backend/tests/coffeeRecordValidator.test.js`: 同様に6軸の作成時・更新時バリデーション、`pickCoffeeRecordFields`の許可フィールドテストを追加、成功
- `backend/tests/coffeeRecordApi.test.js`: 作成時のtasteフィールド指定、作成→詳細→更新→削除の一連の流れテストにtasteAroma/tasteAftertasteを追加、成功
- `cd backend && npm run test`: 24 test suites / 391 tests すべて成功（既存テストの回帰なし）
- `frontend/src/features/coffee-records/validation/recordFormValidation.test.js`: `describe.each(TASTE_AXES)`で範囲チェック、`toApiPayload`の数値変換テストを追加、成功（34 tests）
- `cd frontend && npm run lint && npm run test && npm run build`: すべて成功
- claude-in-chromeで実機確認: 甘み4/苦み2/酸味5/コク3を設定し香り・後味を未評価のまま保存 → 記録詳細に六角形レーダーチャートが表示され、評価済み4軸が正しい半径、未評価2軸が中心にプロットされることを確認。編集画面を開き直し、6軸の星評価が正しく復元されることも確認。検証用の記録は確認後に削除済み

**未解決事項**: なし。

**次に実装すべき最小単位**: なし（今回のスコープで完結。将来的にInsight/Statsで味覚グラフの傾向を集計する機能は拡張候補になりうるが、現時点では要望なし）。

---

### 2026-08-24: UI/UXレビューの指摘6件を修正

ユーザーから「アプリを実用レベルにするため、UI/UX面でレビューしてほしい」という依頼があった。claude-in-chromeでHome/Records/RecordDetail/RecordForm/Graph/Stats/Profile/Landing/Loginを巡回し、コードでも裏付けを取った上で7件を指摘。ユーザーが選んだ6件を修正した（既存の未解決事項として記録済みのグラフのノード密集・クリック判定の不安定さは対象外）。

**指摘と対応**:

1. **味覚グラフに数値・a11yが無い**（優先度高、自分で実装した箇所の見落とし）: `TasteRadarChart.jsx`の六角形は形だけで評価値を表現し、SVG全体が`aria-hidden`のためスクリーンリーダーには何も伝わらなかった。チャートの下に6軸の数値一覧（`<dl>`、`RatingInput.jsx`と同じ「n / 5」「未評価」表記）を追加し、実質的な内容をこの一覧が担うようにした
2. **記録フォームの「コーヒーの詳細」が長すぎる**: 味覚グラフ6軸の追加で、開くと3画面分近いスクロールが必要になっていた。産地〜焙煎者・ロースターの項目群に「産地・フレーバー」という小見出しを追加し、既存の「味覚グラフ」見出しと合わせて2グループに視覚的に区切った
3. **検索中も件数表示が更新されない**: `RecordsPage.jsx`の見出しが検索中も常に全体件数のままだった。`isSearching`のときは検索結果件数（`search.entities.length + search.records.length`）を表示するよう修正
4. **Records一覧が横幅を使い切れていない**: Home画面の「最近の記録」は3列グリッドなのに、Records本体・検索結果一覧は単一列のリストのままだった。`RecordsPage.jsx`・`SearchResults.jsx`の両方を`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`に変更
5. **メモ欄（最大2000文字）に文字数カウンターが無い**: 上限に達すると案内なく入力できなくなる体験だった。「n / 2000」の表示を追加
6. **「Graphで見る」の表記が英日混在**: ナビは「グラフ」と完全に日本語化されているのに、この1箇所だけ「Graph」が残っていた。「グラフで見る」に統一

**変更ファイル**: `frontend/src/features/coffee-records/components/TasteRadarChart.jsx`・`RecordForm.jsx`、`frontend/src/pages/RecordsPage.jsx`、`frontend/src/features/search/components/SearchResults.jsx`、`frontend/src/i18n/locales/ja.json`・`en.json`

**実行したテストと結果**:

- `cd frontend && npm run lint && npm run test && npm run build`: すべて成功（テスト34件、既存テストの回帰なし）
- claude-in-chromeで実機確認: ①記録詳細で味覚グラフの下に6軸の数値一覧が表示され「グラフで見る」も完全日本語化されていることを確認、②記録フォームで「産地・フレーバー」の小見出しとメモの文字数カウンター（入力に追従）を確認、③Recordsページで検索すると「1件が見つかりました」に切り替わり、検索解除で全体件数に戻ることを確認、④デスクトップ幅でRecords一覧が2列グリッドで表示されることを確認

**未解決事項**: なし。

**次に実装すべき最小単位**: なし（今回のスコープで完結）。

---

### 2026-08-24: 記録詳細ページのレイアウトを見直し（メモの並び順・味覚グラフとConnectionsの横並び）

上記UI/UXレビューに続けて、ユーザーから「記録詳細ページはデスクトップでスクロール無しに見られた方がよいのでは」という指摘があった。Recordsの一覧（記録が増え続ける前提のため恒久的な解決にならない）とは違い、記録詳細は1件分の決まった量のコンテンツなので、「スクロール無しで収まる」ことを実際に狙える目標だと判断した。

調べたところ、縦の高さを最も占めていたのは「味覚グラフ」（正方形、約320px）と「つながり」（正方形、約384px）という、形の近い2つの補助的な図解を縦に積んでいたことだった。加えてユーザーから「メモはコーヒーの詳細の下に置く方が自然」という指摘もあった。

**対応**: `RecordDetailPage.jsx`のセクション順を、Coffee Information → Tasting Note（メモ）→ 味覚グラフ/Connectionsに変更（メモをコーヒーの詳細のすぐ後ろへ移動）。味覚グラフとConnectionsは同じdivide-yの1セクションにまとめ、両方存在するときだけ`lg:grid-cols-2`で横並びにする（片方のみのときは単一カラムのまま）。

**検証方法の制約**: claude-in-chromeの`resize_window`・AppleScriptでのウィンドウリサイズがこの環境では実際のビューポート幅に反映されず（`window.innerWidth`が888pxに固定され、`lg`ブレークポイント1024px以上を再現できなかった）、実際の横並び表示をスクリーンショットで直接確認することはできなかった。代わりに`matchMedia("(min-width: 1024px)")`がfalseであること・`lg:grid-cols-2`クラスがDOM上に正しく適用されていることをJavaScriptで確認し、さらに一時的な`<style>`注入でグリッドを強制的に2カラム表示させて崩れが無いことを視覚確認した（注入したstyleは確認後に削除済み。保存された変更ではない）。

**実行したテストと結果**:

- `cd frontend && npm run lint && npm run test && npm run build`: すべて成功
- claude-in-chromeで実機確認: ①メモが「コーヒーの詳細」の直後に移動していることを確認、②888px幅（`lg`未満）では味覚グラフ/Connectionsが縦積みのままであることを確認、③一時的なstyle注入による2カラムプレビューで、味覚グラフの6軸数値一覧・Connectionsのハブ&スポーク図とも崩れなく横並び表示され、スクロール無しで「編集」ボタンまで収まることを確認

**未解決事項**: 実際の1024px以上のビューポートでの見た目は、このセッションのブラウザ自動化ツールでは直接確認できていない（上記の代替検証で妥当性は確認済み）。次回、実ブラウザでウィンドウを広げて最終確認することが望ましい。

**次に実装すべき最小単位**: なし（今回のスコープで完結。上記未解決事項の実機最終確認のみ）。

---

### 2026-08-24: セキュリティレビューの指摘2件を修正（ログインAPIのNoSQLインジェクション・トークン失効時の自動ログアウト）

UI/UXレビューに続けて、ユーザーから「次はどんなレビューをすべきか」という相談があり、セキュリティレビューを提案・実施した。バックエンド（認証・所有者確認・NoSQLインジェクション・CORS・エラー処理・レート制限）とフロントエンド（トークン保存・XSS・依存パッケージ）を並行して監査。IDOR・XSS・CORS誤設定・依存パッケージの脆弱性は無し（`npm audit`もbackend/frontend共に0件）、`.env`もgit履歴含め一度も未コミットであることを確認したが、以下2件の実際の問題を発見し、ユーザーが選んだこの2件を修正した。

1. **ログインAPIのNoSQLインジェクション**: `backend/validators/authValidator.js`の`validateRegister`は`email`の型チェックをしているのに`validateLogin`は漏れており、`{"email": {"$regex": "^a"}}`のようなオブジェクトが`authController.js`の`User.findOne({ email })`へそのままMongo演算子として渡っていた（メールアドレスの登録有無を推測できるenumeration攻撃が可能）。`validateLogin`に`email`/`password`双方の型チェックを追加
2. **トークン失効時の自動ログアウトが未実装**: フロントエンドに独立した2つのAPIクライアント（`httpClient.js`と`services/api/userApi.js`）があり、どちらも401を検知する仕組み自体はあったが、実際に`/login`へ強制的に戻す処理が無かった（`localStorage`をクリアするだけで画面はログイン済みのまま取り残される）

**実装中に見つけた重要な分岐点**: 401は「トークンが無効」以外の意味でも使われている箇所が1つあった。`backend/controllers/userController.js`の`changePassword`は「現在のパスワードが間違っている」場合も401を返す。ここに一律の自動ログアウトを適用すると、パスワード変更フォームでの単純な入力ミスが強制ログアウトを引き起こす誤動作になるため、`changePassword`だけは自動ログアウトの対象から除外した。

**変更ファイル**:
- `backend/validators/authValidator.js`（`validateLogin`に型チェック追加）
- `backend/tests/authValidator.test.js`（新規）・`backend/tests/authController.test.js`（NoSQLインジェクション実例の回帰テスト追加）
- `frontend/src/utils/authStorage.js`（`handleUnauthorized`を追加）
- `frontend/src/features/coffee-records/api/httpClient.js`（401時に`handleUnauthorized`を呼ぶ）
- `frontend/src/services/api/userApi.js`（`getCurrentUser`/`updateProfile`/`deleteAccount`に適用、`changePassword`は意図的に対象外のまま）

**実行したテストと結果**:

- `backend/tests/authValidator.test.js`（新規10件）: `validateLogin`にオブジェクト・配列・数値等の非文字列を渡すと拒否されることを確認
- `backend/tests/authController.test.js`: `POST /api/auth/login`に`{ email: { $ne: null }, password: "x" }`を送り400が返る（200にも500にもならない）ことを確認する回帰テストを追加
- `cd backend && npm run test`: 25 test suites / 403 tests すべて成功
- `cd frontend && npm run lint && npm run test && npm run build`: すべて成功
- claude-in-chromeで実機確認: ①通常のログイン・ログアウトが今まで通り動作することを確認（回帰確認）、②`localStorage`のトークンを不正な値に書き換えて`/records`へ遷移し、自動的に`/login`へリダイレクトされることを確認、③Profile画面で現在のパスワードを間違えて変更しようとすると「Current password is incorrect」のトースト通知が出るだけで、強制ログアウトされずログイン状態が維持されることを確認（今回の重要な回帰ポイント）

**未解決事項**: 今回対象外とした指摘（JWT検証への`algorithms: ["HS256"]`明示、認証系以外のエンドポイントへの全体的なレート制限追加）は`docs`未反映のまま。レビュー中に表示されたMongoDB Atlasの接続情報のローテーションはユーザー側の対応が必要（リポジトリには一切コミットされていないことは確認済み）。

**次に実装すべき最小単位**: 上記の未対応項目（JWT algorithms明示、全体的なレート制限、パスワード変更時のトークン失効）。

---

### 2026-08-24: コーヒー診断（Coffee Diagnosis）機能を追加

ユーザーから「PostCoffeeなど既存のコーヒーアプリと比べて機能・UI/UXが弱い」という率直な指摘を受け、PostCoffee（コーヒーのサブスクアプリ）を実際に調査した。PostCoffeeの強み（初回クイズ診断＋購入ごとのフィードバックで育つ好みプロフィール）は通販の推薦エンジンとしての強みであり、`docs/product.md`が明記するこのアプリの立ち位置（ECサイトではない、AIチャット推薦はスコープ外）とは競合軸が異なる。ユーザーと相談のうえ、「機能をPostCoffeeに寄せるのではなく、クイズ形式ではなく記録から好みを提供するコーヒー診断機能を追加する」方針で合意した（フィードバック機能は今回スコープ外）。

調査の結果、新しい発見ロジックを大量に作らなくても実現できることが分かった: `insightBuilder.js`は6種のInsightを毎回すべて計算しているのにフロントは`insights[0]`しか見せていない、`statsBuilder.js`が返す`homeVsCafe`は計算されているのに対応する`HomeVsCafeCard.jsx`がどこからもimportされていない（`docs/features.md`に「将来の再導入候補」と明記済みだった箇所）、`roastLevel.order`と`Flavor.category`はInsight/Stats/Discoverのどこからも使われていない。そこで新規に作るのは「焙煎度×フレーバーcategoryのルールベース診断（archetype）」1つだけに絞り、既存のInsight全件・Statsの要約と束ねて1画面（`/diagnosis`）にした。

**実装**:
- `backend/core/diagnosis/diagnosisBuilder.js`（新規）: 焙煎度をlight/medium/darkの3バケットに分け、最多バケットを求める（3件未満・同率首位なら`archetype: null`）。フレーバーのcategoryも集計するが、こちらは件数不足・同率首位でも診断全体は諦めず「categoryを問わない」一般則へフォールバックする（`insightBuilder.js`の「同率首位は断定しない」方針を踏襲しつつ、categoryは焙煎度ほど根拠が強くないと判断し意図的に緩めた）。8種類のARCHETYPES（lightFruity/lightFloral/darkNutty/darkSweet/mediumSpicy/light/dark/medium）を配列の並び順＝優先順位で判定する
- `backend/services/coffee/diagnosisService.js`（新規）: `insightService.buildInsightsForUser`・`statsService.buildStatsForUser`をそのまま呼び出して束ねるだけで、Insight/Stats側に新しいロジックは足していない（`discoverBuilder.js`が他のcore/*を意図的にimportしない前例に倣った設計）。RoastLevelは`normalizedName`を持たないため、`_id`文字列をキーにした索引を作ってbuilderへ渡す
- `backend/controllers/diagnosisController.js`・`backend/routes/diagnosisRoutes.js`・`app.js`への追加（`insightRoutes.js`と同じ形。認証必須、クエリパラメータ無し）
- `frontend/src/features/diagnosis/`（新規: `api/diagnosisApi.js`・`hooks/useDiagnosis.js`・`components/ArchetypeCard.jsx`・`components/InsightList.jsx`・`components/DiagnosisSkeleton.jsx`）: `useInsights.js`/`useStats.js`と同じ構成。`InsightList.jsx`は`features/insights/utils/describeInsight.js`をそのまま再利用し、insight全件を表示する（Home画面のDiscoverCardは`insights[0]`だけ）
- `frontend/src/pages/DiagnosisPage.jsx`（新規）: `StatsPage.jsx`と同じ「divide-yで3つの問いに分ける」構成（コーヒータイプ／気づき／記録の全体像）。記録の全体像では`OverviewStats`・`HomeVsCafeCard`（今回で初めて画面に日の目を見た）・`TopRankingList`（産地・フレーバー）を再利用
- `App.jsx`に`/diagnosis`ルートを追加。**Navbar.jsx・BottomTabBar.jsxのどちらにも追加していない**（両ファイルを直接確認: `Navbar.jsx`は4項目、`BottomTabBar.jsx`は5項目とタブ構成が異なる点を把握した上で、両方とも変更しない判断をした。Navbar.jsxの「ナビ項目を少なく保つ」という既存の設計意図と矛盾させないため）
- 導線: `DiscoverCard.jsx`に3行目として常時表示の「コーヒー診断を見る」リンクを追加（他の2行と違いデータの有無を問わない静的リンク。診断専用の3つ目のfetchをこのカードに追加しないため）、`StatsPage.jsx`に「詳しい診断を見る」リンクを追加
- `ja.json`/`en.json`に`diagnosis`セクション（8タイプ分のtitle/description含む）、`discover.diagnosisLink`、`stats.viewDiagnosisLink`を追加
- `docs/features.md`（Coffee Diagnosisセクション新設）・`docs/design.md`（Screens・Main Navigation）・`docs/api.md`・`docs/domain-model.md`を更新

**変更ファイル**: 上記参照。バックエンド新規5ファイル＋`app.js`、テスト新規2ファイル、フロントエンド新規6ファイル＋既存4ファイル変更（`App.jsx`・`DiscoverCard.jsx`・`StatsPage.jsx`・i18n2ファイル）。

**データフロー**:
```text
DiagnosisPage
  → useDiagnosis → diagnosisApi.fetchDiagnosis()
  → GET /api/diagnosis
  → authenticate
  → diagnosisController
  → diagnosisService（自分のCoffeeRecordを取得 + RoastLevel/Flavorの索引を作成
                       + insightService/statsServiceを並行呼び出し）
  → core/diagnosis/diagnosisBuilder（純粋関数。archetype判定のみ）
  → { archetype, insights, stats }
  → ArchetypeCard / InsightList / OverviewStats・HomeVsCafeCard・TopRankingList
```

**実行したテストと結果**:
- `backend/tests/diagnosisBuilder.test.js`（新規13件）: 8ルールそれぞれの発火、焙煎度の閾値未満・同率首位でnull、フレーバーcategory不足・同率でも一般則へフォールバックすることを確認
- `backend/tests/diagnosisApi.test.js`（新規）: 未認証401、自分の記録だけからarchetypeを判定し他ユーザーの記録が混ざらないことを確認
- `cd backend && npm run test`: 27 test suites / 416 tests すべて成功
- `cd frontend && npm run lint && npm run build`: すべて成功
- claude-in-chromeで実機確認（デモユーザー、記録15件）: ①Home画面のDiscoverCardに「コーヒー診断を見る」が3行目として表示されクリックで`/diagnosis`へ遷移、②archetype「浅煎り × フルーティー派」・Insight3件（topCombination/topProcessRating/topOrigin）・記録の全体像（記録数・平均評価・記録日数・家とカフェ・産地/フレーバーランキング）がすべて正しく表示、③Statsページの「詳しい診断を見る」リンクが機能、④デスクトップ・モバイルどちらのナビにも`/diagnosis`が表示されないことを確認、⑤日本語/英語切り替えでarchetypeの文言・見出しとも正しく切り替わることを確認、⑥コンソールエラー無し

**未解決事項**: 8種類のARCHETYPES判定ルール・閾値（`minRoastSample: 3`・`minFlavorSample: 3`）はデモデータでの動作確認のみで、実際のユーザーの記録傾向に基づくチューニングは未実施（`tasteKeywords.json`と同種の課題）。Graph画面の既知の粗さ（混雑・ノードサイズ・クリック判定・リサイズ未対応）は、ユーザーと相談のうえ今回のスコープには含めず次回へ見送った。

**次に実装すべき最小単位**: Graph画面の作り込み（混雑・ノードサイズ・クリック判定・リサイズ対応の改善。「UI/UXの作り込みに機能数が少ない分こだわるべき」というユーザー方針に基づく次の優先候補）。

---

### 2026-08-26: Graph画面の作り込み（ノードサイズ・混雑・リサイズ・クリック判定・カメラ追従の改善）

前回のコーヒー診断機能追加時にユーザーから示された「機能数が少ない分UI/UXの作り込みにこだわるべき」という方針に基づき、次点候補としていたGraph画面の作り込みに着手した。

`backend/core/diagnosis/diagnosisBuilder.js`と同様、`frontend/src/features/graph/components/GraphCanvas.jsx`（554行）のファイル冒頭には既に詳細な調査コメント（既知の不具合4件）が残っており、これを直接読み込んだ上で、2つのExploreエージェントによる並行調査（描画・物理演算・サイズ管理側／クリック判定・フィルターUI側）を実施した。

**ノードサイズの伸びが分かりにくいという指摘**: 実装着手前にユーザーへ「ノードの大きさを関連項目（記録数）が多いものほど大きくすると良い」と提案されたが、調査の結果これは既に実装済み（degreeベースの線形＋キャップ方式）と判明。ただし最大でも+9.6px程度しか変わらず気づけないレベルだったため、平方根（sqrt）カーブへ変更し、変化をはっきりさせた。

**ノード巨大化バグの診断訂正**: 以前IMPLEMENTATION.mdに「収束中に一瞬ノードが巨大化して見える」不具合として記録し、カメラのbounding box計算タイミングが原因という仮説のもと対処済みとしていたが、ユーザーへの再ヒアリングで「グラフ画面を開いたまま他のタブ・アプリに切り替えて放置すると発生し、リロードすると直る」という、以前の仮説とは異なる条件だったことが判明した。`force-graph`本体のソース（`node_modules/force-graph/dist/force-graph.mjs`）を読み直し、canvasの内部解像度が`width`/`height`のprop変化時にしか`window.devicePixelRatio`を再計測しない一方、毎フレームの再描画は都度の`devicePixelRatio`を読み直すため、バックグラウンドタブでOS/ブラウザの挙動により`devicePixelRatio`がずれるとノードが実際より大きく描かれる、という正しい原因を特定した。発生条件が特殊でリロードという回避策も既にあるため、ユーザーと相談のうえ修正は見送り、この訂正した診断のみを記録に残す（以前の「カメラのフラッシュ」という診断は誤りだった）。

**実装**:
- `frontend/src/features/graph/utils/graphNodeSizing.js`（新規）: `GraphCanvas.jsx`からノードサイズ計算（`recordRadius`・`attributeHalfWidth`・`attributeHalfHeight`）を切り出し。degreeによるサイズの伸びを、線形＋キャップ方式から平方根カーブ（`sqrt(degree) * DEGREE_SIZE_SCALE`）へ変更。record数が多い産地等が際限なく巨大化しないよう、伸びが自然に穏やかになる曲線を選んだ。あわせて`nodeCollideRadius(node)`を新設し、d3-forceの`forceCollide`に固定値ではなくノードごとの実サイズ＋ラベル余白に連動する関数を渡せるようにした（混雑対策）。実機確認しながら`DEGREE_SIZE_SCALE`を6→12→18と段階的に引き上げ、最終的に18で確定した（ユーザーから「まだ弱い」という率直なフィードバックを受けての調整）
- `frontend/src/features/graph/utils/graphHitTest.js`（新規）: クリックの当たり判定（`findNodeAtGraphPoint`）を切り出し、視覚サイズより少し広い専用のヒットパディング（+4px）を追加。クリック判定が不安定という指摘に対応
- `frontend/src/features/graph/utils/graphAdapter.js`（新規）: backend応答からreact-force-graph-2d形式への変換（`buildForceGraphData`）を切り出し
- 上記3ファイルは全てDB/HTTP/canvasに依存しない純粋関数のため、Graph機能として初めてのフロントエンドユニットテストを追加した（`graphNodeSizing.test.js`・`graphHitTest.test.js`・`graphAdapter.test.js`、計24件）
- `GraphCanvas.jsx`: 上記の切り出しに伴い、物理演算の適用・カメラ追従・イベント配線・canvas描画のオーケストレーションへ整理。加えて、①`chargeStrength`を-800から-450へ緩和（衝突半径がノード実サイズに連動するようになったため、以前ほど強い反発力が不要になった）、②リサイズ対応: 初回計測値で恒久的に固定していたcanvasサイズを、ResizeObserverの発火をデバウンス（200ms）した上で追従できるように変更し、サイズ変更直後に`fitCamera`で視点のずれを補正、③`CLICK_TOLERANCE_PX`を6→8に緩和、④`userInteractedRef`（一度操作すると以後永久にオートフィットしない恒久ラッチ）を、`lastInteractionAtRef`（最後の操作から一定時間＝600ms経てば再開するクールダウン方式）へ変更

**変更ファイル**: `frontend/src/features/graph/utils/graphNodeSizing.js`・`graphHitTest.js`・`graphAdapter.js`（新規、テスト含め計6ファイル）、`frontend/src/features/graph/components/GraphCanvas.jsx`（既存改修）。

**データフロー**: GraphPage → GraphCanvas（graph propを受け取る）→ `buildForceGraphData`（graphAdapter.js、純粋関数）→ `{nodes, links}` → `nodeCollideRadius`/`recordRadius`/`attributeHalfWidth`（graphNodeSizing.js）を使った物理演算適用・描画 → クリック時は`screen2GraphCoords`で得たグラフ座標を`findNodeAtGraphPoint`（graphHitTest.js）へ渡して当たり判定、という流れ自体はAPIの形状・既存のカメラ追従/rAFループの仕組みを変更していない。

**実行したテストと結果**:
- `graphNodeSizing.test.js`・`graphHitTest.test.js`・`graphAdapter.test.js`（新規24件）: degreeによる半径の伸び方（sqrtカーブ・選択時のスケール）、当たり判定の境界値・ヒットパディングの効果、degree集計・nodes/links変換をそれぞれ確認
- `cd frontend && npm run test`: 5 test files / 58 tests すべて成功
- `cd frontend && npm run lint && npm run build`: すべて成功
- claude-in-chromeで実機確認（デモユーザー、記録15件）: ①ノードサイズの差が視覚的にはっきり分かること（5★・多くの関連を持つ記録ノードが明確に大きく描画される）を確認、②コンテナ幅をJS経由で変更しcanvasが追従して再描画される（backing storeも987px→448px相当に追従）ことを確認、③リサイズ後もクリック（記録ノード選択→詳細パネル表示）が正しく動作することを確認、④グラフを開いた直後にホイール操作を行い、数秒後に自動フィットが正常に再開する（恒久停止しない）ことを確認、⑤ドラッグでのパン操作が引き続き機能することを確認、⑥コンソールエラー無し
- **検証環境の制約**: このセッションのclaude-in-chrome自動操作環境では、ResizeObserverのコールバックが素朴な待機だけでは発火しない場合があった（実際のレイアウト変更後、強制的な同期リフロー＋`resize`イベント発火＋複数フレーム待機を組み合わせて初めて発火を確認できた）。これは前回セッションで判明していた「実ウィンドウリサイズがこのツールでは反映されない」という制約より踏み込んだ、自動化環境固有の制約と考えられる。最終的にはcanvasの実際のリサイズ・その後のクリック動作を確認できているため、実装自体の問題ではないと判断した

**追記（同日）: `warmupTicks`による対処 → ユーザーの確認を取らずに実装したため取り消し**

`DEGREE_SIZE_SCALE`を12→18へ引き上げた直後、ユーザーから「巨大化バグ（devicePixelRatioのズレ）が起きた」と報告があった。実際には放置中の`devicePixelRatio`ズレとは別物で、ファイル冒頭の既知の不具合3として元々記載されていた「マウント直後、ノードが中心付近に固まっている極小のbounding boxに合わせてカメラが一瞬だけ大きくズームインするフラッシュ」が、`DEGREE_SIZE_SCALE`引き上げでノード自体の見た目サイズが大きくなったことでより目立つようになったものと判断した（ユーザー自身も「グラフは読み込まれるたびに計算し直すのが原因では」と正しく指摘）。

この診断自体は正しかったが、対処（`<ForceGraph2D warmupTicks={30}>`の追加、`fitCamera`内の防御的なズームクランプ）を**CLAUDE.mdの「実装前に必ず確認」という方針に反し、ユーザーに提示・確認しないまま実装してしまった**。さらに、`warmupTicks`は初回描画前に物理演算を先に進めすぎる副作用があり、結果として「グラフを開いた瞬間、全体が小さくズームアウトして見づらい」という新たな問題を生んだ（カメラの自動フィットは「今広がっている範囲を画面に収める」計算のため、表示前に広がりすぎるとその分ズームアウトされる）。ユーザーからの指摘を受け、`warmupTicks`・ズームクランプとも完全に取り消した（`GraphCanvas.jsx`は本エントリ冒頭で説明した実装内容の状態に復元済み）。

**教訓**: 診断が正しくても、対処の実装は必ず事前にユーザーへ提示し確認を取ってから行う（CLAUDE.md「作業スタイル」「Before Implementation」を今後厳守する）。

**追記（同日）: `DEGREE_SIZE_SCALE: 18`で、開いた直後のノード重なりが解消せず固定される問題**

`warmupTicks`取り消し後もユーザーへ再確認したところ、「一瞬だけ大きく見えるフラッシュ」ではなく、**数秒待っても直らず、複数のノードが重なったまま固定される**という報告だった。これは既知の不具合3（開いた瞬間のズームインフラッシュ）とは別の問題で、原因は物理演算のパラメータ不足だと考えられる: `DEGREE_SIZE_SCALE`を18まで引き上げたことで`nodeCollideRadius`（ノードが重ならないために必要な最低距離）が大きく増えたのに対し、ノード同士を押し広げる`chargeStrength`（-450。前回`DEGREE_SIZE_SCALE`が小さかった頃に合わせて緩めていた値）は据え置きのままだったため、シミュレーションが収束条件に達するまでに十分ノードを押し広げきれず、詰まった配置のまま止まってしまう。

対処案（`chargeStrength`を強める、または`DEGREE_SIZE_SCALE`を下げて必要な反発力自体を減らす）をユーザーへ提示したが、「調整には試行錯誤が要る」ことを理解のうえ、一旦は対応を見送り、現状を受け入れるという判断になった。コードの変更は行わなかった。

**追記（同日）: 本当の原因は「孤立ノードの無限漂流」だった**

ユーザーから改めてスクリーンショットが共有され、実際には「ノード同士が重なる」ではなく「グラフ全体が小さな一角に収まり、大部分が空白になる」という症状だと判明した。上記の`chargeStrength`不足という診断は誤りで、`GET /api/graph`のレスポンスを実際に取得してdegree（エッジの登場回数）を集計したところ、`とりあえず買った豆`という記録（産地・精製方法・フレーバー等を何も選択していない）が、他のどのノードとも1本もエッジを持たない（degree: 0）ことが分かった。

エッジ＝リンクによる引力を一切受けないノードは、`chargeStrength`の反発力だけを受け続けるため、中心の集団から際限なく離れていく。`fitCamera`（`zoomToFit`）は画面内の全ノードを収めようとする設計のため、この1つの孤立ノードだけが大きく離れることで、グラフ全体を大きくズームアウトさせてしまっていた。

**対処**: `GraphCanvas.jsx`の物理演算設定に、`d3-force`の`forceX(0)`/`forceY(0)`（中心へ引き戻す力）を追加した。孤立ノードにはこれが実質的に「反発力を受けても無限には離れない」ための唯一の位置制約として働き、つながりのあるノードには元々のlink/charge/collideの力の方が強く効くため、レイアウト全体への影響は小さい設計とした。

最初はユーザーの指示で`strength(0.3)`（強め）にしたところ、「開いてから収束するまでの広がり方がぎこちない」というフィードバックがあった。反発力と中心への引き戻し力がせめぎ合い、不自然な揺れ方に見えていたためと考え、`strength(0.05)`まで弱めたところ、①孤立ノードによるズームアウト問題は再発せず、②開始から収束までの動きも自然になったことを実機で確認し、ユーザーの了承を得た。

**未解決事項**: 上記の通り、`DEGREE_SIZE_SCALE: 18`のままだと開いた直後にノードが重なって見えることがある（ユーザー了承済み、対応見送り）。「開いた瞬間の一瞬のズームインフラッシュ」（既知の不具合3）も、`DEGREE_SIZE_SCALE`引き上げにより以前より目立ちやすくなった状態のまま未対応。放置中の`devicePixelRatio`ズレによるノード巨大化（別不具合）も、原因を特定済みだがユーザーと相談のうえ今回も修正を見送った（発生条件が特殊、リロードという回避策が既にある、検証も難しいため）。`chargeStrength: -450`・`linkDistance: 100`・sqrtカーブの`DEGREE_SIZE_SCALE: 18`は実データ（記録15件）での目視確認に基づく値だが、記録数がさらに増えた場合の見え方は未検証。`dateFrom`/`dateTo`フィルターUIは今回のスコープ外のまま（別の優先項目として次点に残る）。

**次に実装すべき最小単位**: 特になし（Graph画面の作り込みとして着手していた項目は本エントリで一通り完了。次は`dateFrom`/`dateTo`フィルターUIの追加や、フロントエンドのテストを`RecordForm`本体・`ProfilePage`等へ広げる、といった既存の未解決事項リストから選ぶ）。

---

### 2026-08-27: UI/UXの作り込み（全体レビューの修正＋色使い・導線の一貫性強化）

ユーザーから「アプリ全体を改めてレビューしてほしい」という依頼を受け、forkエージェントによる全画面のブラウザ確認（Home/Records/RecordForm/RecordDetail/Edit/Graph/EntityDetail/Stats/Diagnosis/Profile、コンソールエラー0件）で8件の指摘を得た。

そのうえで「PostCoffeeとの比較で機能ではなくUI/UXの作り込みで勝負する」という以前の方針を改めて相談し、単なるバグ修正に留めず、①Diagnosisページ（PostCoffeeの"マイコーヒープロフィール"に相当する勝負どころ）への視覚的アイデンティティ付与、②「リンク経由でしか辿り着けないページ」の戻り導線の共通化、を上乗せすることで合意した。

色使いについては、「静かな道具」路線自体は変えず、Graph画面のノードカラーが「全属性ミュートすぎて地味・見づらい」という指摘を受けて刷新した。実機で候補を比較する過程で、ユーザーから「以前はcatppuccinとobsidianを組み合わせた配色だった」という経緯を聞き、独自に彩度調整した案ではなく**実際のCatppuccin Mocha（暗い背景向けの定番パレット）の値をそのまま使う**方針に切り替えた。

**実装**:
- **アクセントカラーパレットの刷新**: `frontend/src/index.css`の`--color-accent-*`9トークンを、値だけでなく名前もCatppuccinの色名（sky/peach/teal/yellow/sapphire/pink/lavender/mauve、recordのmossのみ据え置き）へリネームし、実際のCatppuccin Mochaの値に差し替えた。名前と値が一致しない状態（例: `accent-clay`が実際はteal系の色を持つ）を避けるため。参照元の`frontend/src/features/graph/utils/nodeVisuals.js`（クラス名・コメント）と`frontend/src/features/coffee-records/utils/originAccent.js`（Home画面の産地カラーバー用パレット）もあわせて更新した
- **共通の「戻る」導線**: 新規`frontend/src/components/BackLink.jsx`（`navigate(-1)`でブラウザ履歴を1つ戻る。複数の遷移元を持つページに対応するため、特定の遷移先を決め打ちしない）を、これまで戻る導線が無かった`EntityDetailPage.jsx`・`DiagnosisPage.jsx`に追加した（`RecordDetailPage.jsx`の既存Breadcrumbは遷移元が一覧に限定されるため変更していない）
- **Diagnosisのアーキタイプに色を割り当て**: 新規`frontend/src/features/diagnosis/utils/archetypeVisuals.js`で、8種類のarchetype.typeそれぞれにGraphと同じアクセントカラーを割り当てた（`ArchetypeCard.jsx`が参照）。診断はGraphの属性（roastLevel.order・flavors[].category）から導かれるため、色の語彙も共有し一貫性を持たせた
- **DiscoverCardの3行に別々の色**: Insight行は`text-accent-sapphire`、Discover行は既存の`text-success`のまま、Diagnosisリンク行は`text-accent-moss`（recordと同じ）にし、アイコン形状だけでなく色でも3行を区別できるようにした
- **レビュー指摘6件の修正**: Home/Records間で空状態ヒント文の有無が違っていた点を`RecordCard.jsx`に追加して統一、記録フォームの味覚グラフ（6軸）を縦一列から`sm:grid-cols-2`の2カラムへ圧縮、編集時「コーヒーの詳細」が既存データの有無に関わらず常に閉じていた問題を`values`から判定する遅延初期化へ変更、Record DetailのActionsセクションに区切り線を追加、GraphのフィルターpillsとGraphLegendが似すぎていた問題を小見出し（「表示するノード」「凡例」）の追加とLegend側の枠線除去で解消
- **アニメーション方針の見直し**: `frontend/src/hooks/useReveal.js`が、要素がマウント時点で既にビューポート内にあってもIntersectionObserverの非同期発火を待つため一瞬空白に見える問題を、`getBoundingClientRect()`による同期判定で「既に画面内にあれば即座に表示、画面外のものだけ監視する」方式に変更した。この一つの共通hookの修正で、Records一覧・ランキング行・関連記録・Insight一覧など、使用箇所すべての「初期表示なのに一瞬空白」が一括で直った

**変更ファイル**: `frontend/src/index.css`、`frontend/src/features/graph/utils/nodeVisuals.js`、`frontend/src/features/coffee-records/utils/originAccent.js`、`frontend/src/components/BackLink.jsx`（新規）、`frontend/src/pages/EntityDetailPage.jsx`、`frontend/src/pages/DiagnosisPage.jsx`、`frontend/src/features/diagnosis/utils/archetypeVisuals.js`（新規）、`frontend/src/features/diagnosis/components/ArchetypeCard.jsx`、`frontend/src/features/discover/components/DiscoverCard.jsx`、`frontend/src/features/coffee-records/components/RecordCard.jsx`・`RecordForm.jsx`、`frontend/src/pages/RecordDetailPage.jsx`、`frontend/src/features/graph/components/GraphFilters.jsx`・`GraphLegend.jsx`、`frontend/src/hooks/useReveal.js`、`frontend/src/i18n/locales/ja.json`・`en.json`（`common.back`・`graph.nodeTypeFilterHeading`・`graph.legendHeading`追加）。バックエンド変更なし。

**実行したテストと結果**:
- `cd frontend && npm run lint && npm run test && npm run build`: すべて成功（テスト件数に変更なし、58件は既存のまま。今回の変更は色・レイアウト・導線中心で新規ユニットテスト対象のロジックは無い）
- claude-in-chromeで実機確認（デモユーザー）: Graph画面リロード後にcanvasのノード色が新しいCatppuccin配色で表示されること、EntityDetail・Diagnosisどちらも「← 戻る」で直前のページ（Graph・Home）へ正しく戻ること、Home/RecordsどちらもDiscoverCardの3行・記録カードの空状態ヒントが一致すること、DiagnosisのarchetypeカラーがlightFruity→pinkのように正しく反映されること、記録フォームで味覚グラフが2カラムになり編集時は既存データがあれば最初から開いていること、RecordDetailのActionsに区切り線があること、Graphのフィルター行と凡例行に見出しが付き区別できること、Records一覧・Home記録カードが開いた瞬間から空白無く表示されること、全画面でコンソールエラーが出ないことを確認済み

**未解決事項**: 一部のトークン名は以前と対応するノード種別が変わっている（例: `accent-teal`は以前keyword用だったが今回farm用に、`accent-mauve`は新設でkeyword用）。今後この配色を前提にした新しいUIを追加する際は、色の意味（ノード種別との対応）を`nodeVisuals.js`で必ず確認してから使うこと。

**次に実装すべき最小単位**: 既存の未解決事項リスト（`dateFrom`/`dateTo`フィルターUI追加、フロントエンドのテスト拡充等）から選ぶ。

---

### 2026-08-27: Graph画面のノード検索

ユーザーから「ノードが多いと目当てのものを探しにくい」という指摘と、参考UI（PostCoffeeの「こだわりから選ぶ」）の提案を受けた。検討の結果、色をPostCoffee風のグラデーションに寄せる案は見送り（「静かな道具」路線を維持する既存方針、2026-08-27の直前エントリ参照）、検索して特定のノードへジャンプできるUIだけを追加する方針で合意した。

**実装**:
- 新規`frontend/src/features/graph/components/GraphNodeSearch.jsx`: `GraphPage`が既に取得済みの`graph.nodes`をクライアント側でラベル部分一致フィルタするだけの検索欄（新規APIは呼ばない。`docs/database.md`「グラフの二重管理を防ぐ」と同じ考え方で専用の検索インデックスは持たない）。対象はrecordノードを除く属性ノード（産地・農園・品種・精製方法・焙煎度・フレーバー・カフェ・キーワード）のみとした。recordノードのラベル（記録タイトル）はRecords画面の横断検索（`features/search`）が既にカバーしており、ここで解決したい「記録を重ねるほど増える属性ノードを見つけにくい」という課題とは対象が異なるため
- 結果は種別ごとにグルーピングし、`nodeVisuals.js`の既存アイコン・Catppuccinカラーをそのまま流用したチップで表示（新しい色は増やしていない）
- チップを選ぶと、そのノードを選択状態にするだけでなく、`GraphCanvas.jsx`にも波及: 新しい`focusRequest` propを追加し、選択のたびに新しいオブジェクト参照を渡すことで`useEffect`が発火し`fitCamera`を呼んでカメラをそのノード付近へパン/ズームする。既存のcanvasクリックによる選択（`handlePointerUp`）はカメラを動かさない既存の挙動のまま変更していない（`focusRequest`が無い経路のため）。収束後（自前のカメラ追従ループが終わったあと）でもクリック以外の経緯なら明示的にカメラを動かせるようにする狙い
- このアプリで初めての「浮くドロップダウン」UIだったため、外側クリック・Escapeキーで閉じる処理を自前で追加した（`document`への`pointerdown`リスナー。Records画面の横断検索は全幅パネル表示のためこの問題自体が無く、既存に参考実装が無かった）

**変更ファイル**: `frontend/src/features/graph/components/GraphNodeSearch.jsx`（新規）、`frontend/src/pages/GraphPage.jsx`、`frontend/src/features/graph/components/GraphCanvas.jsx`、`frontend/src/i18n/locales/ja.json`・`en.json`（`graph.nodeSearchPlaceholder`・`nodeSearchAriaLabel`・`nodeSearchNoResults`追加）。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（58 tests、既存のまま。新規ロジックはReactコンポーネント内のみで、追加した純粋関数は無い）すべて成功。claude-in-chromeで実機確認（デモユーザー）: 「kenya」「ethiopia」で産地チップが絞り込まれ選択できること、選択時にカメラが対象ノードへ実際にパン/ズームすること（Guatemala Antiguaへズームインした状態から検索でEthiopiaへジャンプし、画面中央に移動・選択されることを確認）、一致しない語で「見つかりません」の空状態が出ること、検索欄以外をクリックすると入力・候補が閉じること、を確認済み。全画面でコンソールエラー無し。

**未解決事項**: キーボードのみでの操作（矢印キーでの候補移動）は未対応、クリック/タップのみ。記録件数がさらに増え属性ノードが大量になった場合の候補一覧の見やすさ（現状は種別ごと最大8件で打ち切り）は未検証。

**次に実装すべき最小単位**: 既存の未解決事項リスト（`dateFrom`/`dateTo`フィルターUI追加等）から選ぶ。

**追記（同日）**: ユーザーから「検索したノードは枠線の強調だけでなく、関連ノードにもホバーと同じフォーカス表示（関連ノード以外を薄くする）をしてほしい」という指摘を受けた。`GraphCanvas.jsx`の非表示化ロジック（`isNodeDimmed`・`linkColor`）はそれまで`hoveredNodeId`しか見ておらず、選択（クリック・検索どちらも）は枠線のみで関連の強調が無かった。`hoveredNodeId ?? selectedNodeId`を`focusNodeId`としてまとめ、`isNodeDimmed`・`drawNode`・`linkColor`のすべてをこの1つの値で判定するよう変更した（ホバーが選択より優先される＝マウスを離せば選択中ノードの強調へ戻る）。これによりGraphNodeSearchでの選択だけでなく、canvas上のクリック選択でも同じ関連ノード強調が効くようになった（既存のホバー時の見た目は変更していない）。`cd frontend && npm run lint && npm run test && npm run build`すべて成功。claude-in-chromeで、検索で選んだKenyaの関連ノードだけが明るく残り無関係なノード・エッジが薄くなること、canvasクリックでの選択でも同様に効くことを確認済み。コンソールエラー無し。

---

### 2026-08-27: レイアウト見直し（Home）「今日のコーヒーを記録する」CTAの強調

ユーザーによるレイアウト全体の見直しシリーズの第一弾（Homeから着手）。「今日のコーヒーを記録する」CTAが`border-line/60`の枠線のみ・`text-text-tertiary`という目立たない配色だったため、まず他画面の主要ボタン（`primaryButtonClass`）と同じ`bg-inverse`/`text-on-inverse`の塗りつぶし反転スタイルへ変更した。

その後ユーザーから「そこだけ浮いて見える。枠線をノードで使用している色のグラデーションにしてはどうか」という再指摘を受けた。白一色の塗りつぶしは、他のカードがすべて暗い配色のHome画面の中で唯一の明るい要素になってしまい、確かに独立して浮いて見えていた。

**採用した案**: 背景は他のカードと同じ暗い色（`--color-surface-1`）に戻し、枠線だけをGraphのノードカラー全9色（`nodeVisuals.js`と同じ並び順: moss→sky→teal→yellow→sapphire→peach→pink→lavender→mauve）のグラデーションにした。実装前にclaude-in-chromeの`javascript_tool`でCSS（二重背景+`background-clip`トリック）を一時的に注入し、ユーザー自身のChromeで実物を見てもらってから確定した（コードへの反映は確認後）。単色反転より周囲と馴染みつつ、グラデーション枠線という他のどの要素とも違う特別感を出せる、かつ「記録がグラフのノードを増やす入り口である」ことを枠線の色で暗示できる、という判断。

**実装**:
- `frontend/src/index.css`に`@layer components`として新規`.home-cta-gradient-border`クラスを追加（単色の枠線はTailwindのユーティリティで足りるが、複数色のグラデーション枠線は「二重背景+`background-clip: padding-box, border-box`」というCSSのトリックが必要で、Tailwindのユーティリティだけでは表現できないため専用クラスにした）
- `frontend/src/pages/HomePage.jsx`のCTA（`Link to="/records/new"`）から`bg-inverse text-on-inverse hover:bg-inverse/90`を外し、`home-cta-gradient-border text-text hover:brightness-125`へ変更。角丸・サイズ分岐（repeat visitor/初回訪問）はそのまま維持

**変更ファイル**: `frontend/src/index.css`、`frontend/src/pages/HomePage.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run build`成功。claude-in-chromeで、実際のコード変更後にグラデーション枠線が一時プレビューと同じ見た目で表示されること、ホバーで明るくなること、コンソールエラーが無いことを確認済み。

**未解決事項**: 記録が0件の初回訪問時（`flex-col py-10`の大きいボックス版）でも同じグラデーションが期待通り見えるかは、実データを削除しての確認はしていない（クラスの適用ロジック自体はrepeat visitor/初回訪問で分岐しておらず共通のため、動作原理としては同じになるはず）。

**次に実装すべき最小単位**: レイアウト見直しの次の画面（ユーザーが順に指摘していく方針のため、次の指摘を待つ）。

**追記（同日）**: ユーザーから「ホバーしたらグラデーションが流れるようにしたい」という要望を受け、まず意見を聞かれたため回答した: 常時ループするシマーは「静かな道具」路線には広告的で合わないため、ホバー中だけ一度グラデーション位置が滑らかに移動し、ホバーを外すと逆再生で戻る一回性の動きを提案し、了承を得て実装した。

`home-cta-gradient-border`のグラデーション層（第2背景）の`background-size`を実際の要素幅より大きく（`250% 100%`）取り、`:hover`で`background-position`を`0%`→`100%`へ変える。`transition: background-position 500ms var(--ease-decel)`により、ホバーの間だけ色の並びが横へ滑らかに流れて見える（`@keyframes`による無限ループは使っていない）。他の装飾アニメーション（`LandingHero.module.css`等）と同じく`prefers-reduced-motion: reduce`ではtransitionを無効化する。あわせて、この動き自体がホバーの手がかりとして十分なため、`HomePage.jsx`側にあった`hover:brightness-125`（動きが無かった頃の暫定対応）は削除した。

**変更ファイル**: `frontend/src/index.css`、`frontend/src/pages/HomePage.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（58 tests、既存のまま）すべて成功。claude-in-chromeで、ホバー時にグラデーションの色の並びが左から右へ滑らかに流れること、ホバーを外すと元の位置へ戻ること、コンソールエラーが無いことを確認済み。

---

### 2026-08-27: レイアウト見直し（Records）カードへ産地アクセントを追加

レイアウト見直しシリーズの2件目。ユーザーから「Records一覧のカードに国名とアクセントが追加されていない」という指摘を受けた。確認したところ、Home画面の`HomeRecordCard.jsx`は産地名の横に産地ごとのアクセントカラーの縦バー（`originAccent.js`の`getOriginAccentClass`）を表示しているのに対し、Records一覧の`RecordCard.jsx`は産地を他の属性（精製方法・フレーバー）と同じ小さなタグ（MapPinアイコン＋テキスト）で下段にまとめて表示するだけで、アクセント表示が無く、Home側との見た目の一貫性が崩れていた。

**実装**: `RecordCard.jsx`のカード最上部（タイトル行より前）に、`HomeRecordCard.jsx`と同じ産地アクセントバー＋国名ラベルを追加した。既存の下段タグ列にあった産地タグ（MapPinアイコン）はここへ統合し、重複させないよう下段タグ列からは外した（精製方法・フレーバーのタグはそのまま残る）。産地への遷移機能を失わないよう、追加したアクセント表示自体もエンティティ詳細（`/entities/origin:xxx`）へのLinkにし、カード全体を覆う`absolute inset-0`のstretched link（記録詳細への遷移）より前面に出す必要があるため`relative`を付けた（このファイル冒頭のコメントで説明されている、tagが`relative`でstretched linkより前面に出る既存の仕組みと同じパターン）。

**変更ファイル**: `frontend/src/features/coffee-records/components/RecordCard.jsx`のみ。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（58 tests、既存のまま）すべて成功。claude-in-chromeで、Records一覧の各カードに産地ごとに異なる色のアクセントバー＋国名が表示されること、産地バッジのクリックがエンティティ詳細へ、カードの他の部分のクリックが記録詳細へ、それぞれ正しく遷移することを`elementFromPoint`とDOM要素への直接`.click()`で検証済み（自動化ツールのクリック座標とスクリーンショットのピクセル比率にずれがあり、見かけ上クリックが効かないように見えた箇所があったが、実際のDOM/React Routerの遷移ロジックは正しく動作することを確認した）。コンソールエラー無し。

**未解決事項**: 記録が0件（産地無し）のカードにはこれまで通りアクセント表示が出ない（意図通り）。

**次に実装すべき最小単位**: レイアウト見直しの次の画面（ユーザーが順に指摘していく方針のため、次の指摘を待つ）。

---

### 2026-08-27: レイアウト見直し（Record Detail）カード化・文字拡大・ノードカラーのアクセント追加

レイアウト見直しシリーズの3件目。ユーザーから「全体的に空白が多くて見せ方が下手、寂しい感じがする」「文字も小さく見づらい、アクセントなどを使用するべき」という指摘を受けた。

調査したところ、原因は主に3つだった: (1) 「コーヒーの詳細」「メモ」「味覚グラフ/つながり」の3セクションが薄い`divide-y`の区切り線だけで並んでおり、Records一覧等の他のカードと違って枠・背景・影を持たない素っ気ない見た目だった、(2) 味覚グラフ（`max-w-xs`=320px）・つながり図（`max-w-sm`=384px）が、横並びレイアウトの列の中で小さく中央に浮いており周囲の空白のほうが目立っていた、(3) 値・メモ・見出しがいずれも`text-sm`以下で、かつ色を一切使っていなかった。

**実装**:
- `RecordDetailPage.jsx`の3セクションを、`formStyles.js`の既存`cardClass`（Records一覧のカード等と同じ`rounded-2xl border border-surface-2 bg-raised p-4/5 shadow-elevated`）で囲むよう変更（`divide-y`の平置きをやめ、`flex flex-col gap-6`でカードを積む構成へ）
- Coffee Informationの各項目（産地・農園・品種・精製方法・焙煎度・フレーバー）に、新しい色を追加せずGraphの`nodeVisuals.js`（`getNodeVisual`）のアイコン・色をそのまま再利用して添えた（産地=Globe/sky、農園=Leaf/teal、品種=Sprout/yellow、精製方法=Droplets/sapphire、焙煎度=Flame/peach、フレーバー=Sparkles/pink）。`collectCoffeeDetails`のkeyから対応する知識グラフのノード種別へ変換する`DETAIL_NODE_TYPE`マップを新設。roasterNameは知識グラフのノード種別に該当しないため対象外（アイコン無しのまま）
- 値（dd）・メモ・セクション見出し（h2）のフォントサイズを`text-sm`→`text-base`へ拡大。Coffee Informationのグリッドも`sm:grid-cols-2`→`sm:grid-cols-2 lg:grid-cols-3`にして横方向をより使うようにした
- `TasteRadarChart.jsx`の最大幅を`max-w-xs`→`max-w-sm`、数値一覧の文字も`text-sm`→`text-base`へ拡大。`RecordConnectionsDiagram.jsx`の最大幅を`max-w-sm`→`max-w-md`へ拡大。どちらも図の内部の微小なラベル（軸ラベル・ノードラベル）はノード同士の衝突を避けるレイアウト計算に依存しているため、今回は対象外とした

**変更ファイル**: `frontend/src/pages/RecordDetailPage.jsx`、`frontend/src/features/coffee-records/components/TasteRadarChart.jsx`、`frontend/src/features/graph/components/RecordConnectionsDiagram.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（58 tests、既存のまま）すべて成功。claude-in-chromeで、Coffee Information・メモ・味覚グラフ/つながりの3セクションがカードとして表示されること、産地・農園・品種・精製方法・焙煎度・フレーバーの各項目に正しい色のアイコンが付くこと（`farmName`・`varieties`を含む記録で確認）、味覚グラフ・つながり図が拡大されカード内で余白が減っていること、コンソールエラーが無いことを確認済み。

**未解決事項**: 味覚グラフ・つながり図の内部ラベル（軸ラベル11px、ノードラベル10-11px）は今回拡大していない。ノード数が多い記録で読みづらいという指摘が今後出た場合は、レイアウト計算（`tasteRadarLayout.js`・`recordConnectionsLayout.js`）ごと見直す必要がある。

**次に実装すべき最小単位**: レイアウト見直しの次の画面（ユーザーが順に指摘していく方針のため、次の指摘を待つ）。

**追記（同日）**: 上記の直後、ユーザーから画像付きで「広い画面でコーヒーの詳細カードを見ると、3カラムグリッドが短い値でも均等に3分割してしまい、項目同士が不自然に離れて寂しい」という追加の指摘を受けた。`grid-cols-3`は列幅が内容量に関わらず常に均等になるため、値が短い項目ばかりだと余白ばかりが目立つ構造だった。

`flex flex-wrap`（各項目が内容量に応じた幅を持ち、詰めて並び、入りきらない分だけ折り返す）へ変更し、あわせて各項目のアイコンを12pxの添え字から、色付きの円形バッジ（`h-9 w-9 rounded-full`、15%不透明度の背景）へ格上げした。背景色は`nodeVisuals.js`のNODE_VISUALSに新設した`bgTintClass`（例: `bg-accent-sky/15`）を使う。`colorClass`から`.replace("text-","bg-")`で動的に生成しなかったのは、Tailwindのビルドがソースコード中に実際に書かれたクラス名の文字列だけを検出するため（実行時の文字列結合で作ったクラス名はスキャン対象にならずCSSが生成されない）。「コーヒーの詳細は同じカード内に収めた方がわかりやすい」という要望通り、複数カードへの分割はせず1枚のカード内でタイルを並べる構成を維持した。roasterName（知識グラフのノード種別に該当しない）は、中立色のバッジ（`bg-surface-2`+`text-text-tertiary`のStoreアイコン）にして、他の項目と同じタイルの見た目を保ちつつ色の主張は持たせないようにした。

**変更ファイル**: `frontend/src/features/graph/utils/nodeVisuals.js`（`bgTintClass`追加）、`frontend/src/pages/RecordDetailPage.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（58 tests、既存のまま）すべて成功。claude-in-chromeで、ウィンドウ幅2000pxでも項目が均等分割されず内容に応じた幅で詰めて並ぶこと、6項目（産地・農園・品種・精製方法・焙煎度・フレーバー）でも自然に折り返すこと、各アイコンバッジの色がGraphのノード色と一致することを確認済み。コンソールエラー無し。

---

### 2026-08-27: マスターデータに品種「Red Bourbon」・フレーバー「Cherry」を追加

ユーザーから「記録フォームの品種にRed Bourbonが無い、フレーバーにCherryが無い。候補を増やしてほしい」という指摘を受けた。

産地・品種・精製方法・フレーバーはマスターデータとして一括管理しており（`docs/domain-model.md`「Master Entities」）、`backend/seeds/data/varieties.js`・`flavors.js`に候補を追加したうえで、`backend/seeds/seedMasterData.js`（名前を一意キーにupsertする冪等な処理。既存データには触れない）経由で実際のMongoDBへ反映する必要がある。

**実装**:
- `backend/seeds/data/varieties.js`に`{ name: "Red Bourbon" }`を追加（既存の`Bourbon`・`Pink Bourbon`と並ぶ、実在するBourbon系の色変異種の1つ）
- `backend/seeds/data/flavors.js`に`{ name: "Cherry", category: "fruity" }`を追加（`Berry`・`Stone Fruit`と同じ果実系グループ）
- Docker Compose環境の稼働中コンテナで`npm run seed`を実行し、実際のMongoDBへ反映（`docker exec coffee-app-backend npm run seed`）。upsertが冪等なため、既存の20種の産地・11種の精製方法・5段階の焙煎度には触れず、品種は16→17件、フレーバーは30→31件に増えた

**変更ファイル**: `backend/seeds/data/varieties.js`、`backend/seeds/data/flavors.js`。フロントエンド変更なし（マスターデータAPIから動的に選択肢を取得する既存の仕組みがそのまま新しい候補を反映する）。

**実行したテストと結果**: `cd backend && npm test`（27 suites / 416 tests、既存のまま）すべて成功。Docker Compose環境で`npm run seed`を実行し、追加件数（品種+1・フレーバー+1）を確認。claude-in-chromeで記録フォーム（`/records/new`）の「コーヒーの詳細」を開き、品種の選択肢に"Red Bourbon"、フレーバーの選択肢に"Cherry"が実際に選べる状態で表示されることを確認済み。コンソールエラー無し。

**未解決事項**: 本番環境（Render）のMongoDBには今回のseedを反映していない（ローカルのDocker Compose環境のみ）。デプロイ時に`npm run seed`を実行する必要がある。

**次に実装すべき最小単位**: レイアウト見直しの次の画面（ユーザーが順に指摘していく方針のため、次の指摘を待つ）。

**追記（同日）**: ユーザーから「この際、予想されるフレーバーを追加してほしい」という追加の依頼を受けた。既存の分類（fruity/sweet/nutty/floral/spicy/other）に沿って、一般的でよく見かけるが抜けていたフレーバー語を11件追加した: Peach・Mango・Raisin（fruity）、Milk Chocolate・Maple Syrup（sweet）、Walnut・Peanut（nutty）、Rose（floral）、Clove（spicy）、Malty・Tobacco（other）。`docs/vision.md`の「専門的すぎる語は入れない」方針に沿い、SCAフレーバーホイールの化学的・専門的な語（例: 特定の酸の名称）は避け、コーヒーのタスティングノートで一般的に見る平易な語に絞った。

`backend/seeds/data/flavors.js`のみ変更。`cd backend && npm test`（27 suites / 416 tests）成功後、`docker exec coffee-app-backend npm run seed`で反映（フレーバー31→42件、既存31件は変更無し）。claude-in-chromeで記録フォームの選択肢に11件すべてが表示・選択できることを確認済み。コンソールエラー無し。

---

### 2026-08-27: Statsページのランキングで同率順位を正しく表示する

レイアウト見直しシリーズに戻り、ユーザーから画像付きで「ランキングの同率が適用されていない」という指摘を受けた。フレーバーのBerry/Floral/Citrusがすべて4件で並んでいるのに、1位・2位・3位と別順位で表示されていた（`TopRankingList.jsx`が`rank={index + 1}`という配列の位置だけを見た連番を振っていたため、同数のcountでも常に別順位になっていた）。

**実装**: 新規`frontend/src/features/stats/utils/rankings.js`に、同率順位（1224形式の競技ランキング。例: count `[4,4,4,3,2]` → 順位 `[1,1,1,4,5]`）を計算する純粋関数`computeRanks`を追加した。backendの`topN`（`statsBuilder.js`）がcountの降順で返す前提に乗り、直前の項目とcountが同じなら同じ順位を、異なればその時点のインデックス+1を新しい順位にする。`TopRankingList.jsx`はこの関数の結果を`rank`として使うだけに変更した。DB/HTTP非依存の純粋関数のため、`features/graph/utils/`と同じ方針でユニットテスト（`rankings.test.js`、同率無し・同率あり・複数箇所で同率・要素1件・空配列の5ケース）を新規追加した。

**変更ファイル**: `frontend/src/features/stats/utils/rankings.js`（新規）、`frontend/src/features/stats/utils/rankings.test.js`（新規）、`frontend/src/features/stats/components/TopRankingList.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（63 tests、新規5件を含む）すべて成功。claude-in-chromeでStats画面を確認し、品種（SL28・Heirloomが1位タイ→Geisha・Bourbon・Pink Bourbonが3位タイ）、フレーバー（Berry・Floral・Citrusが1位タイ→Nuttyが4位→Honeyが5位）、カフェ（3件とも1件ずつで全て1位タイ）のいずれも正しい同率順位で表示されることを確認済み。コンソールエラー無し。

**次に実装すべき最小単位**: レイアウト見直しの次の画面（ユーザーが順に指摘していく方針のため、次の指摘を待つ）。

---

### 2026-08-28: World Map機能の新規追加（産地フォーカス機能群の第一歩）

ユーザーから「地図ページを増やしたい」という相談を受けた。動機は「コーヒーは産地によってキャラクターが変わると言ってよいほどなので、産地にフォーカスした機能を追加したい」というもので、MVPは既に完了しているという認識のもと、Post-MVPの新しい方向性の第一歩として位置づけた。

`docs/mvp.md`は「世界地図」をMVP当時のOut of Scopeとして明示していたが、これはMVP完了により恒久的な制約ではなくなったと判断し、`docs/mvp.md`冒頭に「MVPは完了済み。Post-MVPはdocs/features.md・IMPLEMENTATION.mdを参照。Out of Scopeは恒久的な禁止事項ではない」という注記を追加した（削除はせず、`docs/mlb-legacy-inventory.md`と同じくhistoricalな記録として保持する方針。ユーザーと相談の上決定）。

過去にDiscover機能で似た経緯（産地の提案を横断的に見せる専用ページを作ったが専用ページ固有の価値が薄く削除した）があったことを踏まえ、今回は「自分が記録した産地を世界地図上でハイライトする」という単一の目的に絞り、Discover・Graphとは役割を重複させないようにした。またナビ項目を増やさない既存方針（Diagnosisと同じ扱い）を踏襲し、`/map`はStatsページの「Collection」セクションからのリンクでのみ到達する。

**技術選定の経緯**: `backend/models/Origin.js`の`countryCode`（ISO 3166-1 alpha-2）フィールドには「将来の地図表示のために入れてある」というコメントが既に存在し、地図に必要なデータの一部は用意されていた。国境の形状データについては、他のグラフ・図が自前SVGで描いている中で唯一の例外として`react-simple-maps`を検討したが、React 16-18のみをpeer dependencyとして宣言しており（最終更新2023-07-01のbeta版でも同様）、このアプリのReact 19.2とバージョン競合が発生し導入できなかった。ユーザーと相談し、Reactに依存しない`d3-geo`＋`topojson-client`（+ 地図データの`world-atlas`）を採用した。「なるべく綺麗に見えるものが良い」という要望を受け、投影法はNatural Earth（`geoNaturalEarth1`、d3-geo本体に標準搭載で追加パッケージ不要。世界全体を歪み少なく見せる定番の投影法）を採用し、地図データもより精細な50m解像度（`countries-50m.json`）を選んだ。

**実装**:
- **backend**: `coffeeRecordSerializer.js`の`serializeRef`を拡張し、populate済みオブジェクトが`countryCode`を持つ場合（＝Originのときだけ）はAPI応答へ含めるようにした。`graphBuilder.js`のoriginノード生成に`countryCode: record.origin.countryCode ?? null`を追加。新しいAPIエンドポイントは作らず、既存の`GET /api/graph?nodeTypes=origin`をそのまま使う
- **重大なバグとその修正**: 上記だけでは`countryCode`が常に`null`になる不具合が発生した。原因は`backend/repositories/coffeeRecordRepository.js`の`.populate("originId", "name")`が`name`しか取得しておらず、`countryCode`フィールド自体がDBから取得されていなかったこと。`.populate("originId", "name countryCode")`へ修正して解消した（既存テスト`coffeeRecordApi.test.js`の期待値も`countryCode: "ET"`を含む形へ更新）
- **frontend**: 新規`frontend/src/features/map/utils/countryCodes.js`（ISO alpha-2→numeric-3の対応表。world-atlasの実データと照合して作成、origins.js全20件を検証済み）、`visitedOrigins.js`（グラフのoriginノードから`Map<numericId, {...}>`を作る純粋関数、ユニットテスト付き）、`components/WorldMap.jsx`（d3-geo + topojson-clientでSVG描画。訪問済みは`accent-sky`で塗り、クリック・キーボード操作でエンティティ詳細へ遷移。ホバーで国名・件数のツールチップ）、`components/WorldMapLegend.jsx`、`pages/WorldMapPage.jsx`（`useGraph`を`nodeTypes: ["origin"]`で呼ぶだけ、専用フックは作らない）を追加。`App.jsx`に`/map`を保護ルートとして追加（GraphPageと同じ理由でlazy import。world-atlasの地図データが約740KBあるため）。`StatsPage.jsx`のCollectionセクション見出し横に「世界地図で見る」リンクを追加
- **実機で見つけた追加のバグ**: `world-atlas`のtopojsonは一部の国（オーストラリア等）が同じidで複数のfeatureに分かれており、`country.id`をReactのkeyやhover状態の識別に使うと「keyの重複」警告と「間違った国のツールチップが出る」不具合が発生した。keyとhover状態の識別は配列のindexに変更し、産地との突き合わせ（`visitedByNumericId.get(country.id)`）だけはcountry.id（ISO数値コード）を使うよう修正した

**変更ファイル**: `docs/mvp.md`、`docs/design.md`、`docs/features.md`、`backend/services/coffee/coffeeRecordSerializer.js`、`backend/core/graph/graphBuilder.js`、`backend/repositories/coffeeRecordRepository.js`、`backend/tests/graphBuilder.test.js`、`backend/tests/coffeeRecordApi.test.js`、`frontend/package.json`（`d3-geo`・`topojson-client`・`world-atlas`を追加）、`frontend/src/features/map/`配下（新規4ファイル+テスト）、`frontend/src/pages/WorldMapPage.jsx`（新規）、`frontend/src/App.jsx`、`frontend/src/pages/StatsPage.jsx`、`frontend/src/i18n/locales/ja.json`・`en.json`。

**実行したテストと結果**: `cd backend && npm test`（27 suites / 418 tests、新規2件を含む）すべて成功。`cd frontend && npm run lint && npm run test && npm run build`（7 test files / 68 tests、新規5件を含む）すべて成功。Docker Compose環境で`docker exec coffee-app-backend npm install`・`docker exec coffee-app-frontend npm install`＋両コンテナ再起動後、claude-in-chromeで実機確認: `/stats`から「世界地図で見る」で`/map`へ遷移、記録済みの産地（Ethiopia/Rwanda/Kenya/Guatemala/Costa Rica/Panama/Colombia/Brazil等）が正しくハイライトされること、ホバーでのツールチップ（国名・件数）、ハイライトされた国のクリックでエンティティ詳細へ正しく遷移すること、記録が無い場合の空状態、BackLinkでの復帰、コンソールエラーが無いことを確認済み。

**未解決事項**:
- `WorldMapPage`のバンドルサイズは254KB（gzip、lazy chunk）とやや大きい（世界地図データ`world-atlas`の50m解像度データが主要因）。常設ナビに無くStatsからのリンクでのみ開かれるページのため初期表示には影響しないが、より軽い110m解像度への切り替えも選択肢として残っている
- `countryCodes.js`のISO対応表は、現在`backend/seeds/data/origins.js`にある20か国のみ検証済み。将来origins.jsへ新しい産地を追加する場合は、この対応表にもISO数値コードを追加する必要がある（追加し忘れてもエラーにはならず、その産地が地図上でハイライトされないだけ）
- 本番環境（Render）のMongoDBには`countryCode`を含むpopulateの変更を反映済みだが、実際のデプロイ・動作確認はまだ行っていない

**追記（同日）**: ユーザーから「国のラベルカラーを地図にも適用したい」という要望を受けた。それまで訪問済みの国はすべて単一色（`accent-sky`）で塗っていたが、Records一覧・Home画面のカードが既に使っている産地ごとのアクセントカラー（`originAccent.js`、産地名からのハッシュで7色に振り分ける）を地図の塗り色にも流用し、同じ産地なら常にカードと地図で同じ色になるようにした。

`originAccent.js`に`getOriginFillClass`を追加した。既存の`getOriginAccentClass`（`bg-*`クラスを返す）と同じハッシュ→インデックス計算を共有しつつ、SVGの`fill`用に`fill-*`クラスの並行配列を別途持たせている（`` `fill-${name}` ``のような動的な文字列結合ではTailwindのビルドがクラス名を検出できずCSSが生成されないため、bg版・fill版とも完全なクラス名を配列に直接書いている。2026-08、`bgTintClass`を追加したときと同じ理由）。`WorldMap.jsx`の訪問済み国の塗り色を`getOriginFillClass(visited.label)`に変更し、ホバー時のフィードバックは産地ごとに色が異なり単純な透明度変更が使えなくなったため、色に依存しないstrokeWidthの変化のみにした。`WorldMapLegend.jsx`の「訪れた産地」の見本も、単色スウォッチから3色の点（産地ごとに色が違うことを示す）へ変更した。

**変更ファイル**: `frontend/src/features/coffee-records/utils/originAccent.js`、`frontend/src/features/map/components/WorldMap.jsx`、`frontend/src/features/map/components/WorldMapLegend.jsx`、`frontend/src/i18n/locales/ja.json`・`en.json`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、地図上の各国が産地ごとに異なる色で塗られること、同じ産地（Ethiopia等）がRecords一覧のカードと地図とで同じ色（`fill-accent-teal`/`bg-accent-teal`）になることをDOMのクラス名を突き合わせて確認済み。コンソールエラー無し。

**次に実装すべき最小単位**: 産地フォーカス機能群の次の一手（ユーザーの構想を待つ）。または既存の未解決事項リストから選ぶ。

**追記（同日）**: World Mapへの導線が「Statsページの小さなテキストリンク1箇所」しか無く弱いという指摘を受けた。ナビ項目を5つに増やす案も検討したが、Diagnosisも同じ理由（`docs/design.md`「ナビ項目は4つと少なく保つ方針」）で常設ナビに入れていない既存の一貫性を優先し、以下の2箇所を追加する案を採用した。

- **Home画面のDiscoverCard**: Diagnosisと同じ形（アイコン+テキストの静的リンク）で「世界地図を見る」を4行目として追加した。色はGraphのoriginノードと同じ`accent-sky`
- **EntityDetailページ**: 産地タイプのノードを見ているときだけ、既存の「グラフで見る」ボタンの隣に「地図で見る」ボタンを追加した（`detail.type === "origin"`で出し分け）。地図側にその国だけへズームする仕組みは無く、地図全体を開くだけ（Graphの`?focus=`のような絞り込みは今回のスコープ外）

**変更ファイル**: `frontend/src/features/discover/components/DiscoverCard.jsx`、`frontend/src/pages/EntityDetailPage.jsx`、`frontend/src/i18n/locales/ja.json`・`en.json`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、Home画面のDiscoverCardから「世界地図を見る」で`/map`へ遷移すること、産地（Ethiopia）のEntityDetailページに「地図で見る」ボタンが表示されクリックで`/map`へ遷移すること、産地以外（フレーバー）のEntityDetailページには「地図で見る」が出ないことを確認済み。コンソールエラー無し。

**追記（同日）**: ユーザーから「records/配下の詳細ページ（RecordDetailPage）にもリンクを貼るべき」という指摘を受けた。EntityDetailページと同じ考え方で、「つながり」セクション見出しの既存「グラフで見る」リンクの隣に、産地がある記録のときだけ（`record.origin`の有無で判定）「地図で見る」リンクを追加した（`common.viewOnMap`、Globeアイコン）。産地が無い記録（そもそも「つながり」セクション自体が非表示になる場合を含む）には出さない。

**変更ファイル**: `frontend/src/pages/RecordDetailPage.jsx`、`frontend/src/i18n/locales/ja.json`・`en.json`（`common.viewOnMap`追加）。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、産地がある記録（Rwanda Huye Mountain）の「つながり」セクションに「グラフで見る」「地図で見る」が並んで表示され、クリックで`/map`へ正しく遷移すること、産地・属性が無い記録（とりあえず買った豆）では「つながり」セクション自体が表示されないため問題無いことを確認済み。コンソールエラー無し。

---

### 2026-08-28: Statsページのカードにアイコンバッジを追加し空白を解消

ユーザーから画像付きで「Statsページのカードの空白が気になる」という指摘を受けた。「記録のペース」（記録数・平均評価・記録を始めてから）と「Collection」（産地・品種・精製方法・農園・カフェ・フレーバーの種類数）のカードが、ラベルと数値だけの内容量に対してgridで幅いっぱいに広がるため、RecordDetailPage.jsxのCoffee Detailsタイルで対処したのと同じ「大きな箱に小さな中身」の余白問題が起きていた。

**実装**: `StatCard.jsx`にオプションの`icon`/`iconColorClass`/`iconBgClass` propを追加し、色付きの円形アイコンバッジを添えられるようにした（RecordDetailPage.jsxのタイルと同じ意匠）。新しい色は増やさず、`CollectionStats.jsx`の6種別（産地・品種・精製方法・農園・カフェ・フレーバー）はGraphの`nodeVisuals.js`（origin/variety/process/farm/cafe/flavor）とちょうど1対1で対応するためそのまま再利用した。`OverviewStats.jsx`は記録数を`nodeVisuals.js`のrecord（accent-moss）、平均評価を他画面と同じ`warn`色のStarアイコン、記録を始めてからの日数はどのノード種別にも該当しないため中立色（`text-text-tertiary`/`bg-surface-2`）のCalendarアイコンにした。数値の文字サイズも`text-lg`→`text-xl`へ拡大した。

**変更ファイル**: `frontend/src/features/stats/components/StatCard.jsx`、`frontend/src/features/stats/components/CollectionStats.jsx`、`frontend/src/features/stats/components/OverviewStats.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、記録のペース3枚・Collection6枚のカードすべてに正しい色のアイコンバッジが表示され、空白が目立たなくなったことを確認済み。コンソールエラー無し。

**次に実装すべき最小単位**: Statsページの「月ごとの記録数」チャートカードも、グラフ部分の右側に余白が目立つため同様の見直し候補（今回は指摘の対象外だったため未対応）。または既存の未解決事項リストから選ぶ。

**追記（同日）**: 画像付きで「アイコンバッジを追加しても、広い画面ではまだ余白が気になる。カードを中央寄せにする、またはカード自体を小さくする、のどちらが良いか」と意見を求められた。中央寄せは余白の量自体を変えず配置を変えるだけで、広い画面ではむしろ「大きな箱の中央に小さな塊」という間延びした見え方になりかねないと判断し、カード自体を内容に応じた幅に縮める方針を提案し、了承を得て実装した。

`StatCard.jsx`に`min-w-44`を追加し、`OverviewStats.jsx`・`CollectionStats.jsx`の`grid grid-cols-2 sm:grid-cols-3`（均等割り）を`flex flex-wrap`へ変更した。均等gridは列幅がコンテナ幅÷列数で決まるため、短い内容（ラベル+数値+アイコン程度）でも常に幅いっぱいに引き伸ばされ余白が生まれる構造だった。`flex-wrap`なら各カードが中身の分だけ幅を取り、収まらない分だけ次の行へ折り返す（RecordDetailPage.jsxのCoffee Detailsタイルと同じ解決）。

**変更ファイル**: `frontend/src/features/stats/components/StatCard.jsx`、`frontend/src/features/stats/components/OverviewStats.jsx`、`frontend/src/features/stats/components/CollectionStats.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeでウィンドウ幅2000px相当でも確認し、「記録のペース」3枚・「Collection」6枚のカードがそれぞれ内容に応じた幅になり余白が目立たなくなること、Collectionは1行に収まる枚数が画面幅に応じて自然に変わる（4枚+2枚など）ことを確認済み。コンソールエラー無し。

---

### 2026-08-28: EntityDetailページの統計カードにもStatCardを共有適用

画像付きで「entitiesページが少し寂しい」という指摘を受けた。EntityDetailPage.jsxの3枚の統計カード（Records・Average rating・Last had）は、Statsページを直す前と同じ「ラベルと数値だけの`grid-cols-3`カード」で、同じ余白の問題を抱えていた（このページはこのページ専用のローカルな`StatCard`関数を持っており、Statsページの`StatCard.jsx`とは別実装だった）。

**実装**: 重複を解消するため、`features/stats/components/StatCard.jsx`を`frontend/src/components/StatCard.jsx`（複数機能で共有するUI、CLAUDE.mdのcomponents/の定義通り）へ昇格させた。`OverviewStats.jsx`・`CollectionStats.jsx`のimportを更新し、EntityDetailPage.jsxはページローカルの`StatCard`を削除してこの共有コンポーネントを使うよう変更、`grid grid-cols-3`も`flex flex-wrap`へ変更した。アイコンは、Recordsカードはそのエンティティ自身のノード種別アイコン・色（`visual`。例: Flavorなら`accent-pink`のSparkles、Originなら`accent-sky`のGlobe）を再利用し、Average ratingとLast hadはStatsページのOverviewStats.jsxと同じ配色（Star/warn、Calendar/中立色）にした。ローディング中の骨格（`EntityDetailSkeleton`）もこの新しいカード形状に合わせて更新した。

**変更ファイル**: `frontend/src/components/StatCard.jsx`（新規、features/stats/から移動）、`frontend/src/features/stats/components/OverviewStats.jsx`、`frontend/src/features/stats/components/CollectionStats.jsx`、`frontend/src/pages/EntityDetailPage.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、Flavor（Honey）・Origin（Rwanda）どちらのエンティティ詳細ページでも、Recordsカードのアイコン・色がそのエンティティ種別と一致すること（Flavorはpink、Originはsky）、カードが内容に応じた幅になり余白が目立たなくなること、「View in Graph」「View on Map」ボタンが引き続き正しく機能することを確認済み。コンソールエラー無し。

---

### 2026-08-28: EntityDetailページ「Related in the graph」チップの視認性を強化

ユーザーから「Related in the graphも小さくて見づらい。このアプリ目玉のGraph機能に繋がる部分なので、目立たせる価値がある」という指摘を受けた。以前は各グループ見出し（Origin/Variety/Process等）がテキストのみで、チップ自体も無彩色・小さめの文字だったため、Graph機能への導線としての重みが弱かった。

案A（アイコン+色のチップ。GraphFilters.jsxのノード種別ボタンと同じ視覚言語を再利用する低リスク案）と案B（record中心のミニhub-spokeグラフ図を埋め込む高インパクト・高リスク案）を提示し、まず案Aから進めることで合意を得た。

**実装**: `RelatedAttributeGroup`の各グループ見出しに、`getNodeVisual(type)`から取得したアイコンと色（Graphのノード種別と同じ配色。例: Origin=sky Globe、Variety=yellow Sprout、Process=sapphire Droplets、Roast Level=peach Flame、Keyword=mauve Quote）を追加した。チップ自体もRecordCard.jsxのタグと同じホバー時の浮き上がり（`hover:-translate-y-px hover:border-line/60`）と文字・パディングの拡大（`text-xs`→`text-sm`、`px-3 py-1`→`px-3.5 py-1.5`）を加え、新しい色を増やさずGraphの凡例・フィルターとの一貫性を保った。セクション見出し（h2）も`text-sm`→`text-base`に拡大。`EntityDetailSkeleton`のチップ骨格も新サイズに合わせて更新した。

**変更ファイル**: `frontend/src/pages/EntityDetailPage.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeでFlavor（Honey）のエンティティ詳細ページを確認し、Origin/Variety/Processいずれのグループ見出しにも正しい色のアイコンが表示され、チップが拡大されていることを確認済み。コンソールエラー無し。

**未解決事項**: 案B（ミニグラフ図での可視化）は今回見送った。将来、チップだけでは「グラフっぽさ」が伝わりにくいという評価であれば再検討する。

---

### 2026-08-28: EntityDetailページを`cardClass`で統一（RecordDetailページと同じカード化）

ユーザーから「entitiesページはカード化しないのには何か理由はあるか」という指摘を受けた。確認したところ、`RecordDetailPage.jsx`は2026-08-27に各セクション（Coffee Details・Notes・味覚グラフ/Connections）を`cardClass`（枠線+背景+影のカード、`formStyles.js`）で囲む変更を受けていたが、`EntityDetailPage.jsx`はその対象外のままだった。統計カード（StatCard）自体は個別にカード化されていたため、ページ全体で見ると"Related in the graph"・"Related records"のセクションだけが背景に浮いた状態で一貫性が崩れていた。設計上の意図的な差ではなく、単純な対応漏れだったため、統一する方針で合意した。

**実装**: `EntityDetailPage.jsx`に`cardClass`を再importし（EntityDetailPage StatCard共有化の際に未使用として一度削除していた）、"Related in the graph"セクションと"Related records"セクションをそれぞれ`cardClass`で囲んだ。見出し（h2）の直後に`mt-5`/`mt-4`の余白を置く構成もRecordDetailPage.jsxの`cardClass`セクションと揃えた。`EntityDetailSkeleton`の骨格も同じ2枚のカード構成に更新した。

**変更ファイル**: `frontend/src/pages/EntityDetailPage.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeでFlavor（Honey）のエンティティ詳細ページを確認し、"Related in the graph"・"Related records"がRecordDetailPageの各セクションと同じカード意匠（角丸・枠線・背景・影）になったこと、コンソールエラーが無いことを確認済み。

---

### 2026-08-28: World Mapページにサマリー数値と訪れた産地一覧を追加

ユーザーから画像付きで「地図しか表示されておらず寂しい印象。何か追加で表示するなら何が良いか」という相談を受けた。Discover（産地提案）とは役割を重複させない方針（docs/features.md「World Map」参照）を踏まえ、(A)訪れた産地数のサマリー、(B)訪れた産地の一覧、(C)大陸別の内訳の3案を提示し、実装コストが低くDiscover/Statsと役割が重複しないA+Bで合意した（Cは新しい集計軸が増えStatsの産地ランキングと役割が近くなるため見送り）。

**実装**: `WorldMapPage.jsx`に、地図の上へStatCard（例:「7 / 20」。分子は`visitedByNumericId.size`、分母はマスターデータの産地総数）を追加した。分母の取得は記録フォームの選択肢取得と同じ`useMasterData`フックを再利用し、読み込み中・失敗時は分母を省き訪問数だけを表示する（`useMasterData.js`の「失敗しても致命的ではない」方針を踏襲。地図本体の表示はブロックしない）。地図の下には、訪れた産地を記録数順に並べたチップ一覧（EntityDetailPage.jsxの`RelatedAttributeGroup`と同じチップスタイル、エンティティ詳細ページへのLink付き）を`cardClass`のセクションとして追加した。

**変更ファイル**: `frontend/src/pages/WorldMapPage.jsx`、`frontend/src/i18n/locales/ja.json`・`en.json`（`map.visitedStat`・`map.visitedOriginsHeading`を追加）、`docs/features.md`（World Mapの表示節を更新）。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで`/map`を確認し、サマリーが「7 / 20」と正しく表示されること、一覧がEthiopia(4)→Kenya(3)→...の記録数順に並ぶこと、チップをクリックするとそのエンティティ詳細ページへ正しく遷移すること、コンソールエラーが無いことを確認済み。

**追記（同日）**: 「visited originsも色分けして」という指摘を受け、一覧の各チップに、地図の塗り色と同じ`getOriginAccentClass`（産地名からのハッシュで決まる固定パレット、`originAccent.js`）の小さな点を追加した。地図の塗り色は`getOriginFillClass`（同じハッシュ・同じパレットのfill版）を使っているため、同じ産地なら地図とチップで常に同じ色になる。地図上で見た色を手がかりに一覧から該当の産地を探せるようにする狙い。

**変更ファイル**: `frontend/src/pages/WorldMapPage.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで`/map`を確認し、地図上の各国の色と一覧の対応する産地チップの点の色が一致すること（例: Kenyaのteal、Rwandaのlavender）、コンソールエラーが無いことを確認済み。

---

### 2026-08-28: Statsページの3セクションを`cardClass`で統一（rankingのカード化漏れの解消）

ユーザーから「statsページのrankingはカード化しないのはなぜか」という指摘を受けた。確認したところ、`StatsPage.jsx`の3セクション（記録のペース／Collection／味の傾向。rankingは3つ目に含まれる）は`divide-y divide-surface-2`の区切り線だけで並べる古いパターンのままだった。ファイル内のコメントには「RecordDetailPageのdivide-yと同じ思想」と書かれていたが、これは2026-08-27にRecordDetailPage.jsxが`cardClass`へ移行する前の記述が更新されずに残っていたもので、EntityDetailPage.jsx（本日`cardClass`統一済み）と同様の移行漏れだった。

**実装**: `StatsPage.jsx`の3セクションを`RecordDetailPage.jsx`・`EntityDetailPage.jsx`と同じ`cardClass`へ変更し、外側の`divide-y divide-surface-2`コンテナを`flex flex-col gap-6`に変更した。見出し（h2）も他の`cardClass`セクションと合わせて`text-sm`→`text-base`に統一した。`StatsSkeleton.jsx`の骨格も同じ3枚のカード構成に更新した。ファイル内の古い（divide-y前提の）コメントも現状に合わせて更新した。

**変更ファイル**: `frontend/src/pages/StatsPage.jsx`、`frontend/src/features/stats/components/StatsSkeleton.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで`/stats`を確認し、「Your pace」「Collection」「Taste tendencies」の3セクションすべてがRecordDetail/EntityDetailと同じカード意匠になったこと、rankingを含む各要素が正しく表示されること、コンソールエラーが無いことを確認済み。

**追記（同日）**: 上記のcardClass化に伴い、「Your paceのグラフカード（Records per month）には影が無いのに、Taste tendenciesのグラフカード（Rating distribution）には影がある。統一感が無く、影は無い方が自然」という指摘を受けた。原因は、`MonthlyTrendChart.jsx`（`rounded-xl border border-surface-2 bg-raised p-4`、影無し）と`RatingDistributionChart.jsx`（`rounded-2xl ... shadow-elevated`、影あり）が、どちらも同じ`cardClass`カードの中にネストされる「カードの中のカード」でありながら別々のスタイルで実装されていたこと。`RatingDistributionChart.jsx`を`MonthlyTrendChart.jsx`と同じ影無し・`rounded-xl`のスタイルに統一した（`shadow-elevated`は最上位のカード用と位置づけ、ネストされた内側のカードには使わない）。

**変更ファイル**: `frontend/src/features/stats/components/RatingDistributionChart.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで`/stats`の「Taste tendencies」を確認し、「Rating distribution」の影が消え「Records per month」と同じ見た目になったこと、コンソールエラーが無いことを確認済み。

**追記（同日）**: 「flavorカードには引き続き影がある。意図的か、消すべきだと思う」という指摘を受けた。原因は同じ問題の別箇所で、`CollectionStats.jsx`の6枚（Flavorを含む産地・品種・精製方法・農園・カフェ）と`OverviewStats.jsx`の3枚のStatCardは、StatsPageの3セクションを`cardClass`化したことで「cardClassの中のStatCard」というネスト構造になっていたが、共有の`StatCard.jsx`は常に`shadow-elevated`を付けたままだった。

**実装**: `StatCard.jsx`に`flat`prop（デフォルトfalse）を追加し、trueのときは`shadow-elevated`を付けないようにした。`OverviewStats.jsx`・`CollectionStats.jsx`の全StatCardに`flat`を指定した。`EntityDetailPage.jsx`・`WorldMapPage.jsx`のStatCardは他のcardClassにネストされていない最上位のカード（ページ背景に直接置かれる）のため、`flat`は指定せず影付きのままにした。

**変更ファイル**: `frontend/src/components/StatCard.jsx`、`frontend/src/features/stats/components/OverviewStats.jsx`、`frontend/src/features/stats/components/CollectionStats.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで`/stats`の「Your pace」「Collection」（Flavorsを含む全カード）の影が消えたこと、`/entities/flavor:...`（EntityDetailページ）のStatCardは引き続き影を保持していること、コンソールエラーが無いことを確認済み。

---

### 2026-08-29: アプリ全体の問題点の洗い出し（監査のみ、修正は未実施）

ユーザーから「このアプリの問題点を洗い出してください」という依頼を受けた。IMPLEMENTATION.mdの「未解決事項」に既に記録済みの項目とは別に、backend/frontendそれぞれ独立したフォークエージェントによる新規監査を実施した。今回は調査のみで、コードの変更は一切行っていない。

**Backend新規発見**（いずれも軽微〜中程度、構造的な欠陥ではない）:
- `coffeeRecordQueryValidator.js`: `SORT_OPTIONS`が素のオブジェクトリテラルのため`?sort=__proto__`が検証をすり抜ける（`Object.hasOwn`または`Object.create(null)`で修正可能）
- `PATCH /api/users/me/password`にレート制限が無い（`/auth/login`等にはある）。有効なJWTがあれば現在のパスワードを無制限に試行できる
- `searchController.js`: `req.query.q`が配列になるケース（`?q=a&q=b`）を想定しておらず、`buildSearchResults`内の`.trim()`がTypeErrorを投げ汎用500に落ちる（本来400が適切）
- `User.js`: `email`に`lowercase: true`が無く、大文字小文字違いで別アカウントが作れる・ログインできない
- `authController.js`: ユーザー不在時は即401、パスワード違いの時だけbcrypt比較が走るため、応答時間差でアカウントの存在を推測できるタイミングサイドチャネルがある
- `userController.js`の`changePassword`が`newPassword`の型を検証しておらず、文字列以外だとpre-saveフックで例外→不透明な500になる

**Frontend新規発見**:
- `ConfirmDialog.jsx`（Profile/RecordDetail/NodeDetailPanelで使用）がフォーカストラップはあるが、閉じた後に元の要素へフォーカスを復元しない
- `Navbar.jsx`のハンバーガーメニューの`aria-label="Toggle menu"`が唯一ハードコードされた英語（他は`t()`経由）。`aria-expanded`も未設定
- `utils/authFormValidation.js`にテストが無い（同種の`recordFormValidation.js`にはある）
- 9個のデータ取得hookが約20行のloading/error/AbortControllerの定型文を重複（バグではなく、過度な抽象化を避ける方針とのバランス次第）

両フォークとも総評として「ポートフォリオ水準としては高い完成度」（所有者チェック・NoSQLインジェクション対策・AbortControllerによる競合状態対策・`dangerouslySetInnerHTML`不使用・本物のradio/checkbox要素の使用など）と評価している。

**変更ファイル**: 無し（調査のみ）。

**実行したテストと結果**: 該当なし（コード変更を伴わない調査タスクのため）。

---

### 2026-08-29: 産地アクセントカラーをハッシュ方式から地域グループ×手動対応表へ再設計

ユーザーから「originアクセントの配色基準を確認したい」という質問を受けた。回答したところ、「色の衝突が気になる」「地理的にまとまりのある色にしたい」「重複は避けたい」という要望に発展した。

従来の`originAccent.js`は、産地名のハッシュ値を7色パレットの数で割った余りで色を決めていた（同じ名前なら常に同じ色になるが、20産地に対し7色しか無いため衝突が必然的に発生し、地域性も無い）。ハッシュ方式では「地域性」「重複回避」のどちらも保証できないため、ユーザーに確認のうえハッシュ自動割り当てをやめ、20産地それぞれへ手動で決め打ちした対応表へ切り替えた。

**実装**: 産地を4地域（東アフリカ／南米／中米+メキシコ／アジア・中東）にグルーピングし、地域ごとに1つの色相（東アフリカ=hue28のオレンジ系、南米=hue100のグリーン系、中米+メキシコ=hue200のブルー系、アジア・中東=hue275のパープル系）を割り当てた。地域内は同じ色相のまま、既存のCatppuccin Mochaアクセント色と同じパステル寄りの明度帯（L67〜85%）に収めつつ彩度を45→75%まで上げることで、20件すべて重複の無い色にした（`hslToHex(hue, sat, light)`で計算、`t = i/(n-1)`として`light = 85 - t*18`・`sat = 45 + t*30`）。

`originAccent.js`を、ハッシュ計算（`hashString`・`getOriginAccentIndex`）から`ORIGIN_NAME_TO_HEX`（産地名→HEXの単純な対応表）ベースへ書き換えた。Tailwindの任意値記法（`bg-[#rrggbb]`等）はソースにリテラルとして書かれていないと検出されないため、`bg-*`・`fill-*`・`text-*`（Graphノード用に新設。後述）の3系統それぞれ、20件ぶんの完全なクラス名をリテラルで書き出した対応表（`ORIGIN_BG_CLASS_BY_NAME`等）を用意した。対応表に無い産地名（将来の追加し忘れ）は中立グレーへフォールバックする（ハッシュへのフォールバックはしない。衝突回避という目的に反するため）。呼び出し側（`RecordCard.jsx`・`HomeRecordCard.jsx`・`WorldMap.jsx`・`WorldMapPage.jsx`）はAPIを変えていないため無修正。

**変更ファイル**: `frontend/src/features/coffee-records/utils/originAccent.js`（全面書き換え）。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、`/records`一覧の産地アクセントバーが地域ごとにまとまった色味になっていること（Brazil=グリーン系、Guatemala=ブルー系、Kenya=オレンジ系）、`/map`で同様に地域ごとの色分けになっていること（Guatemala/Panama=ブルー系、Colombia/Brazil=グリーン系）、コンソールエラーが無いことを確認済み。

**未解決事項**: この対応表はハッシュ方式と違って自動では増えない。`backend/seeds/data/origins.js`へ新しい産地を追加する際は、`countryCodes.js`（地図の国コード対応表）と同様に、`originAccent.js`の`ORIGIN_NAME_TO_HEX`等にも手動で追加する必要がある（追加し忘れてもエラーにはならず、中立グレーになるだけ）。

---

### 2026-08-29: 産地アクセントカラーをGraph画面のノードにも反映

上記の産地アクセントカラー再設計に続けて、ユーザーから「graphノードにも反映してください」という要望を受けた。知識グラフのCanvas描画（`GraphCanvas.jsx`）は従来、origin型のノードを種別共通の`accent-sky`一色で描画しており、産地ごとの区別が無かった。

**実装**: `originAccent.js`にCanvas用の生HEXを返す`getOriginHex(originName)`を追加し、`drawNode`内でorigin型のノードだけ`getOriginHex(node.label)`をアイコン色・選択時の枠線色に使うよう変更した（record・variety等の他の種別は従来通り種別共通色）。`getNodeIconImage`は色ごとにアイコンをキャッシュする作りのため、産地ごとに異なる色を渡しても既存の仕組みのまま動く（変更不要）。一貫性のため、ノード選択時のサイドパネル（`NodeDetailPanel.jsx`）のアイコン色も、origin型のときだけ同じ色（`getOriginTextClass`、`originAccent.js`に新設）になるようにした。`GraphLegend.jsx`・`GraphFilters.jsx`は種別ごとの凡例・フィルターであり個々の産地を列挙する場所ではないため変更していない。

**変更ファイル**: `frontend/src/features/graph/components/GraphCanvas.jsx`、`frontend/src/features/graph/components/NodeDetailPanel.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで`/graph`のorigin型ノード（Kenya=オレンジ、Colombia=グリーン、Panama=ブルー）とノード選択時のサイドパネルのアイコン色が一致していること、コンソールエラーが無いことを確認済み。

---

### 2026-08-29: README.mdの改善（Live Demoリンク・Features追記・スクリーンショット更新）

ユーザーから「README.mdを改善したい。まず自社開発スタートアップのためのポートフォリオという文言は不要では」という意見交換を受けた。確認したところ、実際に冒頭に「自社開発スタートアップの長期インターン応募のために作成した、学習用・ポートフォリオ用のWebアプリです。」という1文が存在していた（応募目的の文言はREADME.mdには書かず、内部コンテキスト用のCLAUDE.mdにのみ置く、という役割分担で合意）。続けて「他に改善点はあるか」と聞かれたため、README.md全文と実際のコードベース・ドキュメントを突き合わせて監査した。

**見つかった問題**:
1. ライブデモ（Render/Vercel）へのリンクが無かった
2. スクリーンショット5枚（home/records/record-detail/graph/stats）がすべて8/15時点のもので、それ以降のmobbin.com刷新・Records/RecordDetail/Statsのレイアウト見直し・産地アクセントカラーの地域グループ化などを反映していなかった。加えてWorld Map・Coffee Diagnosisの2機能はスクリーンショットが1枚も無かった
3. 「MVP完成後に追加した機能」の一覧に、`docs/features.md`にある7項目中2項目（World Map・Coffee Diagnosis）が抜けていた
4. `git clone`がSSH形式（`git@github.com:...`）で、SSH鍵未設定の読者だと動かない

**実装**: 応募目的の1文を削除し、タイトル直下に本番URL（`https://coffee-app-seven-alpha.vercel.app/`）へのLive Demoリンクを追加した。デモアカウントでログインし、claude-in-chromeでHome/Records/Record Detail/Graph/Stats/World Map/Coffee Diagnosisの7画面を実機（本番環境）で撮影し直し、`docs/screenshots/`を更新（5枚更新+2枚新規）。Screenshotsセクションを7枚構成の表へ再編し、alt textも現状の見た目（産地アクセントカラー等）に合わせて更新した。Featuresセクションに World Map・Coffee Diagnosis の2項目を追加した。`git clone`コマンドをHTTPS形式へ変更した。

**変更ファイル**: `README.md`、`docs/screenshots/home.jpg`・`records.jpg`・`record-detail.jpg`・`graph.jpg`・`stats.jpg`（撮り直し）、`docs/screenshots/world-map.jpg`・`diagnosis.jpg`（新規）。バックエンド変更なし。

**実行したテストと結果**: README.md内の画像パス7件がすべて`docs/screenshots/`の実ファイルと一致していることを確認済み（Markdownのビルド・lintは無いため目視確認のみ）。スクリーンショット撮影は本番環境（Vercel）のデモアカウントで実施し、産地アクセントカラーの地域グループ化・Statsの3段カード構成など最新の見た目を反映していることを確認済み。

**未解決事項**: スクリーンショット撮影のため、ブラウザ内で本番環境のユーザー自身のアカウント（Chromeに保存されていた認証情報で自動ログインされていた）から一旦ログアウトし、デモアカウントでログインし直した。次回そのブラウザで本番URLを開く際は、ユーザー自身のアカウントで再ログインが必要になる（Chromeに保存されていれば自動入力される）。

---

### 2026-08-29: フォントの使い分け（Inter×Space Monoの対比）を再選定の上で復活

ユーザーから「fontの使い分けをするとアプリに奥行きが生まれると思う」という提案を受けた。これは、一度あった設計をユーザー自身の判断で撤回した経緯があるテーマだった。当初の設計方針（`prompts/design/00-design-principles.md` 6.2 Typography。このファイル自体は今も未更新でInterのまま）は「見出し・本文はInter、数値・日付・件数のようなコード的要素にはSpace Mono」という対比だったが、本文フォントを一時`Maple Mono`へ変更した際に「統一するか使い分けるか」を相談され、当時はモノスペース同士の対比（Maple Mono本文×Space Monoデータ）の危うさを説明した上でユーザーは**Space Monoへの完全統一**を選んでいた（2026-08「アプリ全体のフォントをMaple MonoからSpace Monoへ統一」参照）。

今回は「フォント選定から始めたい」との要望で、ゼロから選び直した:

1. 方向性としてプロポーショナル×モノスペースの対比を選択（モノスペース同士の対比案・セリフ対比案は不採用）
2. 本文候補としてManropeを一度選んだが、Google Fonts CSS2 APIのレスポンスを実際に取得して確認したところ、Manropeにはイタリック体（`font-style: italic`）が一切存在しないことが判明。このアプリは`font-synthesis: none`のため疑似イタリックも生成されず、Notes等の副次的テキストに使っている「イタリックで区別する」表現が効かなくなる問題が分かり、再選定した
3. 同様の方法でSoraもイタリック非対応と判明。イタリックを持つInter・Work Sansの2択となり、**Inter**を選択

結果的に当初の設計と同じ組み合わせ（Inter×Space Mono）に落ち着いたが、Manrope・Soraを実際に検証した上で消去法により選び直したもので、単なる「差し戻し」ではない。

**実装**: `frontend/src/index.css`の`:root`の`font-family`を`"Space Mono", "Inter", ...`→`"Inter", "Space Mono", ...`の順へ戻した。実装中に、`frontend/src/App.css`冒頭に**index.cssとは別に**`--app-font`という重複したフォント変数が定義されており（Space Mono統一時にこちらの更新が漏れていた）、多くの要素（例: `HomePage.jsx`のh1見出し）がこちらを参照していたためInterへ変更しても反映されない不具合を発見し、あわせて修正した。また、`Navbar.jsx`のロゴ「Coffee App」には`font-mono`が付いているのに対し`AuthNav.jsx`（Login/Register/Landing用ナビ）のロゴには付いておらず、本文がSpace Monoだった間は違いが見えなかったが本文をInterへ戻すと2つのロゴの書体が食い違ってしまう不整合も見つけて修正した。

**変更ファイル**: `frontend/src/index.css`、`frontend/src/App.css`、`frontend/src/components/AuthNav.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで`getComputedStyle`により本文要素（h1等）が`Inter`を、`.font-mono`要素が`Space Mono`を正しく解決していることを確認。Home画面で本文とデータ値（評価・件数）の対比が視覚的に確認できること、`/this-page-does-not-exist`（NotFoundPage）の説明文が実際にイタリック体で表示されること（Manropeで問題になった点の再発防止確認）、コンソールエラーが無いことを確認済み。AuthNavの表示は現在ログイン中のため直接確認できなかったが、Navbarと全く同じ`font-mono`クラスを追加しただけのため問題無いと判断した。

**未解決事項**: `--app-font`（App.css）と`:root`のfont-family（index.css）という同じ内容を2箇所で保持する構造が残っている。今回は両方を更新して同期を取ったが、根本的には1箇所（index.cssの`@theme`）へ統合すべき（App.css側は将来的にTailwindのユーティリティへ置き換えて削除するのが望ましいが、影響範囲の調査が必要なため今回のスコープ外とした）。

---

### 2026-08-30: ローディングスケルトン表示のレビュー（1/4: `.skeleton-block`のCSS重複を解消）

ユーザーから「ローディング中のスケルトン表示についてレビューしてください」という依頼を受けた。アプリ内の全スケルトンコンポーネントと共通CSS（`.skeleton-block`）を実際のページ構造と突き合わせて調査し、4件の問題を見つけた（このエントリはそのうち1件目）。

`App.css`に`.skeleton-block`が2箇所、約1850行離れて重複定義されていた: 3265行目（`display: inline-block` + `skeleton-pulse`アニメーション、MLBレガシーの「Compare Page」直前）と5114行目（`background`のシマーグラデーション + `shimmer`アニメーション、「[Phase 10] Shimmer skeleton loading」、「League Page」直前）が両方とも`.skeleton-block`にマッチしており、カスケードにより`background`/`animation`は後者が勝つ一方`display: inline-block`は前者しか持っておらずそのまま生き残る、という2つのルールのプロパティが混ざり合って初めて成立する壊れやすい状態だった。

**実装**: 5114行目へ`display: inline-block`を明示的に追加し、3265行目の重複ルールと`@keyframes skeleton-pulse`を削除した。

**変更ファイル**: `frontend/src/App.css`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。

**未解決事項**: 調査中に、同じくMLBレガシーの未参照CSS（`.scout-loading`・`.scout-skeleton-*`、`.future-star-card--loading`）が`App.css`に残っていることを発見した（`docs/mlb-legacy-inventory.md`が把握していた「もう1箇所」とは別の、さらに追加の未参照ブロック）。`.scout-skeleton-header`は今回削除した`skeleton-pulse`を参照していたが、そもそも未参照CSSのため実害は無い。まとめて削除する機会は別途設ける。

---

### 2026-08-30: ローディングスケルトン表示のレビュー（2/4: `RecordDetailSkeleton.jsx`を現在の構造に合わせて書き直し）

`RecordDetailSkeleton.jsx`が2026-08-27より前の構造のままだった: `RecordDetailPage.jsx`が`divide-y`から`cardClass`（枠線+背景+影のカード）へ、Coffee Detailsが`grid`からアイコンバッジ付き`flex flex-wrap`へ移行済みだったのに、スケルトンは旧`divide-y`+`grid`のままで、読み込み完了時にレイアウトが動く状態だった。

**実装**: 実際の構造（cardClassセクション3つ、Coffee Detailsはアイコンバッジ付きタイル、Taste/Connectionsは正方形2枚）に合わせて全面的に書き直した。

**変更ファイル**: `frontend/src/features/coffee-records/components/RecordDetailSkeleton.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、`window.fetch`を一時的に3秒遅延させてRecord Detailへクライアントサイド遷移し、新しいスケルトンが実際のページ構造（cardClassセクション3つ、アイコンバッジ、正方形2枚）通りに表示されること、実データへ切り替わってもレイアウトが飛ばないこと、コンソールエラーが無いことを確認済み。

---

### 2026-08-30: ローディングスケルトン表示のレビュー（3/4: `RecordListSkeleton`に産地アクセントバーを追加）

`RecordListSkeleton`（`RecordListStates.jsx`）に産地アクセントバーのプレースホルダーが無かった: 2026-08-27に`RecordCard.jsx`へ追加された「産地アクセントバー+産地名」の行が、`/records`一覧・横断検索結果の両方で使われるこのスケルトンだけ追随していなかった（Home画面用の`HomeRecordCardSkeleton.jsx`は既に対応済みで、比較して発覚）。

**実装**: `HomeRecordCardSkeleton.jsx`と同じ産地アクセントバーの行を追加した。

**変更ファイル**: `frontend/src/features/coffee-records/components/RecordListStates.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。

---

### 2026-08-30: ローディングスケルトン表示のレビュー（4/4: World Mapページ専用のスケルトンを新設、ユーザー指摘）

ユーザーから「地図ページのローディングはグラフページのスケルトンの使い回しです。地図ページ向けに作り直してください」という指摘を受けた。`WorldMapPage.jsx`が読み込み中に`GraphLoadingState`（ノード・エッジを模した円+線の骨格、知識グラフ専用）をそのまま使っており、地図・サマリー・産地一覧という実際の構成と見た目が全く違っていた。

**実装**: 新規`frontend/src/features/map/components/WorldMapSkeleton.jsx`を作り、StatCard1枚分のプレースホルダー・地図のviewBox比率（960:500）に合わせた角丸矩形+凡例・「Visited origins」の`cardClass`セクション（チップ形状複数）で構成した。`WorldMapPage.jsx`の`GraphLoadingState`をこれに差し替えた。`GraphErrorState`（アラートアイコン+リトライボタンのみ）はグラフ形状に依存しない汎用的な見た目のためそのまま流用した。

**変更ファイル**: `frontend/src/features/map/components/WorldMapSkeleton.jsx`（新規）、`frontend/src/pages/WorldMapPage.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、`window.fetch`を一時的に3秒遅延させた状態でWorld Mapへクライアントサイド遷移し、新しいスケルトンがサマリー・地図（縦横比込み）・産地一覧チップの3ブロックとして表示され、Graph画面の円+線の骨格が出なくなっていること、実データへ切り替わってもレイアウトが飛ばないこと、コンソールエラーが無いことを確認済み。

**未解決事項**: `DiagnosisSkeleton.jsx`も`divide-y`のままだが、`DiagnosisPage.jsx`自体が`cardClass`へ未移行のため、ページ側の対応が先（次に実装すべき最小単位に追記）。

---

### 2026-08-30: Statsページのスケルトンを実際の構造に合わせて修正（ユーザー指摘）

ユーザーから「statsページのスケルトンを改善してください」という依頼を受けた。直前のローディングスケルトンのレビュー（同日）では`StatsSkeleton.jsx`を「実際のページ変更と同時に更新済みで一致している」と判断していたが、これは`cardClass`3セクションへの外枠の追随だけを見ており、各セクション内部（`OverviewStats`/`CollectionStats`の`StatCard`、`TopRankingList`）の構造までは突き合わせられていなかった、レビュー自体の見落とし。

実際は次の2点で乖離していた:

- 「Your pace」「Collection」セクションが、無地の`grid grid-cols-2 sm:grid-cols-3`の箱だった。実際の`OverviewStats.jsx`/`CollectionStats.jsx`は`flex flex-wrap`に並んだアイコンバッジ付き`StatCard`（`flat`、cardClass内なので影なし）
- 「Taste tendencies」のランキング部分が、見出しの無い2グループ×5行の汎用プレースホルダーだった。実際は産地・品種・精製方法・フレーバー・カフェの**5つ**の`TopRankingList`（各グループにアイコン+見出しが付く）が`grid-cols-1 sm:grid-cols-2`で並ぶ

**実装**: `StatCardSkeleton`（アイコン円+ラベル/値、影なし）と`RankingListSkeleton`（アイコン+見出し+行3本）という2つの内部コンポーネントを新設し、3セクションをそれぞれ実際の子コンポーネント構成に合わせて書き直した。棒グラフ部分（月次推移・評価分布）も`MonthlyTrendChart`/`RatingDistributionChart`と同じ「値ラベル→バー→軸ラベル」の3段構成にした。

**変更ファイル**: `frontend/src/features/stats/components/StatsSkeleton.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで確認: ローカルのbackendがMongoDB認証エラーで起動できなかったため（Atlas接続情報が古いままの可能性があり、今回の作業とは無関係な既存の環境課題として未調査）、`localStorage`へダミーのトークンを設置してProtectedRouteを通過し、`window.fetch`を「解決しないPromise」に差し替えてローディング状態を固定した上でStatsページを表示。新しいスケルトンが3セクションとも実際の構造（アイコンバッジ付きStatCard、5つのランキンググループ+アイコン見出し）通りに表示されることを確認済み（実データとの並び順比較は上記の理由でできなかったため、ソースコードの構造比較で正確性を担保した）。

**未解決事項**: ローカル開発環境のbackendがMongoDB Atlasへの認証に失敗し起動できない状態（既存の環境課題、今回の変更とは無関係）。次にbackendを触る際は`backend/.env`のMongo接続情報を確認する必要がある。

---

### 2026-08-30: コーヒー診断（Coffee Diagnosis）機能を強化する

ユーザーから「discover pageのコーヒー診断機能を強化してください」という依頼を受けた（実際には`/diagnosis`ページを指していた。`/discover`という独立ページは無い）。強化前にまず現状の計算方法を調査し、ユーザーへ報告した上で、AskUserQuestionで方向性（診断タイプの種類を増やす／判定に使う入力信号を増やす／透明性・正確さを向上させる、の3方向すべて）と、追加する入力信号（精製方法・品種・6軸の味覚グラフ）を確認してから実装した。

**設計判断**: 主軸（焙煎度×フレーバーcategory）による判定はそのまま活かし、精製方法・品種・6軸の味覚評価は「タイプ判定そのものに混ぜ込まず、判定結果に付随する補足情報として独立に算出する」方針にした。焙煎度×category（2軸）にさらに精製方法・品種を掛け合わせると組み合わせ数が爆発し、辞書のメンテナンス性・面接での説明可能性（CLAUDE.md「過度な抽象化、過剰設計は避ける」）を損なうため。

**実装内容**:

1. **診断タイプを5種類→21種類へ拡張**: `ARCHETYPES`テーブルを焙煎度3種×フレーバーcategory6種（fruity/floral/nutty/sweet/spicy/other）の全18通り＋category不明時の一般則3種へ拡張した。以前は5通りしか個別名が無く、残り13通り（`other`カテゴリを含む）は焙煎度だけの大雑把な結果に落ちていた。
2. **サンプル件数を分割して正確化**: `sampleSize`（焙煎度の件数のみを反映し、フレーバー側の一致件数が分からなかった）を`roastSampleSize`と`categorySampleSize`（category確定時のみ数値）に分割した。
3. **精製方法・品種を補足情報として追加**: `summarizeDominantRef`という汎用の純粋関数を新設し、Discoverの`findDominantProcess`と同じ「3件未満・同率首位ならnull」というルールで、全記録の`process`・`varieties`（配列）から最頻値を求める。`archetype.dominantProcess`/`archetype.dominantVariety`として返す。
4. **平均テイストプロファイルを追加**: 甘み・苦み・酸味・コク・香り・後味の6軸を、軸ごとに値が入っている記録だけを対象に平均する`computeTasteProfile`を新設。軸ごとに3件未満ならその軸だけnull。フロントは新規UIを作らず、記録詳細ページで使っている`TasteRadarChart.jsx`へ`archetype.tasteProfile`をそのまま`record`として渡して再利用した（フィールド名を`CoffeeRecord`と揃えたことで、アダプターコード無しで再利用できた）。
5. 新規21タイプ分の色（`archetypeVisuals.js`）は「flavor categoryごとに固定」というルールへ整理し、新しい色トークンは増やさず既存Catppuccin Mochaパレット内で再割り当てした（`other`カテゴリのみ、archetypeでは未使用だった`accent-moss`を新たに割り当てた）。
6. `ArchetypeCard.jsx`に、根拠（焙煎度/フレーバー件数）・補足情報（精製方法・品種、無ければ非表示）・平均テイストプロファイル（データが無ければセクションごと非表示）を追加した。

**データフロー**: `GET /api/diagnosis` → `diagnosisController.getDiagnosis` → `diagnosisService.buildDiagnosisForUser`（変更なし。serialize済みrecordsをそのまま`buildArchetype`へ渡すだけ）→ `diagnosisBuilder.buildArchetype`（今回の主な変更）→ フロントの`DiagnosisPage.jsx` → `ArchetypeCard.jsx`（今回拡張）→ `TasteRadarChart.jsx`（既存コンポーネントを再利用）。

**変更ファイル**:
- `backend/core/diagnosis/diagnosisBuilder.js`（主要な変更）
- `backend/tests/diagnosisBuilder.test.js`（新規archetype・補足情報のテストを追加）
- `backend/tests/diagnosisApi.test.js`（レスポンス形状の更新、精製方法・品種の補足情報テストを追加）
- `frontend/src/features/diagnosis/components/ArchetypeCard.jsx`
- `frontend/src/features/diagnosis/utils/archetypeVisuals.js`
- `frontend/src/i18n/locales/ja.json`・`en.json`
- `docs/features.md`「Coffee Diagnosis」
- `docs/domain-model.md`「Coffee Diagnosis での利用」

`backend/services/coffee/diagnosisService.js`・`frontend/src/pages/DiagnosisPage.jsx`は変更不要だった（インターフェースが変わらないため）。

**実行したテストと結果**: `cd backend && npm test`（27 test suites / 426 tests、既存418件+新規8件）すべて成功。`cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。

claude-in-chromeで実機確認: ローカルのbackendはAtlas接続が失敗する（既知の環境課題）ため、代わりにdocker-compose起動済みのローカルMongoDBコンテナ（`mongodb://127.0.0.1:27018/coffeeApp`、demoアカウントの記録15件を含む）へ`MONGO_URI`を切り替えて起動した。デモアカウントの実データで「浅煎り × フルーティー派（lightFruity）」と判定され、`roastSampleSize: 14`・`categorySampleSize: 11`・`よく選ぶ精製方法: Washed（9件）`が正しく表示されること、精製方法・品種が同率首位で決まらないケース（品種はSL28とHeirloomが2件ずつで同率）で該当行が非表示になることを確認。日本語表示への切り替えでも新規i18nキーが正しく展開されることを確認。平均テイストプロファイルは、一時的に味覚データ付きの記録3件をこのローカルDBへ追加してレーダーチャートの表示を確認した後、確認用の一時レコードは削除して元の15件に戻した（本番DBには触れていない）。すべての画面でコンソールエラー無し。

**未解決事項**:
- ローカル開発環境のbackendは、docker-compose起動済みのMongoDBコンテナ（ポート27018）へ`MONGO_URI`を切り替えれば起動できることを確認した（`.env`のAtlas接続情報は引き続き失敗する。詳細は2026-08-30のStatsスケルトンのエントリ参照）。次にbackendのローカル起動が必要な際は、このコンテナを使う方が早い
- 新規13タイプの日本語・英語コピー（タイトル・説明文）はこのセッションで新規に書き下ろしたもので、実際のユーザーの記録データでの見え方の検証は行っていない（`tasteKeywords.json`・診断ARCHETYPESの閾値と同種の「デモデータでの動作確認のみ」という既存の課題と同じ扱い）
- `rating`（総合評価）は今回、判定にも補足情報にも使わなかった（AskUserQuestionの選択肢には含めたが選ばれなかった）。将来「高評価のタイプ」のようなバッジを追加する場合の候補として残る

---

### 2026-08-30: Diagnosisページをcardクラスへ統一する（ユーザー指摘）

ユーザーから「diagnosisページのranking表示部分がカード化されていません。他ページと統一させてください」という指摘を受けた。`DiagnosisPage.jsx`だけがStats/Profile/RecordDetail/EntityDetailの`cardClass`移行に追随しておらず、`divide-y`の区切り線のままだった（`IMPLEMENTATION.md`の次に実装すべき最小単位に既出）。ユーザーが指摘した「ranking表示部分」（産地・フレーバーの`TopRankingList`）は3セクション目「記録の全体像」の中にあり、この部分だけを直すのではなく3セクションすべてを`cardClass`へ統一した（StatsPage.jsxと同じ構成に揃えるため）。

**実装**: `DiagnosisPage.jsx`の`divide-y divide-surface-2` + `pb-6`/`py-6`/`pt-6`を、3つの`cardClass`セクション（`flex flex-col gap-6`）へ書き換えた。3セクション目の中にネストされる`ArchetypeCard`・`HomeVsCafeCard`は、StatCard.jsxの`flat`propと同じ理由（ネストされた内側のカードに二重の影を付けない）で、それぞれに`flat`propを追加した（`OverviewStats`は元から`flat`のため変更不要）。`DiagnosisSkeleton.jsx`も、2026-08-30のStatsスケルトン修正と同じ考え方で、無地の`grid`ではなく実際のStatCard・HomeVsCafeCard・TopRankingListと同じ形のプレースホルダーへ全面的に書き直した（最初から「外枠だけ追随し内部構造がずれる」不具合を作らないため）。

**変更ファイル**: `frontend/src/pages/DiagnosisPage.jsx`、`frontend/src/features/diagnosis/components/{ArchetypeCard.jsx, DiagnosisSkeleton.jsx}`、`frontend/src/features/stats/components/HomeVsCafeCard.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、docker-composeのローカルMongoDBコンテナへ接続したbackendとデモアカウントで実機確認: 3セクションが`cardClass`（枠線+背景+影）で統一され、ランキング部分（産地・フレーバー）が3セクション目のカード内に収まっていること、`ArchetypeCard`・`HomeVsCafeCard`が二重の影にならず自然にネストされていることを確認。`window.fetch`を3秒遅延させ、Stats画面経由でのクライアントサイド遷移により新しい`DiagnosisSkeleton`が実際の構造（3つのcardClass、StatCard・HomeVsCafeCard・ランキングの形）通りに表示され、実データへの切り替わりでレイアウトが飛ばないことを確認。コンソールエラー無し。

**未解決事項**: 特になし（次に実装すべき最小単位からこの項目を除去）。

---

### 2026-08-30: カード化のルールを明文化し、Discover提案セクションを統一する（ユーザー指摘）

ユーザーから「entitiesページと今回のdiagnosticsページには差がある」という指摘を受けた。調査の結果、`EntityDetailPage.jsx`の「まだ試していない産地」（`DiscoverSuggestions.jsx`）セクションだけが、見出しがプレーンテキストのまま背景に浮き、個々の提案（`SuggestionCard.jsx`）だけがカード化されている状態だった。これは意図的な差ではなく、RecordDetail→Stats→EntityDetailの「Related」系→Diagnosisで繰り返し発生してきたのと同じ「新機能が後から追加され、他セクションのcardClass統一に追随していない」パターンだった。

一方、`HomePage.jsx`の「Recent Records」・`RecordsPage.jsx`の記録一覧は、見出しなし/プレーン見出し+個別カードのままであり、こちらは意図的な一覧・ダッシュボード系のパターンとして全ページで一貫していることを確認した。今後同じ議論を繰り返さないよう、この2パターンの使い分けを`docs/design.md`「UI Rules」へ明文化した。

**ルール（`docs/design.md`「カード化の使い分け」）**: レポート・詳細系ページ（Stats/Diagnosis/RecordDetail/EntityDetail）は見出しごと`cardClass`で囲み、ネストする要素は`flat`で影を消す。一覧・ダッシュボード系ページ（Home/Records）は見出しをプレーンのままにし、各項目自体をカードにする。

**実装**: `DiscoverSuggestions.jsx`の外枠を`cardClass`（EntityDetailPage.jsxの「関連する属性」「関連する記録」と同じ形）へ変更。`SuggestionCard.jsx`に`flat`propを追加し、ネストされた際に影を消せるようにした（`StatCard.jsx`/`ArchetypeCard.jsx`/`HomeVsCafeCard.jsx`と同じパターン）。

**変更ファイル**: `docs/design.md`、`frontend/src/features/discover/components/{DiscoverSuggestions.jsx, SuggestionCard.jsx}`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、docker-composeのローカルMongoDBコンテナへ接続したbackendとデモアカウントで、Guatemala（産地）のEntity Detailページを確認: 「まだ試していない産地」セクションが「グラフ上の関連」と同じ見た目（枠線+背景+影）で統一され、中の提案カードが二重の影にならず自然にネストされていることを確認。コンソールエラー無し。

**未解決事項**: 特になし。今後、新しいセクションを追加する際はこのルールに沿っているか確認すること。

---

### 2026-08-30: カード化ルールを「見出しの有無に関わらず一律cardClass化」へ改定する（ユーザー指摘）

直前のカード化ルール明文化では、レポート系ページの対象を「見出しを持つセクション」に限定していた。ユーザーから、EntityDetailページの統計カード行（記録数・平均評価・最後に飲んだ日。見出し無し）だけが依然として独立したままである理由を問われた。

調査の結果、同じ「見出し無し」でもWorldMapPageの地図本体（見出し無しだがcardClass相当の見た目で囲まれている）とEntityDetailの統計カード行（見出し無しで囲まれていない）とで扱いが割れており、「見出しの有無」という基準だけでは一貫した説明ができないことが分かった。ユーザーと議論した結果、「見た目の統一感 vs 設計の統一」ではなく「機械的に一律ルールにするか、情報の軽重を演出する複雑なルールにするか」という論点であると整理し、後者（見た目の軽重を演出する）ではなく前者（一律cardClass化、例外なし）を採用する方針で確定した。

**実装**: レポート系ページ（EntityDetail・WorldMap）に残っていた「見出し無しの独立コンテンツブロック」を`cardClass`で統一した。
- `EntityDetailPage.jsx`: 統計カード3枚の行を`cardClass`で囲み、StatCardを`flat`にした（ボタン行・ページ見出しに付随する種別ラベルは「コンテンツブロックではなくヘッダー・操作の一部」として対象外のまま）。
- `WorldMapPage.jsx`: 統計カード1枚の行を`cardClass`で囲みStatCardを`flat`に、地図本体も手書きの`rounded-2xl border ...`から`cardClass`定数へ統一した（既存の見た目とほぼ同一だが、`sm:p-6`だった独自パディングは`cardClass`の`sm:p-5`に揃った）。
- `EntityDetailSkeleton`（`EntityDetailPage.jsx`内）・`WorldMapSkeleton.jsx`も同じ構造に合わせて更新した。

`docs/design.md`「カード化の使い分け」に、この改定の経緯（見出しの有無という基準では地図と統計カード行の扱いが説明できなかったこと、機械的な一律ルールを選んだ理由）を追記した。

**変更ファイル**: `docs/design.md`、`frontend/src/pages/EntityDetailPage.jsx`、`frontend/src/pages/WorldMapPage.jsx`、`frontend/src/features/map/components/WorldMapSkeleton.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、docker-composeのローカルMongoDBコンテナへ接続したbackendとデモアカウントで確認: Guatemala（産地）のEntity Detailページで統計カード行が他3セクションと同じ`cardClass`の見た目になったこと、World Mapページの統計カード・地図本体・「訪れた産地一覧」の3つが同じ見た目で並ぶこと、`window.fetch`を3秒遅延させたクライアントサイド遷移で両ページのスケルトンが新しい構造通りに表示されレイアウトが飛ばないことを確認。コンソールエラー無し。

**未解決事項**: 特になし。

---

### 2026-08-30: 記録編集フォームの保存忘れ確認 + React Routerデータルーター化（ユーザー指摘、専用branch）

ユーザーから「記録の編集後、保存を押すのを忘れた際の確認がない」という指摘を受けた。対策案を2つ検討し（(A)戻る/キャンセルのみ確認、(B)React Routerのデータルーター化で全ナビゲーションを一様に検知）、ユーザーと将来の拡張性・設計の完全性について議論した結果、**案B**を採用した（`docs/design.md`のUI Rulesにルールを追記）。CLAUDE.mdの「大規模変更では専用branchを作成してください」に該当する規模（全ページが通る土台`main.jsx`/`App.jsx`を書き換える）のため、`feat/unsaved-changes-guard`ブランチで実装した。

**背景**: React Routerの`useBlocker`（アプリ内ナビゲーションを一律に遮断できる）はデータルーター（`createBrowserRouter`）でのみ動作し、従来の`<BrowserRouter>`（宣言的モード）では使えない。ExploreエージェントとPlanエージェントによる事前調査で、`main.jsx`/`App.jsx`以外に`<Routes>`/`<Route>`を定義しているファイルは無く、他ページの`useNavigate`/`Link`/`<Navigate>`は無変更で動くことを確認済み。

**実装**:
1. **ルーターのデータルーター化**: ルート定義（旧`App.jsx`の`AnimatedRoutes`）を新規`frontend/src/router.jsx`へ分離し、`createBrowserRouter(createRoutesFromElements(...))`を`export const router`として持たせた。`App.jsx`は共通シェル（Navbar・BottomTabBar・ページ遷移アニメーション）だけを持つ`AppLayout`（`<Outlet />`を描画）に縮小した。`router`（非コンポーネント）と`AppLayout`（コンポーネント）を同じファイルに同居させるとVite Fast Refreshが効かなくなる（`eslint.config.js`の`react-refresh/only-export-components`）ため分離した。`main.jsx`は`<BrowserRouter><App /></BrowserRouter>`から`<RouterProvider router={router} />`へ変更（`AppErrorBoundary`の位置は変更なし）。
2. **`useRecordForm.js`にisDirtyを追加**: 記録の読み込み・保存のたびに更新する`initialValues`を新設し、`values`との`JSON.stringify`差分で`isDirty`を算出、フックの返り値に追加した。
3. **`RecordFormPage.jsx`に保存忘れガードを実装**: `useBlocker`で「`isDirty`かつパスが変わる」遷移を検知し、既存の`ConfirmDialog.jsx`（記録削除確認で使っているのと同じ汎用部品）を再利用して「変更を破棄しますか？」を表示。保存成功時は`navigate()`直前に`justSavedRef.current = true`を立てて確認をスキップする（`useRecordForm.submit()`の`await onSubmit(...)`完了より先に`navigate()`が実行されるため、state更新では間に合わず、同期的に読めるrefにした）。タブを閉じる・リロードは`useBlocker`の対象外（アプリ内ナビゲーションではないため）のため、`beforeunload`で別途対処した。
4. `docs/design.md`のUI Rulesに「未保存の変更を破棄して離脱する際も確認を入れる」を追記。

**データフロー**: フォーム入力 → `useRecordForm`の`values`が変化 → `isDirty`が`true`に → ユーザーがナビバー・戻るリンク・キャンセルボタン・ブラウザ戻る/進むのいずれかで離脱を試みる → `router.jsx`のデータルーターが遷移を検知 → `RecordFormPage.jsx`の`useBlocker`が`isDirty`を見て遮断 → `ConfirmDialog`表示 → 「破棄する」で`blocker.proceed()`、「編集を続ける」で`blocker.reset()`。保存成功時は`justSavedRef`により`useBlocker`をすり抜けて即座に遷移する。

**変更ファイル**: `frontend/src/main.jsx`、`frontend/src/router.jsx`（新規）、`frontend/src/App.jsx`、`frontend/src/features/coffee-records/hooks/useRecordForm.js`、`frontend/src/pages/RecordFormPage.jsx`、`frontend/src/i18n/locales/{ja,en}.json`、`docs/design.md`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。ビルド後、`/graph`・`/map`が引き続き別チャンクに分割されていることを`dist/assets`で確認。

claude-in-chromeで、docker-composeのローカルMongoDBコンテナ＋デモアカウントを使い、`main.jsx`/`App.jsx`という全ページが通る土台を変更したため全画面の手動回帰確認を実施: 未ログイン時の`/landing`リダイレクト、ログイン、Home/Graph（遅延読み込み）/World Map（遅延読み込み）/Records/存在しないURLでの`NotFoundPage`の表示、いずれも正常。保存忘れガードの動作確認: 記録編集フォームで値を変更した状態で、(a)ナビバーの他リンク (b)ヘッダーの「戻る」リンク（プレーンな`<Link>`で`onCancel`を経由しない経路）のどちらでも確認ダイアログが表示されること、「編集を続ける」で遷移が中止されること、「破棄する」で変更を保存せず遷移すること、変更が無い状態や保存成功後は確認が出ずに遷移することを確認。ブラウザの戻るボタン（`chrome.tabs.goBack`相当の操作）でも、ブラウザ標準の「サイトを離れますか」ダイアログでナビゲーションが止まり、ページの内容が保持されることを確認（`beforeunload`ハンドラが機能）。新規作成フォーム（`/records/new`）でも同様に保存忘れガードが機能することを確認。全画面でコンソールエラー無し。

**未解決事項**:
- 既存のフロントエンドテストは`App.jsx`やルーター周りをレンダーするものが無い（Plan agentが確認済み）ため、今回のルーター移行の正しさは自動テストでは担保されておらず、手動回帰確認のみに頼っている
- `useRecordForm.js`の`isDirty`は`JSON.stringify`比較のため、品種・フレーバーの選び直しで配列の並び順だけが変わった場合に実質同じ内容でもdirty判定になる（安全側のずれのため許容。Plan agent確認済み）

---

### 2026-08-30: `ConfirmDialog`がモバイルで`BottomTabBar`に隠れる不具合を修正（ユーザー指摘）

ユーザーから「確認画面の表示が崩れています」という指摘を受けた。モバイル幅（`sm`未満）で`ConfirmDialog.jsx`が下寄せ表示（`items-end`、いわゆるbottom sheet）になる際、ダイアログ下部の「編集を続ける」/「キャンセル」ボタンが`BottomTabBar`の裏に隠れて操作できない状態だった。

**原因**: `ConfirmDialog.jsx`の外枠が`z-50`、`App.css`の`.bottom-tab-bar`も`z-index: 50`と同値だった。CSSのz-indexが同値の場合はDOM順で後に描画された要素が勝つ。`AppLayout`（`App.jsx`）は`<main>`（ページ本体）の後に`<BottomTabBar />`を描画するため、常に`BottomTabBar`が`ConfirmDialog`より手前に来ていた。

**確認したこと**: この不具合は今回新設した「保存忘れ確認」ダイアログだけでなく、以前から存在した記録削除の確認ダイアログ（`RecordDetailPage.jsx`）でも同様に再現した。`ConfirmDialog.jsx`自体は今回のセッションで変更しておらず、既存のバグが今回のモバイル確認で初めて発覚した形。

**実装**: `ConfirmDialog.jsx`の外枠のz-indexを`z-50`から`z-[60]`へ変更した（Navbar・BottomTabBarのz-50より確実に手前に来るようにする）。

**変更ファイル**: `frontend/src/features/coffee-records/components/ConfirmDialog.jsx`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeでモバイル幅（390×844相当）に切り替え、記録削除の確認ダイアログ・保存忘れ確認ダイアログの両方で、下部ボタンが`BottomTabBar`に隠れず操作できることを確認。デスクトップ幅（中央寄せ表示）でも崩れが無いことを確認。コンソールエラー無し。

**未解決事項**: 同じページのモバイル幅で、`MoreMenu`（編集/削除ボタン横の「…」）のドロップダウンメニューも`BottomTabBar`の裏に一部隠れる場面を確認した（`RecordDetailPage.jsx`）。今回の指摘対象（確認ダイアログ）とは別コンポーネントのため、今回は対応していない。同じz-index競合が原因の可能性が高く、次にモバイルUIを触る際に確認すべき。

---

### 2026-08-31: 記録詳細ページのCoffee Detailsを全項目pillタグへ統一し、エンティティ詳細ページへのリンクにする（ユーザー指摘）

ユーザーから「Coffee Detailsのフレーバーだけpill型のタグで、他項目と表現が違う」という指摘を受けた。確認したところ、産地・農園・品種・精製方法・焙煎度・ロースターはプレーンテキスト（品種は複数値をカンマ区切りで1行に結合）、フレーバーだけが個別のpillタグだった。議論の結果、単一値/複数値で表現を分けず、全項目を一律pillタグにする方針で合意。さらに、産地・農園・品種・精製方法・焙煎度・フレーバーはpillタグをクリックすると対応するエンティティ詳細ページ（`/entities/<nodeId>`）へ遷移できるようにした（`RelatedAttributeGroup`と同じ「知識グラフをナビゲーションにする」考え方）。ロースター名だけは知識グラフのノードが無いため、リンクにはせずプレーンなpillのままにした。

**課題と解決**: 農園（farmName）だけは、他の項目のようにDBの`_id`を持たない自由記述項目のため、知識グラフのノードID（`farm:<正規化した名前>`）を組み立てるための正規化済み名前が記録のAPIレスポンスに含まれていなかった。ユーザーに相談し、フロントエンドで正規化ロジックを複製するのではなく、バックエンドの記録レスポンスへ`farmNodeId`（既存の`core/graph/nodeId.js`の`farmNodeId`・`utils/normalizeName.js`の`normalizeName`と同じロジック）を追加する方針を選んだ（One Source of Truthを崩さないため）。

**実装**:
1. `coffeeRecordSerializer.js`: 記録レスポンスへ`farmNodeId`（`farmName`があれば正規化した文字列、無ければ`null`）を追加。既存の`farmName`フィールドはそのまま残し、後方互換性を保った。
2. `recordFormat.js`の`collectCoffeeDetails`: 各項目の値を「1行にまとめた文字列」ではなく「{id, name}の配列」で返す形へ書き換えた。フレーバーもこの関数に統合し、`RecordDetailPage.jsx`側の特別扱い（別のvisual計算・別のJSXブロック）を無くした。
3. `RecordDetailPage.jsx`: `DETAIL_NODE_TYPE`に`flavors: "flavor"`を追加。各項目のpillを、`nodeType`と`item.id`が両方揃っている場合だけ`/entities/<nodeType>:<id>`への`Link`にし、それ以外（ロースター名、または万一`farmNodeId`が無い場合）はプレーンな`span`のままにした。
4. `RecordDetailSkeleton.jsx`: Coffee Detailsのプレースホルダーを、1本の線から複数のpill形状（`rounded-full`）へ変更し、実際の見た目に近づけた。

**データフロー**: `coffeeRecordSerializer.js`が`farmNodeId`を含めて記録を返す → `collectCoffeeDetails`が各項目を`{id, name}`の配列に整形（産地/品種/精製方法/焙煎度/フレーバーはDBの`id`、農園は`farmNodeId`、ロースターは常に`id: null`）→ `RecordDetailPage.jsx`が`id`を持つ項目だけ`/entities/`へのLinkとして描画。

**変更ファイル**: `backend/services/coffee/coffeeRecordSerializer.js`、`frontend/src/features/coffee-records/utils/recordFormat.js`、`frontend/src/pages/RecordDetailPage.jsx`、`frontend/src/features/coffee-records/components/RecordDetailSkeleton.jsx`。

**実行したテストと結果**: `cd backend && npm test`（27 test suites / 426 tests、既存のまま）すべて成功（`coffeeRecordApi.test.js`が`toMatchObject`/ネストしたフィールドの`toEqual`のみを使っており、`farmNodeId`追加による破壊なし）。`cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。

claude-in-chromeで、docker-composeのローカルMongoDBコンテナ＋デモアカウントを使い、農園・ロースター名の両方が設定された記録で確認: 産地・農園・品種・精製方法・焙煎度・フレーバーの全pillが見た目上統一され、農園pill（新設の`farmNodeId`経由）をクリックすると正しく`/entities/farm:finca el injerto`のエンティティ詳細ページへ遷移し、記録数・関連属性が正しく表示されることを確認。ロースター名（一時的にテスト用レコードを追加して確認後、削除して元に戻した）は、アクセシビリティツリー上も`link`ではなく`generic`要素になっており、意図通りクリックできないプレーンなpillのままであることを確認。コンソールエラー無し。

**未解決事項**: 特になし。

---

### 2026-08-31: 「戻る」導線をBackLinkへ統一する（ユーザー指摘）

ユーザーから「各ページに戻るボタンを追加してください」という依頼を受けた。調査したところ、実際には既に3パターンの実装が混在していた: メインナビ経由のページ（Home/Records/Graph/Stats/Profile、戻るボタン無しが意図的）、複数の場所から遷移してくるページ（EntityDetail/Diagnosis/WorldMap、`BackLink.jsx`の`navigate(-1)`）、遷移元を1つに決め打ちしていたページ（RecordDetailのパンくず`/records`固定リンク、RecordFormの編集元/一覧への固定リンク）。

ユーザーと相談し、メインナビ以外の全ページ（EntityDetail/Diagnosis/WorldMap/RecordDetail/RecordForm）を`BackLink`（`navigate(-1)`）へ統一する方針にした。調査の過程で、RecordDetailPageのパンくずが常に`/records`固定で戻っていたことが分かった。実際にはHome・検索結果・関連記録一覧・Graphのノードクリックなど複数の場所から遷移してくるため、`navigate(-1)`の方が「実際に来た場所へ戻る」という点でより正確（今回の統一が副次的にバグ修正にもなった）。あわせて、RecordDetailPageのパンくずの「Records」表記が`t()`を通さない未翻訳の英語ハードコードだったことも判明し、`BackLink`への置き換えで解消した。

**実装**:
- `RecordDetailPage.jsx`: `Records > タイトル`のパンくず（`ChevronRight`使用）を`<BackLink />`に置き換え
- `RecordFormPage.jsx`: 文脈依存の「Back to detail」「Back to list」リンクを`<BackLink />`に置き換え。`useBlocker`（保存忘れ確認）は`BackLink`の`navigate(-1)`呼び出しも引き続き検知することを確認
- 上記2箇所でのみ使われていた`records.backToDetail`・`records.breadcrumbAriaLabel`のi18nキーを削除（未使用化）
- `RecordDetailSkeleton.jsx`: コメントの「Breadcrumb」表記を「戻るリンク」へ修正（プレースホルダーの形自体は変更不要）

**変更ファイル**: `frontend/src/pages/RecordDetailPage.jsx`、`frontend/src/pages/RecordFormPage.jsx`、`frontend/src/features/coffee-records/components/RecordDetailSkeleton.jsx`、`frontend/src/i18n/locales/{ja,en}.json`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、docker-composeのローカルMongoDBコンテナ＋デモアカウントを使い確認: RecordDetailPageの「← Back」が実際の遷移元（Records一覧）へ正しく戻ること、RecordFormPageの「← Back」が未保存の変更がある状態でナビバー経由のクリックを試みると引き続き確認ダイアログ（`ConfirmDialog`）を表示し「Discard」で正しく破棄されること、を確認。コンソールエラー無し。

**未解決事項**: 特になし。

---

### 2026-08-31: EntityDetailページの「戻る」をチェーンをたどれるパンくずへ（ユーザー指摘）

直前の「戻る」導線統一（`BackLink`の`navigate(-1)`）に対し、ユーザーから「EntityDetailページで関連属性のチップを次々クリックして別のエンティティへ渡り歩くと、元の場所へ戻るのに『戻る』を何度も押す必要がある」という具体的な指摘を受けた。これはdocs/features.mdの「Entity Detail」がまさに主要な使い方として想定している「産地→品種→フレーバーとエンティティ間を渡り歩ける」操作そのもので、エッジケースではなく中心的な利用パターンである。単純な`navigate(-1)`は1階層ずつしか戻れないため、渡り歩くほど不便になる。

あわせて、別の議論で見つけていた懸念（URLを直接開いた場合など、そのタブでアプリ内遷移が一度も無いと`navigate(-1)`が期待通りに動かない）への対処も、`BackLink`本体の小さな改善として今回まとめて行った。

**設計判断**: 「アプリの固定的な階層」を示す一般的なパンくず（`/records`のような固定リンク）は、直前の作業で「複数の場所から来るページに固定パンくずを付けると実態と食い違う」というバグを直したばかりであり、再導入すると同じ問題を生む。そのため、EntityDetailPage限定で「このセッションで実際にチップをたどってきた経路」を動的に積み上げる**トレイル**を採用した。固定階層ではなく実際の遷移そのものを記録するため、常に正確という理由。

**実装**:
1. `BackLink.jsx`: React Routerの`location.key === "default"`（そのタブでアプリ内遷移が一度も起きていない＝URL直接アクセス・ブックマーク・新規タブ）を判定し、この場合は`navigate(-1)`ではなく`fallback`prop（省略時は`"/"`）へ遷移するようにした。既存の呼び出し箇所は無変更で動く。
2. `EntityDetailPage.jsx`: `useLocation().state?.trail`（無ければ`[]`）を読み取り、現在のエンティティを末尾に追加した`nextTrail`を関連属性チップの`Link`へ`state`として渡す（`RelatedAttributeGroup`に`trail`propを追加）。トレイルが空なら従来通り`<BackLink />`、トレイルがあれば新設の`EntityTrail`（`ChevronRight`区切りのLink列＋現在地はプレーンテキスト）を表示する。トレイルの各項目をクリックすると、そこで打ち切った`trail.slice(0, index)`を持って該当エンティティへ戻り、以後のトレイルが正しく切り詰められる。
3. `EntityDetailSkeleton`: `location.state?.trail`の有無はデータ取得前でも分かるため、`hasTrail`propを追加し、トレイルがある場合は2セグメント分のプレースホルダーを、無い場合は従来の1本のプレースホルダーを表示するようにした（実際の見た目とスケルトンの形を一致させる、このセッションで繰り返し徹底している方針）。
4. i18n: `entityDetail.trailAriaLabel`（ja「パンくずリスト」/en"Breadcrumb"）をja/enへ追加。`RecordDetailPage.jsx`のBackLink統一で不要になっていた`records.backToDetail`・`records.breadcrumbAriaLabel`は前回のエントリで既に削除済み。

**影響範囲**: `RelatedAttributeGroup`のLinkに`state`を追加しただけなので、検索結果・Stats・Diagnosis・WorldMap・RecordDetailのCoffee Detailsピルなど、`state`を渡さない経路からEntityDetailへ入った場合は`trail: []`のままで、従来通り`<BackLink />`表示になる（既存の挙動を変えない）。

**データフロー**: 産地Aのページ → 関連属性の品種Bチップをクリック（`state.trail = [{id: "origin:A", label:...}]`を持たせてnavigate）→ 品種Bのページが`trail`を読み`EntityTrail`を表示 → さらにフレーバーCチップをクリック（`trail`に品種Bを追加して渡す）→ フレーバーCのページで3階層のトレイルを表示。トレイルの先頭（産地A）をクリックすると`trail: []`を持って産地Aへ戻り、以後は通常の`<BackLink />`表示に戻る。

**変更ファイル**: `frontend/src/components/BackLink.jsx`、`frontend/src/pages/EntityDetailPage.jsx`、`frontend/src/i18n/locales/{ja,en}.json`。バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、docker-composeのローカルMongoDBコンテナ＋デモアカウントを使い確認: Guatemala（産地）→Bourbon（品種）→Chocolate（フレーバー）と3階層チップをたどり、パンくずが正しく積み上がることを確認。中間のトレイル項目（Bourbon）をクリックすると正しくそこへ戻り、以後のトレイルが1項目に切り詰められることを確認。先頭のトレイル項目（Guatemala）をクリックすると`trail`が空になり、表示が通常の`<BackLink />`に戻ることを確認。`window.fetch`を遅延させたクライアントサイド遷移で、トレイルの有無に応じてスケルトンの形（1本/2セグメント）が正しく切り替わることを確認。`BackLink`のfallback動作は、EntityDetailページのURLへ直接アクセスした直後（`location.key === "default"`）に「← Back」を押すと、`navigate(-1)`ではなく正しくデフォルトのfallback先（`/`＝Home）へ遷移することを確認。全操作でコンソールエラー無し。

**未解決事項**: 特になし。

---

### 2026-08-31: パンくずの先頭タグから「戻る」を押すと直前のエンティティへ戻ってしまう不具合を修正（ユーザー指摘）

直前のトレイル型パンくず実装の直後、ユーザーから「パンくずの先頭タグを押すと`<BackLink />`（戻るボタン）が出てくるが、それを押すとパンくず（直前にいたエンティティ）に戻ってしまう」という指摘を受けた。

**原因**: `RelatedAttributeGroup`（チップ）・`EntityTrail`（パンくず）経由の遷移が`navigate()`の既定動作（履歴を積む＝push）のままだった。渡り歩くたびにブラウザ履歴が1件ずつ積み上がるため、パンくずの先頭タグをクリックして`trail`を空に戻しても、ブラウザ履歴上は依然として「直前に見ていたエンティティ」が1つ前のエントリとして残っており、そこで`<BackLink />`の`navigate(-1)`を押すとそのエントリへ戻ってしまっていた。

**実装**: `RelatedAttributeGroup`のチップ`Link`と`EntityTrail`のパンくず`Link`の両方に`replace`propを追加した。渡り歩く操作を常に履歴の「置き換え」にすることで、EntityDetailページ内でのチップ・パンくず経由の移動はブラウザ履歴を1件も増やさなくなった。これにより、渡り歩きを始める前に本来いたページ（Stats・検索結果・RecordDetail等の外部ページ）が常にすぐ1つ前の履歴エントリのままになり、`navigate(-1)`（`<BackLink />`）はどの深さから押しても必ずそこへ戻るようになった。エンティティ間の移動自体はチップ・パンくずのクリックで行えるため、履歴を積まなくても操作性に影響はない。

**変更ファイル**: `frontend/src/pages/EntityDetailPage.jsx`（コメント追記+`Link`2箇所に`replace`追加のみ）。i18n・バックエンド変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。claude-in-chromeで、docker-composeではなくローカルMongoDB（`mongodb://127.0.0.1:27018/coffeeApp`）に接続したbackend（ポート5001）とデモアカウントを使い確認: (1) StatsページのランキングからEthiopia（産地）へ遷移（`history.length`確認済みの実際のpush）→Heirloom（品種）チップへ渡り歩く→パンくずの先頭「Ethiopia」をクリックしてtrailを空に戻す→「← Back」をクリックすると、Heirloomへは戻らず正しくStatsページへ戻ることを確認。(2) URL直接アクセス（Guatemala→Bourbon→Chocolateと渡り歩いた後、先頭のGuatemalaへ戻す）でも、`window.history.length`が一連の操作を通じて増加していない（履歴が積まれていない）ことをJavaScript実行で確認。全操作でコンソールエラー無し。

**未解決事項**: 特になし。

---

### 2026-08-31: Landingページのヒーロー見出しを「coffee-app」に簡略化（ユーザー指摘）

ユーザーから「landing pageのコーヒーを記録する。あなたの好みを発見する。をシンプルにcoffee-appとした方が自然」という指摘を受けた。`landing.hero.title`（ja/en共通のi18nキー）を、`Record → Connect → Discover`と同様の言語非依存のブランド語として扱い、日英どちらも「coffee-app」に統一した。

**実装**: `frontend/src/i18n/locales/{ja,en}.json`の`landing.hero.title`を変更しただけ。`LandingPage.jsx`側のレンダリングロジック（単語ごとのブラー→フェードイン演出）・`LandingHero.module.css`は無変更で対応できた（複数行を前提にしたCSSが無かったため）。

**変更ファイル**: `frontend/src/i18n/locales/{ja,en}.json`。

**実行したテストと結果**: `cd frontend && npm run lint && npm run build`成功。claude-in-chromeで、ログアウトした状態の`/landing`を日英両方で確認し、kicker・見出し・「Get Started」/「はじめましょう」CTAが中央揃えで自然に表示されることを確認（CTAはフェードインアニメーションのため、初回スクリーンショットには映らないことがあるが、演出の仕様通り）。コンソールエラー無し。

**未解決事項**: 特になし。

---

### 2026-08-31: アプリ全体の改善点洗い出し + セキュリティ・正しさ修正5件（ユーザー依頼）

ユーザーから「このアプリの改善点を洗い出してほしい。次どう進むべきか案を挙げてほしい」という依頼を受けた。Exploreエージェント2件（バックエンド監査・フロントエンド/インフラ監査）を並行実施し、2026-08-29の既存監査項目の現状再確認と新規項目の洗い出しを行った。結果はチャットで報告し、次の方向性として案A（足元を固める）・案B（産地フォーカス継続）・案C（知識グラフ深掘り）・案D（面接向け仕上げ）の4案を提示。ユーザーは4案とも選び、着手順は「案Aから順に（推奨）」を選択した。

本エントリは案Aの最初のバッチ: 2026-08-29監査で見つかっていたHigh優先度4件・Medium優先度1件のセキュリティ・正しさの不具合を修正した。

**実装**:
1. `backend/middleware/rateLimiter.js`（新規）: `authRoutes.js`にあったレート制限設定（15分10回、テスト環境ではスキップ）を`createBruteForceLimiter(message)`として共通化
2. `backend/routes/userRoutes.js`: `PATCH /me/password`にレート制限を追加（`authRoutes.js`のlogin/registerとは別インスタンス。同じ枠を共有すると片方の失敗回数がもう片方を食ってしまうため）
3. `backend/controllers/authController.js`: ログイン時、ユーザーが存在しない場合に`bcrypt.compare`自体をスキップしていたタイミングサイドチャネルを修正。存在しない場合はダミーハッシュ（`DUMMY_PASSWORD_HASH`、実在しないパスワードの固定ハッシュ値）と必ず比較するようにした。あわせてregister/login両方で`email`を`trim().toLowerCase()`してから`User.findOne`/`User.create`に使うようにした
4. `backend/models/User.js`: `email`に`lowercase: true, trim: true`を追加（保存時の正規化。find系クエリの条件までは自動正規化されないため、上記3のcontroller側の正規化とセットで機能する）
5. `backend/controllers/userController.js`: `changePassword`の`newPassword`/`currentPassword`に`typeof === "string"`の型検証を追加（`length`チェックのみでオブジェクト等をすり抜けていた）
6. `backend/controllers/searchController.js`: `?q=a&q=b`のような配列クエリを、未指定と同じ空文字として扱うガードを追加（`searchBuilder.js`の`.trim()`が配列に対し`TypeError`→500になっていた）
7. `frontend/src/components/Navbar.jsx`: ハンバーガーメニューに`aria-expanded`（開閉状態）・`aria-controls`（対応するドロワーの`id`）を追加。`aria-label`も未翻訳の英語ハードコードだったため`t("nav.toggleMenu")`へ変更（ja/enへ`nav.toggleMenu`キーを追加）

**データフロー**: login/register時、`req.body.email`を正規化してからDB検索・作成に使う → 既存の大文字小文字違いのメールは今回自動移行しない（新規登録・今後のログインから適用される）。ログイン失敗時は、ユーザーの有無に関わらず必ず`bcrypt.compare`を1回実行してから401を返す。

**変更ファイル**: `backend/middleware/rateLimiter.js`（新規）、`backend/routes/{authRoutes.js, userRoutes.js}`、`backend/controllers/{authController.js, userController.js, searchController.js}`、`backend/models/User.js`、`backend/tests/{authController.test.js, userController.test.js, searchApi.test.js}`、`frontend/src/components/Navbar.jsx`、`frontend/src/i18n/locales/{ja,en}.json`。

**実行したテストと結果**: `cd backend && npm test`（27 test suites / 432 tests。既存426件+新規6件: email大文字小文字の重複登録防止・email正規化・大文字小文字違いでのログイン成功・タイミングサイドチャネル修正の呼び出し確認・newPassword型検証・検索の配列クエリ）すべて成功。`cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。

バックエンドを起動しcurlで手動確認: (1) 大文字混じりのメールで登録→小文字化されて保存されることを確認、(2) 別の大文字小文字でログインできることを確認、(3) `?q=a&q=b`が500ではなく`{entities:[],records:[]}`を返すことを確認、(4) `newPassword`にオブジェクトを送ると400「Both current and new password must be strings」が返ることを確認。

**未解決事項**:
- 既存ユーザー（今回の修正前に登録済みで大文字小文字混じりのメールを持つアカウント）は自動移行されない。実運用ならマイグレーションスクリプトが必要だが、デモ/ポートフォリオ用途のため今回は対応しない
- 案A残り（Medium優先度: フロントエンドのテストカバレッジ拡充・バンドルサイズの`lazy()`化）は次のバッチで対応する
- 案B（産地フォーカス継続）・案C（知識グラフ深掘り）は新機能のため、着手前に別途設計相談が必要
- レート制限自体（`createBruteForceLimiter`）はテスト環境でスキップする設計のため、他のレート制限同様に自動テストの対象外（既存の`authRateLimiter`も同じ扱い）

**次に実装すべき最小単位**: 案Aの残り — フロントエンドの主要ロジック（`RecordForm.jsx`本体・`useRecordForm.js`・`RecordFormPage.jsx`のuseBlockerガード等）へのテスト追加。

---

### 2026-08-31: StatsPage/DiagnosisPage/EntityDetailPageを遅延読み込みにする（案Aの続き）

前回の監査で「メインJSバンドルが1.24MB(gzip 186KB)で、`GraphPage`/`WorldMapPage`以外は`lazy()`化されていない」という指摘があった。案Aの続きとして着手した。

**設計判断**: 4つの候補（`RecordForm`/`DiagnosisPage`/`StatsPage`/`EntityDetailPage`）のうち、`RecordFormPage`（`RecordForm`を使う画面）は`docs/product.md`の「Record First」原則（記録の追加を最も摩擦なくできるようにする）に直結する中心動線のため、あえて対象から外した。遅延読み込みにするとチャンク取得の待ち時間が「記録する」という最重要アクションに乗ってしまうため。残り3つ（`DiagnosisPage`・`EntityDetailPage`は常設ナビに無くリンク経由でのみ到達、`StatsPage`は常設ナビだが`GraphPage`と同じ「初回に必ず開くとは限らない」という基準に合わせた）を対象にした。

**実装**: `frontend/src/router.jsx`で`EntityDetailPage`・`DiagnosisPage`・`StatsPage`のimportを`lazy(() => import(...))`に変更し、対応する`<Route>`を`GraphPage`/`WorldMapPage`と同じ`<Suspense fallback={<LazyPageFallback />}>`で囲んだ。

**変更ファイル**: `frontend/src/router.jsx`のみ。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（68 tests、既存のまま）すべて成功。ビルド後、メインチャンクが1,245.92kB(gzip 185.72kB)→1,211.21kB(gzip 180.04kB)に縮小し、`StatsPage`・`EntityDetailPage`・`DiagnosisPage`がそれぞれ9〜9.5kB程度の独立チャンクに分離されたことを確認（lucide-react・i18next等ほぼ全ページ共通の依存が主要因のため、削減幅はGraphPage/WorldMapPageほど大きくない）。claude-in-chromeで、docker-composeではなくローカルMongoDBに接続したbackend＋デモアカウントで、Stats/Diagnosis/EntityDetailの3ページを実際に開き、遅延読み込み中は`LazyPageFallback`（「読み込み中...」）またはページ自身のスケルトンが表示され、その後正しくコンテンツが表示されることを確認。コンソールエラー無し。

**未解決事項**: メインバンドルの残り(lucide-react個別importが34ファイル・@animateicons/react・i18next関連)は、ページ単位のlazy化では削減しきれない。アイコンの共通化やi18nの遅延初期化などページ横断的な対応が必要になるが、影響範囲が広いため今回は見送った。

---

### 2026-08-31: RecordForm/useRecordForm/RecordFormPageの保存忘れガードにテストを追加（案Aの続き、最終バッチ）

監査で「`src/pages/*.jsx`15ファイル全てテスト無し。特に`RecordFormPage.jsx`の保存忘れガード（useBlocker）・`RecordForm.jsx`本体・`useRecordForm.js`が無テスト」と指摘されていた項目に対応した。案Aの3バッチ目で、このバッチをもって案Aの当初スコープ（High/Medium項目）は一通り完了。

**実装**:
1. `useRecordForm.test.js`（新規）: DOM非依存のフック単体テスト。`renderHook`で、初期値・`isDirty`判定・`setValue`でのエラークリア・`toggleValue`の追加削除・必須項目未入力時のバリデーション・正常系での`toApiPayload`相当のonSubmit呼び出し・二重送信防止・`fieldErrors`有無での例外処理の分岐・編集モードでの初期値組み立てを検証（11件）
2. `RecordForm.test.jsx`（新規）: `useRecordForm`と組み合わせた小さなHarnessコンポーネントで、`RecordFormPage.jsx`と同じ配線のままレンダーする統合的なコンポーネントテスト。home/cafe切り替え・Coffee Detailsの開閉・必須エラー表示・「隠れた項目のエラーで自動的に開く」（`hasHiddenError`）・送信中の表示を検証（6件）
3. `RecordFormPage.test.jsx`（新規、このリポジトリで最初のルーター込みテスト）: `useBlocker`はデータルーターでしか動かないため、`createMemoryRouter`+`RouterProvider`で`/records/new`・`/records`・`/records/:recordId`の最小構成を用意し、実際にアプリ内ナビゲーション（BackLink）を試みる形で検証。(a)変更が無ければ確認無しに遷移、(b)未保存の変更があれば確認ダイアログが出て「編集を続ける」で遷移しない、(c)「破棄する」で遷移が進む、(d)保存成功時は`justSavedRef`により確認無しに詳細ページへ遷移、の4件。`masterDataApi`/`coffeeRecordApi`はAPI層でモックし、フック自体はモックしていない

**変更ファイル**: `frontend/src/features/coffee-records/hooks/useRecordForm.test.js`（新規）、`frontend/src/features/coffee-records/components/RecordForm.test.jsx`（新規）、`frontend/src/pages/RecordFormPage.test.jsx`（新規）。プロダクションコードの変更なし。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。テスト数は68件→89件（新規21件）。既存テストへの影響なし。

**未解決事項**: 案Aの監査（2026-08-29時点）で挙がっていた他の無テストコンポーネント（`ChipMultiSelect.jsx`・`TasteRadarChart.jsx`・`GraphCanvas.jsx`等）は今回のスコープ外（`RecordFormPage`の保存忘れガードが最優先度と判断したため）。案Aはここで一区切りとし、次は案B（産地フォーカス継続）・案C（知識グラフ深掘り）・案D（面接向け仕上げ）のどれに進むかをユーザーと相談する。

**次に実装すべき最小単位**: 案B/C/Dのいずれかを選び、新機能であれば着手前に設計を相談する（CLAUDE.md「大規模変更では専用branchを作成」）。

---

### 2026-08-31: Origin Quality（産地の品質スコア）機能を追加 Phase 1: バックエンド + Entity Detail表示（`feat/origin-quality-scores`ブランチ）

ユーザーが案B（産地フォーカス機能群を続ける）を選択。具体案を相談した結果、「World Mapを品質スコアで彩色」「Entity Detailに産地の品質スコアを表示」の両方を実装する方針で合意した。既存のDiscover機能が使っているCQI参照データ（`backend/data/cqiDatabase.json`、20産地分）をそのまま再利用する。規模がSearch/Entity Detail/Stats等の過去の機能追加と同程度のため、専用branch（`feat/origin-quality-scores`）で進めた。まずバックエンド全体とEntity Detail表示（Phase 1）を実装し、World Mapの色分け（Phase 2）は次のエントリで対応する。

**設計判断**: DiscoverとOrigin Qualityは同じCQIデータを使うが、Discoverが「次に何を試すべきか」という提案なのに対し、Origin Qualityは「この産地自体の特徴」を描写するだけの別の問い（Insight/Statsの関係と同じ）。そのため`features/discover/`とは別の独立した`features/originQuality/`として実装した。一方で、両機能が共通して必要とする「CQIファイルの読み込み」「nodeIdから自分の記録経由で産地名を解決する」ロジックは重複させず、`backend/data/cqiDataset.js`・`backend/services/coffee/originLookup.js`へ共通化し、`discoverService.js`もこれを使うようリファクタした。

**実装**:
1. `backend/data/cqiDataset.js`（新規）: `discoverService.js`が持っていたCQIファイルの読み込み・キャッシュ処理を切り出し
2. `backend/services/coffee/originLookup.js`（新規）: `discoverService.js`が持っていた「nodeIdから自分の記録経由で産地名を解決する」ロジックを切り出し（`Origin.findById`のようにIDを直接Mongoへ渡さず、自分のCoffeeRecordを経由することで他ユーザーの産地・不正なIDを弾く）
3. `backend/services/coffee/discoverService.js`: 上記2つを使うようリファクタ（`getOriginDiscovery`内で`findAllForUser`を2回呼ぶことになるが、記録数がデモ規模である前提で再利用性を優先したとコメントで明記）
4. `backend/core/originQuality/originQualityBuilder.js`（新規、純粋関数）: `getQualityScoresForOrigin`（産地1件の精製方法別スコア、降順）・`getQualityScoresForAllOrigins`（産地ごとに精製方法をまたいだ単純平均、降順）
5. `backend/services/coffee/originQualityService.js`（新規）: `getOriginQuality`（nodeId→産地名解決→スコア）・`getAllOriginQualityScores`（Originマスターから`countryCode`を引いて添える）
6. `backend/controllers/originQualityController.js`・`backend/routes/originQualityRoutes.js`（新規）、`app.js`に`/api/origin-quality`を登録
7. frontend: `features/originQuality/{api,hooks,components}`（新規、`features/discover/`と同じ構成）。`OriginQualityScores.jsx`は精製方法ごとにスコア・サンプル数（n=）・簡易バー（CSS width、固定レンジ78〜90で正規化）を表示
8. `EntityDetailPage.jsx`: `detail.type === "origin"`のとき、`DiscoverSuggestions`の直前に`OriginQualityScores`を表示（「描写→提案」の順）
9. i18n: `originQuality.{heading,sampleSize,sourceNote}`をja/enへ追加
10. `docs/features.md`「Origin Quality」セクション新設、`docs/api.md`のエンドポイント一覧に追記

**データフロー**: EntityDetailPage（産地ノード）→ `GET /api/origin-quality/nodes/:nodeId` → `originLookup.js`が自分の記録からnodeIdを産地名に解決 → `originQualityBuilder.js`がCQIデータから精製方法別スコアを抽出・降順ソート → フロントが精製方法ごとにバー表示。

**変更ファイル**: 上記1〜10の全ファイル。詳細は本文参照。

**実行したテストと結果**: `cd backend && npm test`（29 test suites / 444 tests。既存432件+新規12件: `originQualityBuilder.test.js`・`originQualityApi.test.js`。既存のDiscoverテスト18件もリファクタ後に全て成功することを確認）すべて成功。`cd frontend && npm run lint && npm run test && npm run build`（89 tests、既存のまま）すべて成功。

claude-in-chromeで、docker-composeではなくローカルMongoDBに接続したbackend＋デモアカウントで確認: Ethiopia（産地）のEntity Detailページで「品質スコア」セクション（Natural/Washed/Honeyの3件、スコア・n=サンプル数・バー）が正しく表示されることを確認。Guatemala（Discoverの提案条件を満たす産地）では「品質スコア」と「まだ試していない産地」の両セクションが正しく共存して表示されることを確認。コンソールエラー無し。

**未解決事項**: World Mapの品質スコア色分け（Phase 2）は次のエントリで対応する。`GET /api/origin-quality`（一覧）は今回のPhase 1時点ではまだフロントエンドから使っていない（Phase 2で使用予定）。

---

### 2026-08-31: Origin Quality（産地の品質スコア）機能を追加 Phase 2: World Mapの品質スコア色分け（`feat/origin-quality-scores`ブランチ）

Phase 1（バックエンド + Entity Detail表示）に続き、World Mapの色分けモードを追加した。

**実装**:
1. `frontend/src/features/map/utils/qualityColor.js`（新規）: 品質スコアを4段階の固定閾値（85/84/83、CQIデータ全体の実測レンジ81.3〜86.4を踏まえた値）でアンバー系の濃淡クラスへ変換する。産地アクセントカラー（`originAccent.js`、多色パレット）とは意図的に別の色相にし、色そのもので「訪問状況」/「品質スコア」どちらのモードか一目で分かるようにした
2. `frontend/src/features/map/utils/originQualityMap.js`（新規）: `GET /api/origin-quality`のレスポンスから、`visitedOrigins.js`の`buildVisitedByNumericId`と同じ考え方でworld-atlasのnumeric IDをキーにしたMapを作る
3. `frontend/src/features/originQuality/hooks/useAllOriginQuality.js`（新規）: 一覧取得用フック
4. `WorldMap.jsx`: `colorMode`（"visited" | "quality"）・`qualityByNumericId`propを追加。塗り色の決定とクリック可否の決定を分離した（品質スコアモードでも、遷移できるのは引き続き訪問済みの産地だけ）。ツールチップも`colorMode`に応じて品質スコア/記録数を出し分ける
5. `WorldMapLegend.jsx`: `colorMode`propを追加し、モードに応じて凡例の内容（訪問状況の3色ドット vs 品質スコアの4段階グラデーション）を切り替える
6. `WorldMapPage.jsx`: `ColorModeToggle`（LanguageSwitcher.jsxと同じ見た目の2択トグル、ページローカル）を新設し、地図の直上に配置。`useAllOriginQuality`を`useGraph`とは独立にマウント時へ1回だけ取得（CQIデータはログインユーザーの記録に依存しないため）
7. i18n: `map.{colorModeAriaLabel,colorModeVisited,colorModeQuality,qualityScore,legendQualityGradient,legendQualityUnavailable}`をja/enへ追加
8. `docs/features.md`「World Map」の「表示」に色分けモードの説明を追記、「Origin Quality」の一覧APIの説明を「まだ使っていない」から実際の使用箇所へ更新

**設計判断**: 「訪れた産地一覧」（地図下部のチップ一覧）の色は、モードを切り替えても産地ごとのアクセントカラーのまま変えないことにした。品質スコアモードに合わせて一覧側も塗り替えると、「地図の色と一覧の色が常に一致する」という既存の対応が崩れて実装が複雑になる一方、一覧はそもそも「産地を識別する」役割で十分なため、単純さを優先した（docs/features.mdにも明記）。

**変更ファイル**: `frontend/src/features/map/utils/{qualityColor.js, originQualityMap.js}`（新規）、`frontend/src/features/originQuality/hooks/useAllOriginQuality.js`（新規）、`frontend/src/features/map/components/{WorldMap.jsx, WorldMapLegend.jsx}`、`frontend/src/pages/WorldMapPage.jsx`、`frontend/src/i18n/locales/{ja,en}.json`、`docs/features.md`。バックエンド変更なし（Phase 1で実装済みのAPIをそのまま使用）。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（89 tests、既存のまま）すべて成功。claude-in-chromeで、docker-composeではなくローカルMongoDBに接続したbackend＋デモアカウントで確認: (1) 既定の「訪問状況」モードが従来通り表示されることを確認、(2) 「品質スコア」に切り替えると訪問有無に関わらずCQIデータのある20産地全てにアンバー系の濃淡が付くことを確認、(3) 訪問済みのEthiopiaにホバーすると品質スコアのツールチップ（「Ethiopia 品質スコア 85.4」）が出て、クリックするとEntity Detailページへ正しく遷移することを確認、(4) 未訪問だが品質データのあるIndiaにホバーするとツールチップは出るが、クリックしても遷移しない（`/map`のまま）ことを確認、(5) 凡例が品質スコアモード用の内容（4段階グラデーション＋「品質データなし」）に切り替わることを確認。全操作でコンソールエラー無し。

**未解決事項**: 特になし。これでOrigin Quality機能（案B: 産地フォーカス機能群の続き）の当初計画分は完了。

**次に実装すべき最小単位**: 案A残り（フロントエンドの他コンポーネントへのテスト拡充）、案C（知識グラフの活用を深める）、案D（面接向け仕上げ）のいずれかをユーザーと相談して選ぶ。

---

### 2026-08-31: 案Aの続き — ChipMultiSelect/TasteRadarChart/Discover/OriginQuality/WorldMapへのテスト追加

案A（足元を固める）のうちHigh/Medium項目は既に完了済みだったため、監査で「その他の無テスト領域」として挙げていたコンポーネントのうち、比較的着手しやすいもの（`GraphCanvas.jsx`等のcanvas依存部分を除く）にテストを追加した。次は案C（知識グラフの活用を深める）に進む前段として実施。

**実装**（プロダクションコードの変更なし、テストファイルの新規追加のみ）:
1. `ChipMultiSelect.test.jsx`: 空メッセージ・チェック状態・onToggle呼び出し・disabled状態を検証
2. `tasteRadarLayout.test.js`（新規）: レーダーチャートのレイアウト計算（純粋関数）。6軸の座標生成・未評価軸が中心にプロットされること・評価値に応じた半径の位置を検証
3. `TasteRadarChart.test.jsx`: SVGは装飾用（aria-hidden）なため、実質的な内容を担う数値一覧（dl）が記録の値を正しく反映することを検証
4. `SuggestionCard.test.jsx`・`DiscoverSuggestions.test.jsx`: 文言の穴埋め・記録CTAのリンク先、「読み込み中・エラー・0件のときは何も表示しない」という方針を検証（`useOriginDiscovery`をモック）
5. `OriginQualityScores.test.jsx`（新規、Phase 1で追加した無テストコンポーネントの穴埋め）: 同じ「静かな道具」方針の検証
6. `WorldMap.test.jsx`（新規、Phase 2で追加した無テストコンポーネントの穴埋め）: 実際のworld-atlasデータ（200件超）は重いため`topojson-client`の`feature()`をモックしEthiopia/Indiaの2か国だけの最小データに差し替え。「訪問済みの国だけrole=linkになりクリックできる」「品質スコアモードでも訪問済みなら引き続きクリックできるが、未訪問国はクリックできない」「colorModeに応じてツールチップの内容（記録数 vs 品質スコア）が切り替わる」を検証

**変更ファイル**: 上記6ファイル（すべて新規テストファイル）。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`すべて成功。テスト数は89件→119件（新規30件）。

**未解決事項**: `GraphCanvas.jsx`/`NodeDetailPanel.jsx`/`RecordConnectionsDiagram.jsx`（canvas描画・物理演算がjsdomで動かない）と、`RecordFormPage`以外の14ページ（Home/Records/Stats/Diagnosis/EntityDetail等）はまだテスト対象外。案Aの範囲としては一区切りとし、次は案Cへ進む。

**次に実装すべき最小単位**: 案C（知識グラフの活用を深める）の設計相談から着手する。

---

### 2026-08-31: Similar Records（似た記録）機能を追加（案C: 知識グラフの活用を深める）

ユーザーが案C（知識グラフの活用を深める）を選択。設計相談の中で、`RecordDetailPage.jsx`に既存コメント（docs/design.mdの「関連ノード」＝1つの属性ノードに紐づく記録一覧の埋め込み案を過去に見送っていた記録）を発見し、今回の「似た記録」（記録同士の類似度）はそれとは別物であることをユーザーに確認したうえで着手した。

**設計判断**: Search/Entity Detailと同じく、`core/graph/graphBuilder.js`が導出するグラフをそのまま再利用する方針にした（Discoverが外部データ依存のため意図的にグラフから独立させているのとは対照的に、Similar Recordsは外部データを持たずグラフの構造だけで完結するため）。既存の`findRecordIdsConnectedToNode`（属性ノード→それにつながる記録ID）をそのまま呼び出し、対象記録の各属性ノードについて呼び出した結果を集計するだけで実装できた（新しいグラフ照会ロジックを増やさずに済んだ）。

**実装**:
1. `backend/utils/textExcerpt.js`（新規）: `graphService.js`だけが持っていた`excerptNotes`を共通化（`similarRecordsService.js`でも同じ用途で必要になったため）
2. `backend/core/similarRecords/similarRecordsBuilder.js`（新規、純粋関数）: `buildSimilarRecords(records, targetRecordId)`。対象記録の属性ノードごとに`findRecordIdsConnectedToNode`を呼び、共有数を集計。閾値（2件未満は除外）・並び順（共有数降順、同数ならrating降順）・上限（5件）はInsight/Discoverと同じ考え方
3. `backend/services/coffee/similarRecordsService.js`・`backend/controllers/similarRecordsController.js`・`backend/routes/similarRecordsRoutes.js`（新規）、`app.js`に`/api/similar-records`を登録
4. frontend: `features/similarRecords/{api,hooks,components}`（新規、`features/discover/`と同じ構成）。`SimilarRecords.jsx`は各候補を記録名・日付・評価・共有属性のチップ（「なぜ似ているか」を明示、docs/product.md「Discovery Must Be Actionable」）で表示し、`/records/:id`へのLinkにする
5. `RecordDetailPage.jsx`: 「つながり」セクションの直後に`SimilarRecords`を配置。既存のhasCoffeeInfo等のゲートの外に置き、コンポーネント自身が空なら何も描画しない設計にした（親側で余白を確保すると空の余白が残るため、`mt-6`はコンポーネント自身が持つ）。過去の「関連ノード見送り」コメントに、今回追加した機能との違いを追記した
6. `src/test/setup.js`: jsdomに`IntersectionObserver`が無くテストが落ちていたため、最小限のモック実装を追加（`useReveal`を使うコンポーネント全般に影響する、このリポジトリで最初にこの問題を踏んだテスト）
7. i18n: `similarRecords.heading`をja/enへ追加
8. `docs/features.md`「Similar Records」セクション新設、`docs/api.md`のエンドポイント一覧に追記

**データフロー**: RecordDetailPage → `GET /api/similar-records/:recordId` → 自分の記録からグラフを構築 → 対象記録の属性ノードそれぞれについて`findRecordIdsConnectedToNode`で接続記録IDを集める → 記録IDごとに出現回数（共有数）を集計 → 閾値以上のものを共有数順にソートし上位5件を返す。

**変更ファイル**: `backend/utils/textExcerpt.js`（新規）、`backend/core/similarRecords/similarRecordsBuilder.js`（新規）、`backend/services/coffee/{similarRecordsService.js（新規）, graphService.js}`、`backend/controllers/similarRecordsController.js`（新規）、`backend/routes/similarRecordsRoutes.js`（新規）、`backend/app.js`、`backend/tests/{similarRecordsBuilder.test.js, similarRecordsApi.test.js}`（新規）、`frontend/src/features/similarRecords/`配下（新規）、`frontend/src/pages/RecordDetailPage.jsx`、`frontend/src/i18n/locales/{ja,en}.json`、`frontend/src/test/setup.js`、`docs/features.md`、`docs/api.md`。

**実行したテストと結果**: `cd backend && npm test`（31 test suites / 457 tests。既存444件+新規13件）すべて成功。`cd frontend && npm run lint && npm run test && npm run build`（123 tests、既存89件+新規4件）すべて成功。

claude-in-chromeで、docker-composeではなくローカルMongoDBに接続したbackend＋デモアカウントで確認: 「Guatemala Huehuetenango」（Washed・Medium・Nutty・Caramel）の記録詳細で「似た記録」に「Colombia Huila」（4件共有）・「Guatemala Antigua」（3件共有）が共有数順に表示されることを確認。「Colombia Huila」側からも対称的に「Guatemala Huehuetenango」が候補に出ることを確認（双方向の関係として機能している）。候補のクリックで正しく該当記録の詳細ページへ遷移することを確認。コンソールエラー無し。

**未解決事項**: 特になし。これで案C（知識グラフの活用を深める）の当初計画分は完了。

**次に実装すべき最小単位**: 案D（面接向け仕上げ）に進む、または今回のブランチ群（`feat/origin-quality-scores`に積み上がった案B・案A続き・案Cのコミット）をmainへマージする。

---

### 2026-08-31: 面接向け仕上げ（案D） — 死んだコード削除・非推奨API修正・アクセシビリティ

ユーザーが案D（面接向け仕上げ）を選択。README/DEPLOYMENT.md/CIは既に充実していることが8/29〜31の監査で分かっていたため、残っていた具体的な指摘事項（非推奨API・死んだコード・アクセシビリティ）を中心に対応した。

**App.cssの調査で判明した新事実**: 死んだコンポーネント`PageHeader.jsx`を削除する前に、対応する`App.css`の未参照範囲を確認する目的で、App.css（当時8,930行）の全クラスセレクタとJSX側の実際のクラス使用箇所を機械的に突き合わせたところ、847個のトップレベルセレクタのうち801個が未使用の可能性があるという、これまで把握していた規模（460行・1箇所）をはるかに超える残存が判明した。ただしテンプレートリテラルで動的に組み立てるクラス名（例:`` `toast toast--${type}` ``）は文字列照合では検出できず誤って未使用判定されるリスクがあるため、801件の一括削除は行わず、`docs/mlb-legacy-inventory.md`・`IMPLEMENTATION.md`の未解決事項へ正確な状況として記録するに留めた（専用タスクとして別途進める）。

**実装**:
1. `backend/controllers/userController.js`: `updateProfile`の`findByIdAndUpdate`が使う非推奨の`new`オプションを`returnDocument: "after"`へ置き換え（Mongooseの非推奨警告を解消）
2. `fastapi-service/main.py`: ハードコードされていたCORS設定を削除。docs/architecture.mdの通りこのサービスはExpressからのサーバー間通信のみで呼ばれ、ブラウザが直接叩く経路が無い（CORSはブラウザだけが強制する仕組み）ため、意味を持たない設定だった。理由をコメントで明記した
3. `frontend/src/components/PageHeader.jsx`（削除）: どのページからも使われていない死んだコンポーネント。専用の`App.css`ブロック（`.page-header*` `.app-screen` `.screen-body` `.thr-wl` `.thr-sub` `.page-tab*`等、約145行）も、このコンポーネント以外からの参照が無いことを確認したうえであわせて削除
4. `frontend/src/features/coffee-records/components/ConfirmDialog.jsx`: 閉じたときに、開く前にフォーカスがあった要素（「…」メニューの削除項目等）へフォーカスを戻すようにした（`triggerElementRef`で`document.activeElement`を開く直前に記録し、クリーンアップ時に復元）。これが無いと、キーボード操作だけのユーザーはダイアログが消えた瞬間フォーカスが行方不明になっていた
5. `docs/mlb-legacy-inventory.md`・`IMPLEMENTATION.md`の未解決事項・次に実装すべき最小単位を、今回対応済みの項目を除き、App.cssの新事実を反映して整理

**変更ファイル**: `backend/controllers/userController.js`、`fastapi-service/main.py`、`frontend/src/components/PageHeader.jsx`（削除）、`frontend/src/App.css`、`frontend/src/features/coffee-records/components/{ConfirmDialog.jsx, ConfirmDialog.test.jsx}`、`docs/mlb-legacy-inventory.md`。

**実行したテストと結果**: `cd backend && npm test`（457 tests、既存のまま）すべて成功（`new`オプション非推奨警告が出なくなったことを確認）。`fastapi-service`は既存の`.venv`がmlb-app時代のパスを内部に持ち`pytest`が壊れていた（本セッションの変更とは無関係な環境要因）ため、一時的にクリーンな venv を作って`pytest`を実行し1件成功を確認（一時venvは削除済み）。`cd frontend && npm run lint && npm run test && npm run build`（124 tests、既存123件+新規1件: ConfirmDialogのフォーカス復元テスト）すべて成功。

**未解決事項**: Navbarのアクティブなナビ項目の状態表現は背景色（`bg-surface-2`というpill形状）で示しており、色相だけに依存しないため今回は変更不要と判断した。World Mapの色分けトグル・`OriginQualityScores`・`SimilarRecords`のモバイル幅での実機確認は、claude-in-chromeの`resize_window`がこの環境で実際のビューポートに反映されない制約のため実施できなかった（次に実装すべき最小単位に記載）。App.cssの残り約800件の未使用セレクタ整理も引き続き未対応。

**次に実装すべき最小単位**: 上記未解決事項を参照。あるいは今回のブランチ群（`feat/origin-quality-scores`）をmainへマージする。

---

### 2026-08-31: 高度な記録フィルター・検索の併用・関連属性の「全部見る」（`feat/advanced-record-filters`ブランチ）

ユーザーから「各ノードタイプを一覧表示できるページを追加したい」という提案を受けた。既存機能（Graph画面のノードタイプフィルター、Statsの上位ランキング）と重なりが大きく、過去にDiscoverの一覧専用ページを実データ検証の末に削除した前例（docs/features.md「Discover」参照）もあるため、新規ページの追加ではなく、既存の「全部見る手段が無い」という未解決事項（Entity Detail・Search）を解消する方向を提案し合意を得た。あわせてユーザーから「複数条件検索機能がありません」という指摘を受け、内容を確認したところ以下3点と判明した:
1. 検索ボックスとフィルターの併用ができない（検索中はフィルターUIごと非表示）
2. 産地・フレーバーが1つしか選べない（複数選択不可）
3. フィルター項目が産地・フレーバー・評価・home/cafeのみ（精製方法・品種・焙煎度・期間が無い）

規模が大きいため専用branch（`feat/advanced-record-filters`）で、5つのフェーズ（フィルター項目拡充→複数選択→検索との併用→Entity Detail全部見る→Search上限）に分けて実装した。

**設計判断**:
- `recordFilterValidator.js`のクエリパラメータを単数形（`originId`/`flavorId`）から複数形（`originIds`等）へ改名し、カンマ区切りのID列を受け取れるようにした。単一値なら等価条件、複数値なら`$in`条件に変換する（呼び出し元はRecordsPage.jsxのみで、他ページからの深いリンクへの影響が無いことを確認済み）
- 検索ボックスとフィルターの併用は、横断検索API（`searchService.js`）に`recordFilterValidator.js`をそのまま通し、`coffeeRecordRepository.findAllForUser(userId, recordFilter)`へ渡すことで実現した。Discoverとは異なりグラフ生成ロジックを一切変更しない、Search/Entity Detailと同じ「グラフをそのまま再利用する」路線を踏襲
- Entity Detailの関連属性は種別ごと5件上限を撤廃し、フロントエンド（`RelatedAttributeGroup`）側で「最初5件+もっと見るボタンで展開」に変更した（追加のAPIリクエストは発生しない）
- Search結果の属性一覧には新たに20件の上限を設け、超過時は`entitiesTruncated: true`を返す（`MAX_LIMIT`等、既存の上限設計と同じ考え方）
- RecordFilters.jsxは、5つの複数選択（産地・品種・精製方法・焙煎度・フレーバー）+期間を、RecordForm.jsxの「Coffee Details」と同じ段階的開示（初期状態は閉じる、アクティブなら開いた状態で始まる）の「詳細フィルター」パネルへまとめた。recordType・評価・検索ボックスは利用頻度が高いため常時表示のまま

**実装**:
1. `backend/utils/escapeRegExp.js`（新規）: `masterDataRepository.js`だけが持っていた正規表現エスケープ処理を共通化（`recordFilterValidator.js`のtitleフィルターでも必要になったため）
2. `backend/validators/recordFilterValidator.js`: 産地・品種・精製方法・焙煎度・フレーバーの複数選択（`$in`）・titleの部分一致検索を追加
3. `backend/controllers/searchController.js`・`backend/services/coffee/searchService.js`: `recordFilterValidator.js`を通したフィルターを受け取り、`findAllForUser`へ渡すよう変更
4. `backend/core/graph/entityDetailBuilder.js`: 関連属性の種別ごと5件上限（`MAX_RELATED_PER_TYPE`）を撤廃
5. `backend/core/search/searchBuilder.js`: `entities`に20件の上限（`MAX_ENTITIES`）と`entitiesTruncated`フラグを追加
6. frontend: `RecordFilters.jsx`を全面改修（5つの複数選択+期間を「詳細フィルター」パネルへ、`ChipMultiSelect`を再利用）。`RecordsPage.jsx`の`DEFAULT_FILTERS`を配列ベースへ変更し、検索中もフィルターUIを表示したままにした。`useSearch.js`・`searchApi.js`がfiltersを受け取り横断検索へ渡すよう変更。`SearchResults.jsx`が`entitiesTruncated`の案内文を表示。`EntityDetailPage.jsx`の`RelatedAttributeGroup`に「もっと見る」展開ボタンを追加
7. `docs/features.md`「Entity Detail」「Search」を更新

**データフロー**: RecordsPage → 検索ボックス入力 + アクティブなフィルター（`filters`） → `useSearch`が両方を`GET /api/search`へ渡す → `searchController.js`が`recordFilterValidator.js`でフィルターを検証 → `searchService.js`が`findAllForUser(userId, filter)`でフィルター済みの記録だけを取得 → `searchBuilder.js`がその範囲内でグラフを構築し検索。Entity Detail → `entityDetailBuilder.js`が関連属性を全件返す → `RelatedAttributeGroup`が最初5件だけ描画し「もっと見る」で残りを展開。

**変更ファイル**: `backend/utils/escapeRegExp.js`（新規）、`backend/validators/recordFilterValidator.js`、`backend/repositories/masterDataRepository.js`、`backend/controllers/searchController.js`、`backend/services/coffee/searchService.js`、`backend/core/graph/entityDetailBuilder.js`、`backend/core/search/searchBuilder.js`、`backend/tests/{coffeeRecordQueryValidator.test.js, graphQueryValidator.test.js, coffeeRecordApi.test.js, searchApi.test.js, searchBuilder.test.js, entityDetailBuilder.test.js}`、`frontend/src/features/coffee-records/components/{RecordFilters.jsx, RecordFilters.test.jsx}`（新規テスト）、`frontend/src/pages/{RecordsPage.jsx, EntityDetailPage.jsx}`、`frontend/src/features/search/{hooks/useSearch.js, api/searchApi.js, components/SearchResults.jsx, components/SearchResults.test.jsx}`（新規テスト）、`frontend/src/i18n/locales/{ja,en}.json`、`docs/features.md`。

**実行したテストと結果**: `cd backend && npm test`（31 test suites / 471 tests。既存457件+新規14件）すべて成功。`cd frontend && npm run lint && npm run test && npm run build`（134 tests、既存124件+新規10件: RecordFilters 7件・SearchResults 3件）すべて成功。

claude-in-chromeで、docker-composeではなくローカルMongoDBに接続したbackend＋デモアカウントで確認: (1) 詳細フィルターパネルの開閉、(2) 産地をPanama・Burundiの2つ選択すると`$in`条件でOR検索され「% Arabica - Panama Geisha」1件だけが表示されること、(3) その状態で検索ボックスに「geisha」と入力すると、フィルターUIが表示されたまま、フィルター範囲内（Panama/Burundi）でヒットする属性（Geisha品種）と記録名一致が両方表示されること（検索+フィルター併用）、(4) Washed（精製方法、9件の記録）のEntity Detailページで、フレーバーが8件を超えたときに「他8件を見る」ボタンが表示され、クリックで全13件が展開されること、を確認。全操作でコンソールエラー無し。

**未解決事項**: モバイル幅での実機確認は、claude-in-chromeの`resize_window`がこの環境で反映されない制約のため未実施（既存の未解決事項と同じ制約）。「絞り込みを解除」ボタンの動作は単体テストのみで確認し、ブラウザでの実機確認はしていない。

**次に実装すべき最小単位**: `feat/advanced-record-filters`ブランチをmainへマージする。

---

### 2026-08-31: 設計レビューで見つかった10項目の改善（`chore/design-review-improvements`ブランチ）

ユーザーから「このアプリの設計における改善点をいくつかの項目に分けて洗い出してほしい」と依頼され、backend・frontend・横断領域（docs整合性・API設計・テスト・セキュリティ・スケーラビリティ）の3方向から調査した。その後「まとめて実装してください」との指示を受け、優先度の高い10項目をこのブランチで一括実装した。JWTリフレッシュ機構の新設・`App.css`全801セレクタの一括削除・知識グラフのキャッシュ導入・全エンドポイントへのレート制限拡大・GraphCanvasの完全なキーボード操作対応の5項目は、CLAUDE.mdの「動作している認証を不要に書き換えない」「過度な抽象化を避ける」方針や、既知の誤検出リスクを踏まえて明示的にスコープ外とし、着手前にユーザーへ理由とともに説明した。

**実装内容**（10項目）:
1. docsの記載修正: `docs/mlb-legacy-inventory.md`（`SearchInput.jsx`/`apiError.js`が実際は削除済みだったのに「再利用した」と誤記載されていた点を修正）、`backend/.env.example`（`FASTAPI_URL`が未使用である旨明記）、`backend/middleware/errorHandler.js`（存在しないdocs節への参照を修正）、`docs/api.md`（エラーレスポンス形式・409/403の説明を追加）
2. 認証まわり（`authController.js`/`userController.js`）をrepository層経由（`userRepository.js`新規）・共通エラー形式（AppError/errorHandler）へ統一。あわせて「現在のパスワードが違う」の応答を401→400（`INVALID_CURRENT_PASSWORD`）へ変更し、フロントの共通クライアント（`apiRequest`）が誤って自動ログアウトしないようにした。フロント側`authApi.js`/`userApi.js`/`errorMessage.js`/`useProfile.js`/`ProfilePage.jsx`/`HomePage.jsx`も連動して更新（`HomePage.jsx`は`useProfile`フックを使わず直接APIを呼んでいた重複も解消）
3. `originQualityService.js`をmasterDataRepository経由（`findByNames`新規）に統一
4. バックエンドの重複ロジックを`core/shared/aggregationHelpers.js`（新規）へ集約: `average`/`roundTo1`（entityDetailBuilder/statsBuilder/insightBuilderの3箇所で重複）、`pickTop`（「最多のものを選ぶ、同率首位は断定しない」というinsightBuilder/diagnosisBuilder/discoverBuilderで重複していたロジック）
5. フロントエンドの重複していた「空状態」表示を`components/EmptyState.jsx`（新規）へ集約（RecordsEmptyState/StatsEmptyState/GraphEmptyState/NoMatchState/ErrorState系）
6. アクセシビリティ: `hooks/useFocusTrap.js`（新規、ConfirmDialog.jsxのパターンを共通化）を使い、Navbarモバイルドロワー（Escape・フォーカストラップ・`inert`属性）とNodeDetailPanel（Escape・開いたときのフォーカス移動）を修正。GraphCanvasには`role="img"`+ノード/エッジ数を含むaria-labelを追加
7. `/api/graph`のレスポンスを他エンドポイントと同じ`{data: ...}`形式へ統一（フロント`graphApi.js`の個別吸収コードを解消）
8. 確認済みの未使用CSS（旧MLBの`.home-player-section`等4セレクタ+関連2ブロック、計約110行）を`App.css`から削除
9. WorldMapのbundleサイズ削減: `world-atlas`のtopojsonを50m解像度（756KB）→110m解像度（108KB）へ切り替え（国単位のハイライト表示にしか使わないため精度は不要）
10. 不足していたテストを追加: backend（`escapeRegExp`/`textExcerpt`/`AppError`/`recordFilterValidator`、計38件）、frontend（`recordFormat`/`errorMessage`/`authFormValidation`/`ProtectedRoute`/`AppErrorBoundary`/`recordConnectionsLayout`、計50件）

**明示的にスコープ外とした項目**（理由付き）:
- JWTリフレッシュ・失効機構の新設: 設計の改善ではなく新機能追加であり、「動作している認証を不要に書き換えない」方針に抵触する規模
- `App.css`の残り約800件の未使用セレクタの一括削除: テンプレートリテラルによる動的クラス名の誤検出リスクが既知（`toast--*`系5クラスで実例あり）のため、個別確認しながら進める専用タスクとして残す
- 知識グラフのキャッシュ・ページネーション導入: アーキテクチャ変更を伴う規模のため見送り、`docs/database.md`の「MVPレベルなら毎回計算しても問題ない」という前提を維持
- 全エンドポイントへのレート制限拡大: 閾値設計が必要な意思決定であり、MVP規模では許容範囲と判断
- GraphCanvasの完全なキーボード操作対応（ノード間移動）: 大規模機能追加になるため、aria-labelによる説明追加のみに留めた

**データフロー**: 認証: LoginPage/RegisterPage → `authApi.js`（生fetch、エラー形式のみ更新）→ `POST /api/auth/{login,register}` → `authController.js` → `userRepository.js` → `User`モデル。プロフィール: ProfilePage → `userApi.js`（`apiRequest`経由に統一）→ `/api/users/*` → `userController.js` → `userRepository.js`/`coffeeRecordRepository.js`。

**変更ファイル**: backend（`app.js`, `.env.example`, `controllers/{authController,userController,graphController}.js`, `middleware/errorHandler.js`, `utils/AppError.js`, `validators/{authValidator,userValidator(新規)}.js`, `repositories/{userRepository(新規),masterDataRepository,coffeeRecordRepository}.js`, `services/coffee/originQualityService.js`, `core/shared/aggregationHelpers.js(新規)`, `core/{insights/insightBuilder,diagnosis/diagnosisBuilder,discover/discoverBuilder,graph/entityDetailBuilder,stats/statsBuilder}.js`, `tests/{app,authController,userController,graphApi}.test.js`＋新規テスト4件）、frontend（`components/{Navbar,EmptyState(新規),ProtectedRoute(新規テスト),AppErrorBoundary(新規テスト)}.jsx`, `hooks/useFocusTrap.js(新規)`, `features/graph/{api/graphApi.js,components/{GraphCanvas,NodeDetailPanel}.jsx,utils/recordConnectionsLayout.test.js(新規)}`, `features/coffee-records/{components/RecordListStates.jsx,utils/recordFormat.test.js(新規)}`, `features/stats/components/StatsEmptyState.jsx`, `features/profile/hooks/useProfile.js`, `features/map/{components/WorldMap.jsx,utils/countryCodes.js}`, `services/api/{authApi,userApi}.js`, `utils/{errorMessage.js,errorMessage.test.js(新規),authFormValidation.test.js(新規)}`, `pages/{HomePage,ProfilePage}.jsx`, `App.css`, `i18n/locales/{ja,en}.json`）、docs（`api.md`, `features.md`, `mlb-legacy-inventory.md`）。削除: `frontend/src/components/SearchInput.jsx`, `frontend/src/services/api/apiError.js`。

**実行したテストと結果**: `cd backend && npm test`（35 test suites / 509 tests。既存471件+新規38件）すべて成功。`cd frontend && npm run lint && npm run test && npm run build`（184 tests、既存134件+新規50件）すべて成功、buildも成功（WorldMapPageのchunkが789.89kB→141.23kBへ縮小し、bundle size警告から外れた）。

claude-in-chromeで、ローカルbackend＋デモアカウントで確認: (1) ログイン失敗時に「メールアドレスまたはパスワードが正しくありません」が表示されること、(2) プロフィール画面で現在のパスワードを間違えても401ではなく400になり自動ログアウトされないこと（「現在のパスワードが正しくありません」トースト表示、ページ遷移なし）、(3) 正しいパスワードでの変更成功、(4) 登録済みメールアドレスでの新規登録が「すでに登録されています」と表示されること（409）、(5) Records/Graph/Statsページの空状態・EmptyStateコンポーネントの表示、(6) Navbarモバイルドロワーのフォーカストラップ（`display:none`を一時的に外して検証: 開くと最初の要素へフォーカス移動、Tabで循環、Escapeで閉じてハンバーガーボタンへフォーカス復帰）、(7) NodeDetailPanel（ノード選択で閉じるボタンへフォーカス移動、Escapeで閉じる）、(8) GraphCanvasのaria-label（ノード数・つながり数を含む）、(9) `/api/graph`のレスポンス形式変更後もGraph・World Mapページが正常動作、(10) World Mapの110m解像度への切り替え後も訪問状況・品質スコアの2モードとも正常表示、を確認。全操作でコンソールエラー無し。

**未解決事項**: 上記「明示的にスコープ外とした項目」を参照。

**追記（同日、モバイル幅の実機確認）**: `resize_window`が引き続きこの環境で実際のビューポートに反映されない（`window.innerWidth`が変わらない）ため、iframeを使う代替手法を導入した。ページ内にwidth:390px/height:844pxのiframeを注入すると、iframe自身の`contentWindow.innerWidth`は実際に386px前後になり、Tailwindの`md:`等のメディアクエリも本物のモバイル幅として評価される（実ビューポートリサイズの代わりとして有効。以後のセッションでも再利用できる）。この手法で確認した内容: (1) Home/Records/Graph/World Mapの各ページがモバイルレイアウト（ハンバーガー+下部タブバー、フィルターの縦積み、地図の1カラム表示）で正しく描画されること、(2) Navbarモバイルドロワーを開くと最初の要素（ロゴリンク）へ実際にフォーカスが移動し、Escapeで閉じてhamburgerボタンのaria-expandedがfalseに戻ること（`display:none`のJS上書きなしで確認）、(3) NodeDetailPanelのbottom sheetがGraph画面下部に正しく表示され、開くと閉じるボタンへフォーカスが移動し、Escapeで閉じること、(4) Recordsページの「詳細フィルター」パネルがモバイル幅でも1カラムに積み上がり操作可能なこと。いずれも問題なし。

**次に実装すべき最小単位**: `chore/design-review-improvements`ブランチをmainへマージする。

---

### 2026-08-31: Graph画面の期間フィルター・Discoverの産地事前入力（`chore/design-review-improvements`ブランチ継続）

ユーザーから「他の未解決事項を優先順位の高いものから、順に進めていきます」と依頼され、`次に実装すべき最小単位`の上位2件に着手した。同じ設計レビューの一連の作業のため、新規ブランチは切らず`chore/design-review-improvements`を継続利用している。

**実装内容**:
1. **Graph画面の期間フィルター**: `dateFrom`/`dateTo`はAPI・`recordFilterValidator.js`側にはすでに実装済みだったが、UI（`GraphFilters.jsx`）に無かった。`RecordFilters.jsx`と同じ`<input type="date">`2つ（`records.dateFrom`/`records.dateTo`の既存i18nキーを流用、新規キー追加なし）を追加し、`GraphPage.jsx`の`DEFAULT_FILTERS`・`hasActiveFilters`にも反映した。`useGraph.js`/`fetchGraph`はfiltersオブジェクトをそのまま透過するだけの設計だったため、これらのファイル自体の変更は不要だった。
2. **Discoverの産地事前入力**: `SuggestionCard.jsx`の「この産地を記録してみる」リンクを`/records/new?originName=<産地名>`へ変更（CQI参照データ由来の`suggestedOrigin`はOriginマスターのIDを持たず`label`のみのため、名前で渡す）。`RecordFormPage.jsx`がこのクエリを`masterData.origins`と突き合わせて`originId`へ解決し、`useRecordForm.js`の新しい第3引数`prefillOriginId`経由でフォームへ反映する。

   実装中に副作用として、`RecordForm.jsx`の「コーヒーの詳細」パネルが自動で開かない問題を発見した。パネルの初期開閉状態は`useState`の遅延初期化（マウント時1回だけ）で決まるが、`prefillOriginId`はmasterData読み込み待ちで初回レンダーより後に届くため、開閉判定のタイミングに間に合っていなかった。当初`hasExistingCoffeeDetails(values)`の値そのものを監視して自動的に開く実装にしたところ、既存テスト「Coffee Detailsを開いていなくても、隠れた項目にエラーがあれば自動的に開く」を壊した（値がある＝即座に開く、ではなく「エラーがあるときだけ開く」というRecord First由来の既存方針と衝突したため）。`prefillOriginId`という明示的な信号だけを監視する形に設計し直し、両方のテストが共存できるようにした。

**データフロー**: SuggestionCard（Entity Detailページ）→ `/records/new?originName=Costa%20Rica` → RecordFormPage.jsxがmasterData.originsから該当origin.idを検索 → useRecordForm(record, onSubmit, prefillOriginId) → values.originIdへ反映、同時にisDirtyを汚さないようinitialValuesも更新 → RecordForm.jsxがprefillOriginIdの到着を検知しCoffee Detailsパネルを自動的に開く。

**変更ファイル**: `frontend/src/features/graph/components/{GraphFilters.jsx, GraphFilters.test.jsx(新規)}`, `frontend/src/pages/GraphPage.jsx`, `frontend/src/features/discover/components/{SuggestionCard.jsx, SuggestionCard.test.jsx}`, `frontend/src/pages/RecordFormPage.jsx`, `frontend/src/features/coffee-records/{hooks/useRecordForm.js, hooks/useRecordForm.test.js, components/RecordForm.jsx, components/RecordForm.test.jsx}`。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（196 tests、既存184件+新規12件: GraphFilters 6件・useRecordForm prefill関連5件・RecordForm prefill 1件）すべて成功。

claude-in-chromeで、ローカルbackend＋デモアカウントで確認: (1) Graph画面で開始日を入力すると実際にノード数が絞り込まれること、(2) Home画面のDiscoverカード→Entity Detail（Guatemala）→「この産地を記録してみる」→ `/records/new?originName=Costa%20Rica`へ遷移し、コーヒーの詳細パネルが自動で開いた状態で産地に「Costa Rica」が選択済みになっていること、を確認。

**未解決事項**: 特になし。

**次に実装すべき最小単位**: `次に実装すべき最小単位`リストの続き（App.css残り約800件の整理、フロントエンドのテスト拡充等）に進む。あるいは`chore/design-review-improvements`ブランチをmainへマージする。

---

### 2026-09-01: App.cssの未使用MLBレガシーCSSを大規模に削除（`chore/design-review-improvements`ブランチ継続）

`次に実装すべき最小単位`の最上位項目（App.cssに残る約800件の未使用セレクタの整理）に着手した。まず専用フォーク（サブエージェント）に安全な削除作業を委任したが、セッション全体のレート制限により作業開始直後に失敗した（実際の削除は発生しておらず、以前のセッションの差分が再表示されただけと確認済み）。レート制限解除後、同じ方針で自分自身が直接作業を継続した。

**方法**:
1. `App.css`の全トップレベルセレクタ（823個のクラス）を、括弧の深さを追跡する自前のパーサーで抽出した。
2. `frontend/src`配下の全`.jsx`/`.js`ファイルを1つに連結し、各クラス名がリテラル文字列としてどこかに出現するかを高速に判定した（正規表現の逐次grepではなくメモリ上の部分文字列検索。800件規模でも数秒で完了）。
3. 動的にクラス名を組み立てるパターン（`className={\`...\`}`のテンプレートリテラル）をすべて洗い出し、`toast toast--${type}`という唯一の「プレフィックス+動的サフィックス」パターンを確認した。このパターンにより`.toast--success`等4クラスが誤って「未使用」判定されることを事前に把握し、削除対象から除外した（2026-08の監査で最初に見つかった既知の誤検出パターンと同一）。
4. 823クラス中783クラスが「どこにも参照されていない」と判定された（誤検出の4クラスを除く779クラスを削除対象の候補とした）。
5. `App.css`をCSSルール単位（コンマ区切りセレクタ・`@media`内外を区別）で再パースし、各ルールに含まれるすべてのクラストークンが「未使用」判定リストに含まれる場合のみ、そのルール全体を削除対象にした。`.player-detail .stats`や`.discovery-cta-btn.secondary`のように、未使用クラスと汎用的な修飾子クラス（`active`/`secondary`等、他の場所で偶然「使用中」と判定されている語）が組み合わさったセレクタは、判断に迷うため削除せず残した（1036ルールを削除、93ルールは判断を保留、36ルールは要素セレクタ等でクラスを持たないため対象外）。
6. 削除後に空になった`@media`/`@supports`ブロックと、その直前にあった対応する見出しコメントを17件除去した。

**結果**: `App.css`は8,692行→1,368行（84.3%削減）。トップレベルクラスは823個→59個（40個は生きているUI、19個は上記の「判断を保留」により残存）。

**検証**:
- `npm run lint` / `npm run test`（196件） / `npm run build`はすべて成功。CSSバンドルは64KB（Tailwind分含む）まで縮小。
- CLAUDE.mdの「For UI or frontend changes...use the feature in a browser」に従い、claude-in-chromeでログイン前後の全主要画面を目視確認した: Landing、Login、Register、Home、Records、RecordDetail（Connections図・Similar records含む）、RecordForm（新規作成）、Graph（新設の期間フィルター含む）、Stats、Diagnosis、WorldMap、Profile、EntityDetail。いずれも視覚的な崩れは見つからなかった。

**未解決事項**:
- 残り59クラス（40件の生きているクラス+19件の判断保留クラス）は未対応のまま。判断保留の19件は、`.player-detail`や`.discovery-cta-btn`のように基底クラス自体は確実に死んでいるが、コンマ・修飾子で汎用的な語（`active`/`secondary`等）と組み合わさっているために機械判定で安全側に倒した結果であり、個別に目視確認すれば大半はさらに削除できる可能性が高い。
- `:root`内の`--ctp-mauve`等6個のCSS変数は、今回残した`.discovery-cta-btn.secondary`ルールだけから参照されている（他に参照箇所なし）。そのルール自体を将来削除すれば、これらの変数も同時に不要になる。
- `docs/mlb-legacy-inventory.md`の該当箇所を更新済み（下記変更ファイル参照）。

**次に実装すべき最小単位**: 残り59クラス（特に19件の判断保留分）を個別に目視確認しながら削除するか、この規模まで縮小されたため「未解決事項」からは外し、必要に応じて随時整理する運用に切り替える。

---

### 2026-09-01: フロントエンドの未テストのコンポーネント・ページにテストを追加（`chore/design-review-improvements`ブランチ継続）

`次に実装すべき最小単位`にあった「フロントエンドのテストをHome/Records/Stats/Diagnosis/EntityDetail等のページへ広げる」に着手した。ロジックを持たない純粋な骨格・装飾コンポーネント（ローディングスケルトン各種、`CoffeeLogo`/`GraphLegend`/`WorldMapLegend`/`BackLink`/`BottomTabBar`/`LandingPage`/`NotFoundPage`/`GraphIllustration`）と、canvas描画+物理演算でjsdomでは検証できない`GraphCanvas.jsx`本体は対象外とし、それ以外の「実際にロジックや条件分岐を持つ」コンポーネント・ページに絞ってテストを追加した。

**追加したテストファイル**（20ファイル、119件、すべて個別実行で合格を確認）:
- コンポーネント9件: `EmptyState`(8) `Navbar`(6) `NodeDetailPanel`(7) `RecordConnectionsDiagram`(5) `GraphNodeSearch`(7) `RatingInput`(6) `FormField`(6) `RecordCard`(8) `HomeRecordCard`(6)
- ページ11件: `LoginPage`(4) `RegisterPage`(3) `ProfilePage`(7) `HomePage`(6) `RecordsPage`(5) `StatsPage`(4) `DiagnosisPage`(5) `EntityDetailPage`(8) `GraphPage`(7) `WorldMapPage`(4) `RecordDetailPage`(7)

**方針**:
- APIモジュール（`services/api/*`・各featureの`api/*Api.js`）を`vi.mock`で直接差し替える（既存の`RecordFormPage.test.jsx`の慣例に合わせた。hookをモックする方式は採らない）。
- `GraphCanvas.jsx`（canvas+物理演算）・`WorldMap.jsx`（d3-geo/topojson、別途`WorldMap.test.jsx`で検証済み）・`SimilarRecords.jsx`（別途`SimilarRecords.test.jsx`で検証済み）・`OriginQualityScores`/`DiscoverSuggestions`（産地ノード時のみ描画される独立機能）は、ページのテストではスタブに差し替えた。
- テスト環境のi18nは`"ja"`固定のため、テキストの検証は毎回`src/i18n/locales/ja.json`の実際の文言を確認してから書いた（過去に何度も推測で外した反省を踏襲）。

**見つかった問題（すべて production コードではなく、このセッションで書いたテストの側の誤り）**:
- `DiagnosisPage.test.jsx`作成時、`homeVsCafe: null`というテスト用フィクスチャで`HomeVsCafeCard.jsx`がクラッシュした。`backend/core/stats/statsBuilder.js`の`buildHomeVsCafe`を確認したところ、記録0件でも常に`{home, cafe}`オブジェクトを返す（nullにはならない）実装だったため、非現実的なフィクスチャが原因と判明。フィクスチャを実際のAPIレスポンス形に合わせて修正した（本番コードは変更していない）。

**検証**:
- `npm run test`: 47ファイル / 315件、全件成功（このセッション追加分を含む）。
- `npm run lint`: 成功（テスト追加の過程で発生した未使用importのlintエラー2件`Navbar.test.jsx`の`vi`・`GraphPage.test.jsx`の`waitFor`も本エントリ内で修正済み）。
- `npm run build`: 成功（チャンクサイズ警告は既知・未解決事項の9番と同じ既存事象で今回変更なし）。

**未解決事項**: Tier 3として当初リストアップした表示専用の集計・検索系コンポーネント（`OverviewStats`/`RatingDistributionChart`/`TopRankingList`/`CollectionStats`/`MonthlyTrendChart`/`HomeVsCafeCard`/`DiscoverCard`/`ArchetypeCard`/`InsightList`/`SearchBox`/`EntityResultCard`/`StatCard`/`ErrorCard`）はまだ未着手。

**次に実装すべき最小単位**: 上記Tier 3の表示専用コンポーネントへテストを広げるか、この規模まで広がったため優先度を下げて随時追加する運用に切り替える。

---

### 2026-09-02: 抽出の詳細（粉量・湯量・時間・注湯記録）を追加（`feat/brew-details`ブランチ）

「知識グラフを深める／データの幅を広げる」というアプリの発展の方向について相談し、レシオ提案機能（似た記録からレシオ候補を出す）は見送り、まず「注湯タイミングの記録」を優先することにした。ユーザーから「レシオは豆そのものの情報と異なる」という指摘を受け、記録編集フォーム（RecordFormPage/RecordForm.jsx）には含めず、記録詳細ページの独立カードでインライン編集する設計へ変更した（Plan Modeでのやり取りの経緯はdocs/domain-model.md「抽出の詳細」参照）。

**実装内容**:
- `CoffeeRecord`モデルへ`doseWeight`/`waterWeight`/`brewTimeSeconds`（任意の数値、6軸味覚評価と同じdefault null）と`pours`（注湯記録の配列、`{elapsedSeconds, cumulativeWaterWeight}`、default []）を追加
- `coffeeRecordValidator.js`に数値範囲検証（0より大きい・上限あり）とpours専用の検証（配列・上限20件・経過時間の単調増加）を追加。create/update両方・`pickCoffeeRecordFields`にも反映
- `coffeeRecordSerializer.js`のレスポンスへ上記4項目を追加
- フロントエンドは記録編集フォームに一切触れず、記録詳細ページ専用の新規コンポーネント`BrewDetailsCard.jsx`（閲覧⇄インライン編集を切り替える独立カード）・`PourScheduleEditor.jsx`（注湯行の手動追加/削除、ChipMultiSelect.jsxと同じ自前実装）・`validation/brewDetailsValidation.js`（専用の検証・APIペイロード変換）を新設。保存は既存の`updateCoffeeRecord`（PATCH）をそのまま使い、新しいAPIエンドポイントは作っていない
- `RecordDetailPage.jsx`の条件分岐（`hasCoffeeInfo || hasTasteRatings || ...`の三項演算子）を、`BrewDetailsCard`を常時表示できる構造（各セクションを個別にif表示するflexコンテナ）へ再構成した
- レシオ（`waterWeight / doseWeight`）は画面側で計算するだけでDBには保持しない

**データの流れ**: RecordDetailPage → BrewDetailsCard（`record`propから抽出データを表示）→「記録する」/「編集」→ カード内フォームで入力 → `updateCoffeeRecord(record.id, payload)` → `PATCH /api/coffee-records/:id` → `coffeeRecordValidator.js` → `coffeeRecordRepository.js` → MongoDB → レスポンスでカード自身の表示状態のみ更新（ページ全体の`useCoffeeRecord`の`reload`は呼ばない。他のセクションがこのフィールドに依存しないため）。

**影響範囲**: `CoffeeRecord`の他フィールド・API・知識グラフ・Insights/Stats/Diagnosisには影響なし（このモデルへの追加フィールドを一切参照しないため）。記録編集フォーム（RecordForm.jsx）は無変更。

**変更ファイル**:
- backend: `models/CoffeeRecord.js`, `validators/coffeeRecordValidator.js`, `services/coffee/coffeeRecordSerializer.js`, `tests/{coffeeRecordModel,coffeeRecordValidator,coffeeRecordApi}.test.js`
- frontend: `features/coffee-records/components/BrewDetailsCard.jsx`(新規)、`features/coffee-records/components/PourScheduleEditor.jsx`(新規)、`features/coffee-records/validation/brewDetailsValidation.js`(新規)、`features/coffee-records/components/BrewDetailsCard.test.jsx`(新規)、`features/coffee-records/validation/brewDetailsValidation.test.js`(新規)、`pages/RecordDetailPage.jsx`、`pages/RecordDetailPage.test.jsx`、`i18n/locales/{ja,en}.json`
- docs: `domain-model.md`、`design.md`

**実行したテストと結果**: `cd backend && npm test`（544件、既存509件+新規35件）すべて成功。`cd frontend && npm run test`（333件）・`npm run lint`・`npm run build`すべて成功。claude-in-chromeで実機確認（デモアカウント）: 空状態→「抽出データを記録する」→粉量・総湯量・抽出時間・注湯2件を入力→保存→閲覧モードでレシオ（1:15.6）・抽出時間（2:30）・注湯記録が正しく表示、ページ再読み込み後も反映、日本語表示でのラベル確認、iframeによるモバイル幅（390px）での表示・編集モード確認、記録編集フォーム側にはこの項目が一切出ないことを確認。すべて問題なし。

**未解決事項**: レシオから似た記録を提案する機能（今回見送った案）は未実装のまま。ライブタイマー（抽出中に計測しながら記録するUX）も見送り、手動リスト入力のみ。

**次に実装すべき最小単位**: 実データでの利用状況を見て、(1)レシオ提案機能に着手するか、(2)ライブタイマーでの入力UXを追加するか、(3)`brewMethod`/`equipmentName`（抽出方法・器具名）を追加するかを判断する。

---

### 2026-09-02: 抽出時間/経過時間の分:秒入力対応（`fix/brew-details-minutes`ブランチ）

前エントリ（抽出の詳細機能の追加）の直後、ユーザーから2件の修正依頼を受けた。(1)「抽出の詳細」カードの表示位置を味覚グラフの下へ移動（`feat/brew-details`ブランチの同一コミット内で対応済み。前エントリの内容がその反映後の状態を記述している）、(2)抽出時間・注湯の経過時間が秒だけの入力で分かりにくいため分単位も扱えるようにする。本エントリは(2)のみを扱う。

**実装内容**:
1. 抽出時間（`brewTimeSeconds`）・注湯の経過時間（`pours[].elapsedSeconds`）の入力を、単一の秒数入力から「分」「秒」の2つの数値入力へ変更。DB上は引き続き合計秒数で保存するため、バックエンド・APIの変更は無し。変換ロジック（`secondsToMinutesSecondsStrings`/分秒→合計秒数）を`validation/brewDetailsValidation.js`に集約し、`BrewDetailsCard.jsx`・`PourScheduleEditor.jsx`から利用する
2. 分・秒の2欄に分かれても、エラー表示は既存通り1つのキー（`brewTimeSeconds`/`pours`）にまとめる方針を維持
3. i18nラベルから「（秒）」表記を除去し、「分」「秒」のaria-labelを追加

**データの流れ**: 変更なし（フロントエンドの入力UXのみの変更のため、バックエンド・APIには一切触れていない）。

**変更ファイル**: frontend: `features/coffee-records/components/{BrewDetailsCard,PourScheduleEditor}.jsx`、`features/coffee-records/validation/brewDetailsValidation.js`、同テスト2件、`i18n/locales/{ja,en}.json`

**実行したテストと結果**: `cd frontend && npm run test`（342件、既存333件+新規9件）・`npm run lint`・`npm run build`すべて成功。claude-in-chromeで実機確認: 既存データ（150秒→2:30、45秒→0:45）が編集モードで正しく分:秒へ分解されること、分:秒を入力して保存すると合計秒数（3分5秒→185秒）へ正しく変換・保存・再表示されることを確認。

**未解決事項**: 前回エントリと同じ（レシオ提案機能・ライブタイマー・brewMethod/equipmentNameは見送り）。

**次に実装すべき最小単位**: 前回エントリと同じ。

---

### 2026-09-02: モバイルでGraphのノード詳細bottom sheetがBottomTabBarと干渉する不具合を修正（`fix/node-detail-panel-tabbar`ブランチ）

ユーザーからスクリーンショット付きで報告を受けた: モバイル表示でGraphのノードを選択すると、下から出るbottom sheet（`NodeDetailPanel.jsx`）の下部がBottomTabBar（Home/Records/Graph/Stats/Profileのタブ）に隠れ、一覧の項目が途中で見切れる。

**原因**: `NodeDetailPanel.jsx`のモバイル用bottom sheetは`z-40`だったが、`.bottom-tab-bar`（App.css）は`z-index: 50`。z-indexが逆転していたため、DOM順で後に置かれるBottomTabBarがパネルの上に重なり、パネル下部の内容を覆い隠していた。まったく同じ原因の不具合が過去に`ConfirmDialog.jsx`（削除確認・保存忘れ確認ダイアログ）でも発生しており、そちらは`z-[60]`で対処済みだった（`ConfirmDialog.jsx`内のコメント参照）。今回`NodeDetailPanel.jsx`には同じ対処が反映されていなかった。

**実装内容**: `NodeDetailPanel.jsx`のbottom sheetのz-indexを`z-40`→`z-[60]`に変更し、`ConfirmDialog.jsx`と同じ理由をコメントで明記した。モバイルでパネルを開いている間はBottomTabBarがパネルの下に完全に隠れる（ConfirmDialogの全画面モーダルと同じ挙動）。デスクトップ（`sm:`以上）はサイドパネル表示に切り替わりBottomTabBar自体が非表示のため影響なし。

**変更ファイル**: frontend: `features/graph/components/NodeDetailPanel.jsx`

**実行したテストと結果**: `cd frontend && npm run test`（342件）・`npm run lint`・`npm run build`すべて成功（新規テストは追加していない。CSSのz-index変更のみで、既存のNodeDetailPanel.test.jsx/GraphPage.test.jsxの振る舞いに変化は無いため）。claude-in-chromeでiframeによるモバイル幅（390px）実機確認: ノードを選択→bottom sheetがタブバーより手前に表示され、一覧の最後の項目まで見切れずに表示されることを確認。

**未解決事項**: 同種のz-index逆転が他の固定要素にも潜んでいないかの網羅的な監査は未実施（今回はユーザー報告のあった箇所のみ対応）。

**次に実装すべき最小単位**: 前々回エントリ（抽出の詳細機能）と同じ。

---

### 2026-09-02: Origin Quality機能を削除（`chore/remove-origin-quality`ブランチ）

ユーザーから「品質スコアの説明が難しい」「その国のコーヒーは絶対この点数という誤解が生まれてしまう」との指摘を受けた。代替案（段階ラベル化・国×地域×精製方法×焙煎度への階層化・Discoverへの統合等）を検討したが、階層化はCQIデータが実測ではなく概算値である以上、架空の数値をさらに増やすだけで誤解を悪化させると判断。焙煎度はCQIのカッピング評価（焙煎前の生豆の段階）とは軸が噛み合わないという問題もあった。最終的に「説明が難しいので後回しにする」→ユーザーの再検討の末「削除している状態にしてください」という指示を受け、Origin Quality機能一式を削除した。

**削除内容**:
- backend: `controllers/originQualityController.js`・`routes/originQualityRoutes.js`・`services/coffee/originQualityService.js`・`core/originQuality/originQualityBuilder.js`・対応するテスト2件を削除。`app.js`から`/api/origin-quality`のルート登録を削除。`masterDataRepository.js`の`findByNames`（Origin Qualityのみが使用）も削除
- frontend: `features/originQuality/`ディレクトリ一式（コンポーネント・hooks・API・テスト）を削除。World Mapの「品質スコアで色分け」モード（`ColorModeToggle`・`qualityColor.js`・`originQualityMap.js`）を削除し、訪問状況の1モードのみに戻した。`EntityDetailPage.jsx`から`OriginQualityScores`の描画を削除
- docs: `docs/features.md`の「Origin Quality」節を「Origin Quality（削除済み）」という削除理由の記録に置き換え、World Mapの2モード記述を1モードに戻した。`docs/api.md`・`README.md`から`/origin-quality`・Origin Qualityの記載を削除
- i18n: `originQuality.*`、`map.colorMode*`・`map.qualityScore`・`map.legendQuality*`のキーを削除

**残したもの**: Discover機能（同じCQI参照データ`backend/data/cqiDatabase.json`を内部で使い「まだ試していない産地」を提案するが、生のスコア数値は画面に出さない）はそのまま残した。ユーザーの懸念（数値の誤読）はDiscoverには当てはまらないと判断したため。`originLookup.js`・`cqiDataset.js`もDiscoverが引き続き使うため削除せず、コメント中のOrigin Quality言及だけを削除した。

**データの流れ**: 変更なし（機能の削除のみ）。

**影響範囲**: Origin Qualityを参照していたEntity Detail・World Mapページのみ。Discover・Insights・Stats・Diagnosis・知識グラフには影響なし。

**変更ファイル**: 上記「削除内容」参照（30ファイル、950行超の削除）。

**実行したテストと結果**: `cd backend && npm test`（532件、削除前544件から-12件）・`cd frontend && npm run test`（335件、削除前342件から-7件）・`npm run lint`・`npm run build`すべて成功。claude-in-chromeで実機確認: World Mapに色分けモードのトグルが表示されないこと、Entity Detailページ（産地ノード）に品質スコアのセクションが表示されないこと、Discoverの提案表示は影響を受けていないことを確認。

**未解決事項**: なし。

**次に実装すべき最小単位**: 前々回エントリ（抽出の詳細機能）と同じ。

---

### 2026-09-08: React設計レビュー — コメント整理・設計の統一・pageのAPI直接呼び出し解消

ユーザーから「1. 説明しやすい綺麗な設計 2. 他ファイルとの統一感 3. 不要なコメントの洗い出し」という観点でレビューを依頼された。3つのExploreエージェント（コメント監査・設計統一性・pageのAPI直接呼び出し）で調査した結果をAskUserQuestionで確認したところ、最も広い範囲「上記全てに加え、pageのAPI直接呼び出しも修正」が選ばれた。Plan Modeで詳細設計・ExitPlanModeの承認を経て実装した。

**Tier 1（不要・古くなったコメントの修正）**:
- `App.jsx`: `location.key`再マウントの注意書きが、存在しないパス（`features/graph/pages/GraphPage.jsx`）を指し、かつ直近のタスクでGraphPage.jsxから実際に削除したworkaround（`window.history.replaceState`）をそのまま推奨してしまっていたのを修正
- `graphApi.js`・`insightApi.js`・`discoverApi.js`・`searchApi.js`・`statsApi.js`・`similarRecordsApi.js`: 2026-09のhttpClient.js移動（`features/coffee-records/api/`→`services/api/`）に追随できていなかった「httpClientはcoffee-records featureのものをそのまま使う」という記述を修正
- `services/api/httpClient.js`: 401ハンドリングのコメントが、`features/profile/api/userApi.js`のchangePasswordを「例外」と書いたままだったが、実際にはbackend側の修正で既にこの前提が成り立っており矛盾していたため修正
- `ProfilePage.jsx`: compare-during-renderパターンの説明を、他5箇所と同じ「`useRecordForm.js`のsyncedRecordと同じ形」という一行の相互参照スタイルへ短縮

**Tier 2（他ファイルとの統一感）**:
- `services/api/authApi.js`: 生fetchを使う理由（apiRequestのhandleUnauthorizedが、ログイン画面の401＝認証情報間違いと衝突するため）を説明するコメントを追加（移行はしない）
- `services/api/userApi.js` → `features/profile/api/userApi.js`へ移動（利用箇所が`features/profile/`配下のみのため）
- `OverviewStats`・`MonthlyTrendChart`・`CollectionStats`・`RatingDistributionChart`・`TopRankingList`・`HomeVsCafeCard`・`InsightList`・`ArchetypeCard`の8コンポーネントを、`t`をpropsで受け取る方式から`useTranslation()`を自前で呼ぶ方式（57ファイルの多数派）へ統一。`StatsPage.jsx`・`DiagnosisPage.jsx`から`t={t}`の受け渡しを削除
- ログアウト処理（`clearAuthData()`+フルリロード）が`authStorage.js`（401時）・`Navbar.jsx`（明示的ログアウト）・`LoginPage.jsx`（ログイン済み状態からのログアウト）の3箇所に独立実装されていたのを、`authStorage.js`の`logout()`へ共通化

**Tier 3（pageのAPI直接呼び出しをhookへ移動）**:
- `useCoffeeRecord.js`に`deleteRecord`/`isDeleting`を追加し、`RecordDetailPage.jsx`から`deleteCoffeeRecord`の直接importを削除
- `useRecordForm.js`から`onSubmit`引数を廃止し、`record`の有無から`createCoffeeRecord`/`updateCoffeeRecord`を直接呼ぶよう変更。`RecordFormPage.jsx`は「成功時の反応（トースト・navigate）」だけを行う`handleFormSubmit`に簡略化
- `useProfile.js`に`updateName`/`changePassword`/`deleteAccount`（各専用の呼び出し中フラグ付き）を追加し、`ProfilePage.jsx`から`features/profile/api/userApi.js`の直接importを削除。JSDocの「更新はProfilePage側の責務」という非対称設計の説明も、対称になったことに合わせて書き直した
- 退会（`handleDeleteAccount`）は、以前の`navigate("/login")`から共通化した`logout()`（フルリロード）へ変更。退会後にReactのメモリ上へ削除済みユーザーの状態が残らないようにするための意図的な改善

**変更ファイル**: `App.jsx`、`components/Navbar.jsx`、`pages/{LoginPage,ProfilePage,RecordDetailPage,RecordFormPage,StatsPage,DiagnosisPage}.jsx`、`utils/authStorage.js`、`services/api/{authApi,httpClient}.js`、`services/api/userApi.js`→`features/profile/api/userApi.js`（移動）、`features/coffee-records/hooks/{useCoffeeRecord,useRecordForm}.js`、`features/profile/hooks/useProfile.js`、`features/stats/api/*.js`（6ファイル）、`features/stats/components/{OverviewStats,MonthlyTrendChart,CollectionStats,RatingDistributionChart,TopRankingList,HomeVsCafeCard}.jsx`、`features/diagnosis/components/{InsightList,ArchetypeCard}.jsx`、テスト: `useRecordForm.test.js`・`RecordForm.test.jsx`・`ProfilePage.test.jsx`・`HomePage.test.jsx`（すべてモック対象パスの追随・onSubmit廃止に伴う書き換え）、`docs/mlb-legacy-inventory.md`（userApi.js再移動の追記）。

**データの流れ**: 記録の作成・更新・削除、プロフィールの更新・パスワード変更・退会のいずれも、APIへの実際の書き込みがpage層からfeature hook層へ移っただけで、エンドポイント・バックエンドの処理・レスポンス形状は変更していない。

**実行したテストと結果**: backendの変更は無いため`cd backend && npm test`は未実施。`cd frontend && npm run lint`（0件）・`npm run test`（48 test files / 336 tests すべて成功。`useRecordForm.test.js`に編集時`updateCoffeeRecord`呼び出しの新規テストを1件追加）・`npm run build`成功を確認済み。ローカルMongoDB（docker-compose、`mongodb://127.0.0.1:27018/coffeeApp`）へ`backend/.env`を一時的に切り替え、claude-in-chromeで実機確認: 記録の新規作成・編集・削除（トースト表示・遷移とも正常）、プロフィールの名前変更・パスワード変更（誤ったパスワードでも自動ログアウトしないことを確認）・アカウント削除（削除後に再ログイン試行が失敗することまで確認）、Navbar・LoginPageの両方のログアウトボタン、Stats/Diagnosisページ（t-prop廃止後の8コンポーネントすべてが実データで正常に描画され、TopRankingList・HomeVsCafeCard・ArchetypeCard・InsightListの表示も含め確認）。確認後`backend/.env`は元のAtlas接続情報へ戻した。

**未解決事項**: なし（計画した3階層すべて実装・検証済み）。

**次に実装すべき最小単位**: 前回エントリ（Origin Quality削除）と同じ。

---

### 2026-09-08: 変更しやすさの監査 — 重複コードの解消（`chore/consolidate-duplication`ブランチ）

ユーザーから「コードを変更しやすくしたい。APIのURLを変更しただけで10ファイル修正が必要になるような設計は弱い。同じ処理・値・UIを複数箇所にコピーするより共通化できる部分は適切にまとめる。ただし何でもコンポーネント化・抽象化するのも逆効果」という依頼を受けた。3つのExploreエージェント（API URL/エンドポイントの重複、値・定数・ロジックの重複、UIコンポーネントの重複）で並行調査し、各ファイルを実際に読んで内容を確認した。

**調査結果の全体像**: APIのベースURL（`frontend/src/utils/apiConfig.js`）・10個のfeature APIクライアントファイルはいずれも1箇所にパスを集約する設計が既にできており、「URLを変えたら10ファイル」に該当する箇所は無かった。一方で、具体的な重複が6件見つかった（うち5件は対応、1件は死んだコードの削除）。ユーザーとの相談の末、「対応する価値が薄い」と判断した項目（評価スケール1〜5・パスワード最小文字数の定数化）も含め、見つかった重複はすべて解消する方針で最終合意した。

**対応した重複**:
1. `isMissing`ヘルパー（`value === undefined || value === null || value === ""`）が`backend/validators/`配下5ファイルに一字一句同じ形で重複 → `backend/utils/isMissing.js`（`utils/objectId.js`と同じ形式）へ集約
2. `MIN_PASSWORD_LENGTH = 6`が`authValidator.js`・`userValidator.js`の2ファイルに重複 → `backend/utils/passwordPolicy.js`へ集約
3. 評価スケール（1〜5の整数）の範囲チェックが`coffeeRecordValidator.js`の2箇所・`recordFilterValidator.js`の1箇所に重複 → `backend/utils/ratingScale.js`（`RATING_MIN`/`RATING_MAX`）へ集約。各フィールドのエラーメッセージ文言は変更していない
4. Stats/Diagnosis/WorldMapの3つのローディングスケルトンが同じ`StatCardSkeleton`/`RankingListSkeleton`をそれぞれ独立に定義（過去に「スケルトンが実際のコンポーネントとずれてレイアウトが動く」不具合を2回起こしたと両ファイル自身のコメントに明記されていた） → `frontend/src/components/StatCardSkeleton.jsx`・`RankingListSkeleton.jsx`（`StatCard.jsx`が辿ったのと同じ「複数機能で使うのでcomponents/へ昇格」という経緯）へ集約
5. `features/profile/api/userApi.js`だけ他の9つのfeature APIクライアントと違いエンドポイントパスを定数化していなかった（`"/api/users/me"`を3箇所・`"/api/users/me/password"`を1箇所に直接記述） → `USERS_PATH`定数を導入し他ファイルと同じ形に統一

**削除した死んだコード**: `frontend/src/hooks/useRecentlyViewed.js`（アプリのどこからもimportされていない、MLBテンプレート由来の未使用フック。`docs/mlb-legacy-inventory.md`へ追記）

**あえて対応しなかったもの**（過剰な抽象化を避けるため）: `/api`プレフィックスの10ファイルへの重複（各ファイルが自分のリソースパス全体を1定数で持っており実利が薄い）、エンティティチップリンクの重複（`EntityDetailPage.jsx`・`WorldMapPage.jsx`の2箇所のみで、このプロジェクト自身の「3箇所以上で共通化」という目安に届かない）、星評価表示ロジックの重複（`RatingInput.jsx`の編集用radiogroupと`RecordDetailPage.jsx`の読み取り専用バッジは役割が異なる）、backendの各`core/*/xxxBuilder.js`の`THRESHOLDS`（意図的に独立してチューニングされるべき別概念）、フロントエンド/バックエンド間のエンドポイントパス文字列の重複（ネットワーク境界をまたぐ重複は今回のスコープ外）。

**変更ファイル**: 新設 `backend/utils/{isMissing,passwordPolicy,ratingScale}.js`・`frontend/src/components/{StatCardSkeleton,RankingListSkeleton}.jsx`、変更 `backend/validators/{authValidator,userValidator,graphQueryValidator,coffeeRecordQueryValidator,coffeeRecordValidator,recordFilterValidator}.js`・`frontend/src/features/stats/components/StatsSkeleton.jsx`・`frontend/src/features/diagnosis/components/DiagnosisSkeleton.jsx`・`frontend/src/features/map/components/WorldMapSkeleton.jsx`・`frontend/src/features/profile/api/userApi.js`・`docs/mlb-legacy-inventory.md`、削除 `frontend/src/hooks/useRecentlyViewed.js`。

**データの流れ**: 変更なし（重複コードを1箇所に集約しただけで、判定ロジック・エンドポイント・レスポンス形状はすべて維持）。

**実行したテストと結果**: `cd backend && npm test`（33 suites / 532 tests すべて成功、既存件数から変化なし）。`cd frontend && npm run lint`（0件）・`npm run test`（48 test files / 336 tests すべて成功）・`npm run build`成功（StatsPage/DiagnosisPage/WorldMapPageのバンドルサイズがスケルトン重複除去分わずかに減少したことも確認）。ローカルMongoDB（`mongodb://127.0.0.1:27018/coffeeApp`）へ`backend/.env`を一時的に切り替え、claude-in-chromeでStats/Diagnosis/WorldMapページを確認: `window.fetch`を一時的にラップして対象API（`/api/stats`・`/api/diagnosis`・`/api/graph`）に3秒の遅延を注入し、ローディングスケルトンの表示を意図的に発生させて目視確認。共通化後も3ページとも実際のコンポーネントと同じ形のスケルトンが表示され、見た目の崩れが無いことを確認。確認後`backend/.env`は元のAtlas接続情報へ戻した。

**未解決事項**: なし。

**次に実装すべき最小単位**: 前回エントリ（React設計レビュー）と同じ。

---

### 2026-09-09: README.mdの見直し（mainへ直接commit）

ユーザーから「README.mdを見直してください」という依頼を受け、実際のコードベースと突き合わせて確認した。4件の古い/不足している記述が見つかったため修正した。

- **mlb-appから再利用したもの**: `SkeletonCard.jsx`を「再利用した共通UI」として挙げていたが、2026-08に死んだコンポーネントとして削除済み（`docs/mlb-legacy-inventory.md`参照）。記述から削除
- **Knowledge Graphのノード種別**: 「record / origin / farm / variety / process / roastLevel / flavor」の7種のみを挙げていたが、`backend/core/graph/graphBuilder.js`の`ATTRIBUTE_NODE_TYPES`には`cafe`・`keyword`も含まれる。2種を追記し、keywordノードの由来（notesの自由記述からの辞書照合、マスターデータを持たない）も一文追加
- **Features一覧**: 2026-09-02に追加した「抽出の詳細」（粉量・湯量・抽出時間・注湯記録）が一覧から漏れていた。Similar Recordsの次に追記
- **ディレクトリ構成**: frontend/features・backend/coreの一覧が、実際に存在する`diagnosis/` `map/` `similarRecords/` `profile/`（frontend）・`diagnosis/` `similarRecords/` `shared/`（backend）を含んでいなかった。実際のディレクトリ一覧（`ls`で確認済み）に合わせて更新

**変更ファイル**: `README.md`のみ。

**データの流れ**: 変更なし（ドキュメント修正のみ）。

**実行したテストと結果**: Markdownのみの変更のためテスト・lint・buildは対象外。修正箇所はすべて実際のファイル・コードを`grep`/`ls`で確認した上で反映した。

**未解決事項**: なし。

**次に実装すべき最小単位**: 前回エントリ（変更しやすさの監査）と同じ。

---

### 2026-09-11: TypeScript化 Phase 1 — backendのデータ層（`feat/backend-typescript-data-layer`ブランチ）

ユーザーから「このプロジェクトをTypeScript化していこうと思います」という依頼。Explore調査で、backendは`"type": "module"`のESM構成かつ相対importが既にすべて`.js`拡張子付きになっており、TypeScriptのNodeNext解決モード（`.ts`ファイルからのimportでも拡張子は`.js`のまま書く）と偶然一致していて、既存のimport文を1つも書き換えずに移行できることが判明した。frontend（133ファイル）・backend（約72ファイル）とも一度に全部変換するのは非現実的なため、ユーザーと相談し、今回のスコープを「backendのデータ関連」（`utils/`・`models/`・`repositories/`、計18ファイル）に決定した。

**ツール導入**: `typescript`・`tsx`（esbuildベースのTS実行ツール。Node自身には`.js`指定のimportを実際の`.ts`ファイルへ解決する能力が無いため必須）をdevDependencyに追加。`backend/tsconfig.json`を新設（`module`/`moduleResolution`は`NodeNext`、`allowJs: true`・`checkJs: false`で`.js`と`.ts`の共存を許可、`strict: true`）。`package.json`の`dev`/`start`スクリプトを`tsx`経由に変更（`nodemon --exec tsx server.js` / `tsx server.js`）、`typecheck`スクリプト（`tsc --noEmit`）を新設。

**テスト基盤をJestからVitestへ切り替え**: `node --experimental-vm-modules`という実験的フラグに依存していたJestを撤去し、frontendと同じVitestへ統一した（esbuildベースでTS/ESMを追加設定無しにネイティブに扱える）。`vitest.config.js`を新設（`test.globals: true`で既存テストの`describe`/`test`/`expect`の書き方をそのまま維持）。1ファイル（`tests/authController.test.js`）だけ`import { jest } from "@jest/globals"`でタイミングサイドチャネル対策のspyを使っており、Vitestの`vi`へ書き換えが必要だった（`jest.spyOn` → `vi.spyOn`）。それ以外の32ファイルは無変更で移行できた。既存33 test suites / 532 testsは件数・内容とも変化なし。

**ファイル変換**: `utils/`8ファイル（`AppError.ts`はエラー詳細の`ErrorDetail`インターフェースを追加、`objectId.ts`の`dedupeIds`はジェネリクス化）→ `models/`7ファイル（各モデルにMongoose document interfaceを追加。`CoffeeRecord.ts`が最も複雑で、6軸の味覚評価・抽出の詳細（`Pour`インターフェース）まで含めて型定義した）→ `repositories/`3ファイル（`masterDataRepository.ts`は5種類のマスターを動的にディスパッチする設計のため、`model: mongoose.Model<any>`とだけ意図的に緩めた型にし、`coffeeRecordRepository.ts`は`mongoose.QueryFilter`/`UpdateQuery`を使用）の順に変換した。

**つまずいた点**: 新しいMongoose（9.9.2）の型定義では、旧来おなじみの`FilterQuery<T>`が`QueryFilter<T>`へ改名されていた（`UpdateQuery`は改名なし）。`node_modules/mongoose/types/query.d.ts`を直接確認して気づいた。

**スコープ外（今回は変更しない）**: `validators/` `core/*/` `services/coffee/` `controllers/` `routes/` `middleware/`（計約54ファイル）は`.js`のまま。`allowJs: true`により引き続き問題なくimport・実行できる。frontend（133ファイル）も今回のスコープ外。

**変更ファイル**: 新設 `backend/tsconfig.json`・`backend/vitest.config.js`。変換（`.js`→`.ts`）: `backend/utils/`8ファイル・`backend/models/`7ファイル・`backend/repositories/`3ファイル。変更: `backend/package.json`（devDependencies・scripts・jest設定削除）・`backend/tests/authController.test.js`（`jest`→`vi`）・`DEPLOYMENT.md`（Start Commandの注記）。

**データの流れ**: 変更なし（型注釈の追加のみ。ロジック・エンドポイント・レスポンス形状は変更していない）。

**実行したテストと結果**: `cd backend && npx tsc --noEmit`（0件、変換した18ファイルに型エラー無し）。`cd backend && npm test`（Vitestで33 suites / 532 tests、件数・内容とも変化なしを確認）。`cd backend && npm run dev`でtsx経由のサーバー起動を確認後、curlで実際にAPIを叩いて主要フローを検証: register→login→master-data取得（Origin.tsのpopulate）→記録作成（`origin`が正しくpopulateされる）→一覧取得→削除（204）→Graph取得→アカウント削除、すべて正常動作を確認。`cd frontend && npm run build`も影響が無いことを確認済み。

**未解決事項**: なし。

**次に実装すべき最小単位**: TypeScript化 Phase 2 — 今回変換した`utils/models/repositories`の上位層（`validators/`・`services/coffee/`）を同じ「依存の少ない順」で変換する。その後`controllers/`・`routes/`・`middleware/`、最後にfrontend（133ファイル）という順を想定（README.mdのFuture Work参照）。

---

### 2026-09-11: Landing page再設計 — シンプルな1画面構成（`redesign/landing-page-minimal`ブランチ）

ユーザーから「Landing pageを再設計したい。シンプルなレイアウトが良い」という依頼。3方向（A: Hero+統合セクション、B: ミニマル1画面、C: Hero大きめ+Stepsのみ）をASCIIプレビュー付きで提示し、案B（ミニマル1画面）が選ばれた。さらに「テキストでの説明は少なめに」という追加要望を受け、3ステップの説明文（各1文）も削り、アイコン+ラベルのみの表示にした。

**変更前**: ミニナビ→Hero→How it works（3ステップ、説明文つきカード）→Your Knowledge Graph（グラフ図+キャプション）→Why Coffee App?（他社比較）→末尾CTA、という5セクション構成。

**変更後**: ミニナビ→Hero（kicker・見出し・Record→Connect→Discoverのアイコン+ラベルのみのインライン表示・Get Started CTA・背景の装飾グラフ）の実質1セクションのみ。

**削除したもの**: How it works（説明文つきカード）・Your Knowledge Graph（グラフ図単体セクション）・Why Coffee App?（比較）・末尾の再掲CTA。`GraphIllustration.jsx`の`variant="feature"`（Your Knowledge Graph専用だった）はLandingPage.jsx以外に呼び出し元が無いことをgrepで確認したうえで、`variant` propごと削除し常にambient（大きく・薄く・ゆっくり漂う）スタイルのみの単純なコンポーネントにした。あわせて`GraphIllustration.module.css`冒頭の「Login/Registerの背景装飾にも使うようになった」という古い記述（実際は現在Landing専用）も修正した。未使用になったi18nキー（`landing.steps.*.desc`・`landing.graph.*`・`landing.comparison.*`・`landing.finalCta.*`）をja.json/en.jsonから削除した。

**変更ファイル**: `frontend/src/pages/LandingPage.jsx`・`LandingHero.module.css`・`GraphIllustration.jsx`・`GraphIllustration.module.css`、`frontend/src/i18n/locales/{ja,en}.json`、`docs/design.md`（Landing節）。

**データの流れ**: 変更なし（表示のみの変更。APIやデータフローには影響しない）。

**実行したテストと結果**: `cd frontend && npm run lint`（0件）・`npm run build`成功（バンドルサイズは削除分わずかに減少）。claude-in-chromeで`/landing`を実機確認: デスクトップ幅で見出し・3ステップ・CTAが1画面に収まること、iframeで390px幅を再現したモバイル表示でステップ行が2行に折り返して読みやすいこと、日→英の言語切り替え（kicker・Get Started・Loginラベルとも正しく切り替わる）、背景の装飾グラフのdrift/pulseアニメーションが引き続き動作していること（`getComputedStyle`でanimation-nameを確認）を確認済み。

**未解決事項**: なし。

**次に実装すべき最小単位**: 前回エントリ（TypeScript化 Phase 1）と同じ。

---

### 2026-09-11: Landing pageの余白を調整（mainへ直接commit）

ユーザーから「各表示コンテンツに対して、もう少し余白を足してほしい」という指摘。`frontend/src/pages/LandingHero.module.css`のkicker→title間（24px→32px）・title→steps間（40px→56px）・steps→CTA間（40px→56px）のmarginと、`.hero`自体の上下padding（120px/100px→160px/140px）を広げた。stepsの各アイコン間のgapも10px→14pxへ。

**変更ファイル**: `frontend/src/pages/LandingHero.module.css`のみ。

**実行したテストと結果**: `cd frontend && npm run lint`（0件）。claude-in-chromeでデスクトップ幅・モバイル幅（iframeで390px再現）の両方を実機確認し、余白が広がったこと、モバイルでもGet Startedボタンまで1画面（844px）に収まることを確認済み。

**未解決事項**: なし。

**次に実装すべき最小単位**: 前々回エントリ（TypeScript化 Phase 1）と同じ。

---

### 2026-09-11: Homeの「今日のコーヒーを記録する」CTAのグラデーション枠線を9色→3色へ（mainへ直接commit）

ユーザーから「グラデーションがアプリの世界観（静かな道具）に対して派手すぎる」という指摘。「色数を減らす」か「グラデーション自体を廃止する」かを相談したところ、色数を減らす方針で合意した（このCTAはアプリの中心操作のため、目立たせる方向性自体は維持したいという要望）。

調査の過程で、このグラデーションが`features/graph/utils/nodeVisuals.js`の知識グラフノード配色と完全に同じ色・同じ並び順（record→origin→farm→variety→process→roastLevel→flavor→cafe→keyword の9色）を使っていることを確認した。あわせて`docs/design.md`の「Design Tokens」節が、2026-08の**1回目**の配色刷新（`accent-slate`等の5色パレット）時点の記述のままで、その後の**2回目**の刷新（Catppuccin Mocha準拠の現在の9色パレットへの変更、`index.css`のコメントで確認）に追随できていない、という古いドキュメントも見つかった（この指摘はユーザーへ報告済み、docs側の修正はまだ未着手）。

`frontend/src/index.css`の`.home-cta-gradient-border`を、9色（moss/sky/teal/yellow/sapphire/peach/pink/lavender/mauve）→3色（moss/sky/teal、nodeVisuals.jsの先頭3件=record/origin/farmと同じ並び順のまま）へ削減した。「グラフと同じ色を使う」という意匠の意図（コーヒーを記録する行為が知識グラフにつながる、という中心体験の暗示）自体は維持し、色数だけを絞った。ホバー時にグラデーション位置がずれる既存のアニメーションはそのまま。

**変更ファイル**: `frontend/src/index.css`のみ。

**実行したテストと結果**: `cd frontend && npm run lint`（0件）。claude-in-chromeでHome画面を実機確認し、枠線が落ち着いた緑→青の2色寄りのグラデーションになったことを確認済み。

**未解決事項**: `docs/design.md`「Design Tokens」節のグラフノード配色の記述が、実際のコード（2回目の刷新後の9色パレット、うち3色はこのCTAでも使用）と一致していない（上記調査で発覚、ユーザーへ報告済みだがdocs側の修正はまだ未実施）。

**次に実装すべき最小単位**: `docs/design.md`のグラフノード配色の記述を現状のコードに合わせて修正する。その後は前々回エントリ（TypeScript化 Phase 1）と同じ。

---

### 2026-09-11: Homeの記録CTAをグラデーションから反転配色へ変更（mainへ直接commit）

前回3色へ減らしたグラデーション枠線について、ユーザーから「まだ派手」という指摘。グラデーション以外の案（A: record色単色の枠線/リング、B: 他の主要CTAと同じ反転配色で色なし、B': Bにワンポイントだけmoss色を足す）を提示し、**B**（他の主要CTAと完全に同じ見た目）が選ばれた。

`frontend/src/pages/HomePage.jsx`のCTAを、`home-cta-gradient-border`（枠線グラデーション）から`bg-inverse text-on-inverse rounded-full`（`formStyles.js`の`primaryButtonClass`やLandingの「Get Started」と同じ反転配色・完全な角丸）へ変更した。サイズ・レイアウト（初回訪問時は大きな`flex-col py-10`、リピーターは`py-3`の小さいボタン）は変更していない。目立たせる方向性は色ではなく位置・サイズで担う形に統一した。使われなくなった`index.css`の`.home-cta-gradient-border`（二重背景+background-clipのグラデーション枠線トリック、ホバー時のグラデーション移動アニメーションを含む）を削除した。

**変更ファイル**: `frontend/src/pages/HomePage.jsx`・`frontend/src/index.css`。

**実行したテストと結果**: `cd frontend && npm run lint && npm run build`成功。claude-in-chromeでHome画面を実機確認し、`getComputedStyle`でbackground-color(#fff)・color(#141414)・border-radius(rounded-full相当)が他の主要CTAと同じ値になっていることを確認済み。

**未解決事項**: 前回エントリと同じ（`docs/design.md`「Design Tokens」節のグラフノード配色の記述が古い）。

**次に実装すべき最小単位**: 前々回エントリと同じ（`docs/design.md`のグラフノード配色の記述修正）。

---

### 2026-09-11: Homeの記録CTAを他のカードと同じ配色へ統一（色による強調を断念、mainへ直接commit）

反転配色（白背景）もユーザーから「だめ」という指摘。理由を確認したところ「白背景自体が世界観に合わない」ことが判明した（白背景の反転配色は小さいピルボタン＝Get Started等では問題にならなかったが、このCTAは全幅の大きな箱のため、白い面積が大きくなり暗い画面の中で浮いて見えていたと考えられる）。

グラデーション（9色→3色）→反転配色（白背景）→他のカードと同じ暗い配色、と3案を順に試した結果、ユーザーから「あまり良い案がないので妥協する」という判断があり、**色による特別扱いを断念**した。`frontend/src/pages/HomePage.jsx`のCTAを、`HomeRecordCard.jsx`など他のカードと全く同じ配色（`rounded-2xl border border-surface-2 bg-raised text-text shadow-elevated hover:border-line`）へ統一した。目立たせる方向性自体は、初回訪問時だけ大きな専用セクション（`flex-col py-10`+見出し）として表示する、既存のサイズ・位置による差別化のみで担う形にした。

**変更ファイル**: `frontend/src/pages/HomePage.jsx`のみ（`index.css`の`.home-cta-gradient-border`は前回のエントリで既に削除済み）。

**実行したテストと結果**: `cd frontend && npm run lint`（0件）。claude-in-chromeでHome画面を実機確認し、CTAが「最近の記録」カード等と同じ暗い配色になっていることを確認済み。

**未解決事項**: 前々回エントリと同じ（`docs/design.md`「Design Tokens」節のグラフノード配色の記述が古い）。この件とは別に、「今日のコーヒーを記録するCTAを色で目立たせる」という当初のアイデア自体は、3案とも不採用となり保留（次に良い案が思いついたら再検討）。

**次に実装すべき最小単位**: `docs/design.md`のグラフノード配色の記述を現状のコードに合わせて修正する。その後は前々々回エントリ（TypeScript化 Phase 1）と同じ。

---

### 2026-09-13: backendの型チェックをCIに追加（mainへ直接commit）

ユーザーから「backendのデータ関連をTypeScript化したので、型チェックをCIでできるようにしてほしい」という依頼。`.github/workflows/test.yml`の`backend-tests`ジョブへ、`npm ci`の直後・`npm test`の前に`Type check`ステップ（`cd backend && npm run typecheck`、実体は`tsc --noEmit`）を追加した。`tsconfig.json`の`allowJs: true`・`checkJs: false`により、まだ`.ts`化していないファイルは対象外のまま、変換済みの`utils/models/repositories`層だけが型チェックされる。

あわせて、README.mdの古い記述も見つけて修正した: Tech Stackの「テスト・CI」欄が backendのテストランナーを「Jest」のままにしていた（TypeScript化 Phase 1でVitestへ切り替え済みだったが更新漏れ）。Testingセクションのコマンド一覧にも`npm run typecheck`を追加し、Backendの行にデータ層のTypeScript化状況を一言添えた。Future Workの「TypeScript化」項目も、どこまで終わっていて次に何を変換する想定かを具体的に書き直した。

**変更ファイル**: `.github/workflows/test.yml`・`README.md`。

**データの流れ**: 変更なし（CI設定とドキュメントのみ）。

**実行したテストと結果**: ローカルでCIと同じ手順（`npm ci` → `npm run typecheck` → `npm test`）を実行し、すべて成功することを確認済み（`npm ci`は230 packages、typecheckは0エラー、testは33 suites/532 tests）。GitHub Actions上での実行自体はpush後でないと確認できないため、次回pushの際にActionsのログを確認すること。

**未解決事項**: 前回エントリと同じ（`docs/design.md`のグラフノード配色の記述・CTA色の再検討は保留）。GitHub Actions上での動作は未確認（ローカルでの再現のみ）。

**次に実装すべき最小単位**: 前々回エントリと同じ（`docs/design.md`のグラフノード配色の記述修正）。

---

### 2026-09-14: ブレンドコーヒー対応（複数産地の記録、branch `feat/blend-coffee-origins`）

ユーザーから「現状シングルオリジンしか扱えないので、ブレンドコーヒーにも対応させたい」という依頼。`CoffeeRecord`の産地（`originId`、単一参照）を、品種（`varietyIds`）・フレーバー（`flavorIds`）と同じ複数参照（`originIds`、配列）へ変更し、1つの記録が複数の産地を持てるようにした。既存の「単数参照 vs 複数参照」の並行パターンを産地にも横展開する変更で、影響範囲は広い（知識グラフ・Insights・Stats・Discover・Search・フィルター・フォームUI・記録カード）が、ほとんどの箇所は「単数ヘルパー→同じファイル内の複数ヘルパーへ差し替え」で済んだ。

実装前にPlan Modeで3体のExploreエージェント（backend/frontend/docs）を並行起動して影響範囲を洗い出し、既存パターンで機械的に対応できない箇所（記録カードのブレンド表示、Discoverの集計方針）だけをAskUserQuestionでユーザーに確認してから実装した。

**backend**:
- `models/CoffeeRecord.ts`: `originId: ObjectId|null` → `originIds: ObjectId[]`（`varietyIds`と同じ`set: dedupeIds`、インデックスもマルチキーへ）
- `validators/coffeeRecordValidator.js`: `originId`を`SINGLE_REF_FIELDS`から`MULTI_REF_FIELDS`（`originIds`）へ移動
- `validators/recordFilterValidator.js`: `originIds`クエリパラメータのマッピング先を`originId`→`originIds`へ（varietyIds等と同じ「クエリ名=フィールド名」の形に統一。`$in`が配列フィールドに対しても「いずれかを含む」として働くため、フィルターの挙動自体は変わらない）
- `services/coffee/masterDataService.js`の`verifyReferencesExist`: `originId`を`singleRefs`から`multiRefs`（`originIds`）へ。**当初のPlanには無かったが実装中に発見**——ここを直さないと、存在しない産地IDを指定してもDB保存前チェックをすり抜けてしまう不具合になっていた
- `repositories/coffeeRecordRepository.ts`・`core/graph/graphBuilder.js`・`core/insights/insightBuilder.js`・`core/stats/statsBuilder.js`・`core/discover/discoverBuilder.js`・`services/coffee/originLookup.js`・`services/coffee/coffeeRecordSerializer.js`（`origin`→`origins`、APIレスポンス形状の破壊的変更）をそれぞれ配列対応へ
- `core/insights/insightBuilder.js`の`findTopCombination`（産地×精製方法の組み合わせ）・`core/discover/discoverBuilder.js`（産地ごとの記録数・精製方法集計）は、ブレンド記録を「含まれる産地それぞれへ1件としてカウントする」方針にした。variety/flavorの既存集計と同じ考え方で、新しいルールを増やしていない
- `seeds/data/demoRecords.js`・`seedDemoData.js`: 全レコードを`origins`配列形式へ変換し、デモデータに2件のブレンド記録（Ethiopia×Guatemala、Ethiopia×Kenya）を追加
- `package.json`の`seed`/`seed:demo`スクリプトが`node`のままで、TypeScript化した`models/*.ts`を解決できず壊れていた不具合を発見・修正（`tsx`経由へ変更。**TypeScript化Phase 1からの見落としで、今回のPlanには無かったが動作確認に必要だったため対応**）

**frontend**:
- `useRecordForm.js`・`recordFormValidation.js`: `originId`（文字列）→`originIds`（配列）
- `RecordForm.jsx`: 産地の`<select>`を、品種と同じ`ChipMultiSelect`へ差し替え
- `recordFormat.js`: `collectCoffeeDetails`/`hasCoffeeDetails`を配列対応（`RecordDetailPage.jsx`の`DETAIL_NODE_TYPE`マップのキーも`origin`→`origins`へ）
- `RecordCard.jsx`/`HomeRecordCard.jsx`: 産地の数だけ`getOriginAccentClass`のバーを横に並べ、産地名も"/"区切りで表示（ユーザー選択: 案B「マルチカラー」。`originAccent.js`自体は変更なし）
- `features/graph/utils/recordConnectionsLayout.js`: 記録詳細の「つながり」図（ハブ&スポーク）で、産地の固定1スロットを、産地の数だけ横に扇状へ広げる形に変更（flavorの扇形ロジックと同じ考え方）
- `RecordFormPage.jsx`のDiscover産地プリフィル（`?originName=`）は、単一産地のまま`originIds`配列の1要素として適用するだけで対応（Discoverの提案自体は常に1産地のため変更不要）
- `RecordFilters.jsx`/`RecordsPage.jsx`の`originIds`フィルター（複数産地のOR検索）はMongoDBの`$in`の性質上、変更不要で動作継続

**docs**: `domain-model.md`（産地=複数参照へ更新、TS化後の古いパス参照も修正）・`features.md`のDiscover節（「その産地の記録が2件未満」→「その産地を含む記録が2件未満」、ブレンド集計の前提を明記）・`design.md`（ブレンド時のマルチカラーバー表示の設計意図を追記）。

**データフロー**: `RecordForm`の`ChipMultiSelect`（`originIds`配列）→`POST/PATCH /api/coffee-records`（`validateMultiRef`で検証、`pickCoffeeRecordFields`で抽出）→`verifyReferencesExist`（実在確認）→`CoffeeRecord.originIds`（配列、保存時に重複除去）→`coffeeRecordSerializer.js`が`origins: [{id,name,countryCode}]`へ変換→フロントの各表示（記録カード・詳細・グラフ・つながり図）・集計（Insights/Stats/Discover/SimilarRecords）が配列を前提に処理。

**実行したテストと結果**: `cd backend && npm run typecheck && npm test`（0エラー、33 suites/533 tests成功）。`cd frontend && npm run lint && npm test && npm run build`（0エラー、48 files/338 tests成功、ビルド成功）。バックエンドのテスト修正は、`createRecordFor`に`originId: X`を渡していた約50箇所を`originIds: [X]`へ機械的に置換し、graphBuilder/insightBuilder/statsBuilder/discoverBuilder/searchBuilder/similarRecordsBuilder/entityDetailBuilderの各ユニットテストのfixtureも同様に配列化した。claude-in-chromeでdocker-compose環境（demoユーザー）を実機確認: デモデータを再投入（既存15件を削除→ブレンド2件を含む17件を再seed）した上で、(1) 記録一覧・Homeでブレンド記録がマルチカラーバー+"/"区切り名で表示されること、(2) 新規記録作成でChipMultiSelectから産地を複数選択して保存できること（Ethiopia+Kenyaで作成→Coffee Detailsに2産地のpill、つながり図に2つのoriginノードが扇状に表示、似た記録セクションが既存のブレンド記録を正しく共通属性2件として拾うことを確認）、(3) Statsページの産地ランキングでEthiopiaが単一原産記録4件+ブレンド記録2件=6件と正しく集計されていることを確認。テスト後に作成した確認用記録は削除済み。

**未解決事項**: 前回エントリと同じ（`docs/design.md`「Design Tokens」節のグラフノード配色の記述が古い。CTA色の再検討は保留）。デプロイ済みDB（Render/Atlas）に本番相当のデータがある場合、既存レコードの`originId`フィールドは新スキーマ下で単に無視され`originIds`は空配列になる（データ欠損ではなくフィールド名変更）。実運用データがあるなら`originId`→`originIds:[originId]`への1回限りの移行スクリプトが必要かもしれないが、現時点でそのようなデータの有無は未確認（ユーザーに確認が必要）。

**次に実装すべき最小単位**: デプロイ済み環境（Render/Atlas）のデータ移行要否をユーザーに確認し、必要なら`originId`→`originIds`変換スクリプトを書く。それ以外は前々回エントリと同じ（`docs/design.md`のグラフノード配色の記述修正）。

---

### 2026-09-14: 「コーヒーの詳細」を複数グループ持てる構造へ再設計（branch `feat/blend-coffee-components`）

前回エントリ（産地のみを`originIds`配列化）をマージした直後、ユーザーから「産地と精製方法の対応関係が失われる（どの産地がどの精製方法だったか分からない）」という指摘があり、「豆を個別に記録できるようにしたい。コーヒーの詳細を任意個用意できるようにしたい」という依頼を受けた。産地・農園・品種・精製方法の4項目を独立した配列として持つのではなく、**1つのサブドキュメント（component）にまとめ、記録はcomponentsの配列として複数グループを持てる**構造へ全面的に作り直した。

ユーザーとの相談で決定したスコープ:
- **componentごと（配列）**: 産地・農園・品種・精製方法
- **記録全体で1つのまま（変更なし）**: 評価・メモ・味覚グラフ6軸・焙煎度・焙煎者/ロースター・フレーバー・カフェ名

このスコープにより、精製方法も産地と同様に記録全体では複数になりうる（componentごとに1つ）という波及があった。

**backend**:
- `models/CoffeeRecord.ts`: `originIds`/`varietyIds`/`processId`/`farmName`（すべて記録直下）を削除し、`components: [{ originId, farmName, varietyIds, processId }]`（`_id: false`のサブドキュメント配列）へ統合。インデックスも`{userId:1, "components.originId":1}`のドット記法へ
- `validators/coffeeRecordValidator.js`: `validateComponents`を新設（componentsの配列検証、上限10件、各グループの産地/精製方法/品種IDを検証。エラーは`components.0.originId`のようなインデックス付きキーで返す）
- `validators/recordFilterValidator.js`: `originIds`/`processIds`/`varietyIds`クエリの絞り込み先を`components.originId`等のドット記法へ（MongoDBの`$in`は配列内サブドキュメントのフィールドに対しても「いずれかの要素が一致」として働くため、フィルターの挙動自体は変わらない）
- `repositories/coffeeRecordRepository.ts`: populateを`components.originId`/`components.varietyIds`/`components.processId`のネストパスへ（Mongooseは配列内サブドキュメントのフィールドもドット記法でpopulateできる）
- `services/coffee/masterDataService.js`の`verifyReferencesExist`: componentsの中の産地・品種・精製方法IDを全component横断で集約してから実在確認するよう変更
- `services/coffee/coffeeRecordSerializer.js`: `origins`/`process`/`farmName`等を`components: [{ origin, farmName, farmNodeId, varieties, process }]`へ統合するシリアライズに変更（APIレスポンス形状の破壊的変更）
- `core/graph/graphBuilder.js`の`collectAttributeRefs`: 産地・農園・品種・精製方法の抽出を、componentsをループしてグループごとに展開する形へ（1つのcomponent内で完結させることで、産地と精製方法の対応関係を保つ）
- `core/insights/insightBuilder.js`: `findTopCombination`（産地×精製方法の組み合わせ）を、record全体のorigin一覧×process一覧の総当たりではなく、**同じcomponent内のorigin/processだけをペアにする**形へ書き直した（これが今回の設計の核心——ブレンド記録でも実在する組み合わせだけを数える）。`findTopOrigin`/`findTopProcessRating`もcomponentsから展開する`groupByMultiRef`へ統一し、単数専用の`groupBySingleRef`は不要になり削除
- `core/stats/statsBuilder.js`: 産地・精製方法・品種の集計をすべてcomponentsから展開する`groupByMultiRef`へ統一（`groupBySingleRef`削除）。農園の種類数もcomponentごとのfarmNameを横断して集計
- `core/discover/discoverBuilder.js`: `findDominantProcess`を「その産地とペアになっているcomponentのprocessだけ」を見る形に書き直した。以前（前回PRの実装）は記録全体のprocess一覧を見ていたため、ブレンド記録で別の産地の精製方法を誤って提案の根拠にしてしまう可能性があった
- `core/diagnosis/diagnosisBuilder.js`: `summarizeDominantProcess`/`summarizeDominantVariety`をcomponentsから展開する形へ修正（**前回PRの実装漏れ——`record.process`/`record.varieties`という無くなったフィールドを参照したままになっていた。今回のテストで発覚し合わせて修正**）
- `services/coffee/originLookup.js`: componentsを横断して産地を検索する形へ
- `seeds/data/demoRecords.js`・`seedDemoData.js`: デモデータを`components: [{ origin, farmName, varieties, process }]`形式へ全面書き換え。2件のブレンドデモ記録は、産地ごとに異なる精製方法（Ethiopia×Natural + Guatemala×Washed 等）を持たせ、対応関係が保たれることを実データで確認できるようにした

**frontend**:
- `useRecordForm.js`: フォーム状態を`components`配列（`{originId, farmName, varietyIds, processId}`の配列）で管理する形へ全面書き換え。`addComponent`/`removeComponent`/`setComponentValue`/`toggleComponentValue`を新設
- `RecordForm.jsx`＋新設`CoffeeComponentFields.jsx`: 産地・農園・品種・精製方法の入力欄を、「＋ コーヒーの詳細を追加」ボタンで任意個繰り返せるUIへ再設計。新規作成時は0グループから始まり、Record First（未入力でも保存できる）を維持
- `recordFormValidation.js`: `toApiPayload`が`components`配列を組み立てる形へ
- `recordFormat.js`の`collectCoffeeDetails`: 戻り値を`{ components: Array<Array<row>>, shared: Array<row> }`へ変更（産地・農園・品種・精製方法はcomponentごとに独立した行の集まり、焙煎度・ロースター名・フレーバーは記録全体で1つの`shared`）
- `RecordDetailPage.jsx`: Coffee Information（Property Grid）の表示を、componentが複数（ブレンド）のときだけ「コーヒー1」「コーヒー2」の見出しと枠で区切って表示し、単一（シングルオリジン）のときは以前と同じ見た目のまま
- `RecordCard.jsx`/`HomeRecordCard.jsx`: 産地に加え精製方法もcomponentsから複数展開して表示するよう変更（"/"区切りまたは複数タグ）
- `recordConnectionsLayout.js`: 精製方法も産地と同様に複数になりうるため、左側の固定1スロットから縦方向の扇形レイアウトへ変更

**docs**: `domain-model.md`に「コーヒーの詳細（components）」節を新設し、なぜ配列ではなくサブドキュメントの配列にしたか（対応関係を保つため）を明記。`features.md`のDiscover節を「同じcomponent内でペアになっている精製方法」という正確な説明に更新。`design.md`のNew/Edit Record・Record Detail節を新UIに合わせて更新。

**データフロー**: `RecordForm`の「＋ コーヒーの詳細を追加」で`values.components`に1グループ追加 → 各グループの産地/農園/品種/精製方法を入力 → `POST/PATCH /api/coffee-records`（`validateComponents`で検証）→`verifyReferencesExist`（componentsを横断して実在確認）→`CoffeeRecord.components`（サブドキュメント配列、保存時に各グループのvarietyIdsを重複除去）→`coffeeRecordSerializer.js`が`components: [{origin, farmName, farmNodeId, varieties, process}]`へ変換→フロントの記録詳細はcomponentごとにグループ化して表示、知識グラフ・Insights/Stats/Discoverはcomponentsを展開して集計（産地×精製方法の組み合わせは同じcomponent内のペアのみ）。

**実行したテストと結果**: `cd backend && npm run typecheck && npm test`（0エラー、33 suites/552 tests成功。前回の533件から19件増加——`findTopCombination`のペアリング検証・`uniqueRefs`の重複除去検証・componentsのバリデーション網羅などを追加）。`cd frontend && npm run lint && npm test && npm run build`（0エラー、48 files/344 tests成功、ビルド成功）。バックエンドのテスト修正は、graphBuilder/insightBuilder/statsBuilder/discoverBuilder/searchBuilder/similarRecordsBuilder/entityDetailBuilder/diagnosisBuilderの各ユニットテストのfixtureを`components: [{origin, farmName, varieties, process}]`形式へ全面書き換え、API統合テスト（coffeeRecordApi/graphApi/searchApi/statsApi/insightApi/discoverApi/similarRecordsApi/diagnosisApi）の`createRecordFor`呼び出しも同様に変換した。claude-in-chromeでdocker-compose環境（demoユーザー）を実機確認: デモデータを再投入した上で、(1) 記録一覧でブレンド記録が複数の精製方法タグ（例:「Natural Washed」）を正しく表示すること、(2) 新規記録作成フォームで「＋ コーヒーの詳細を追加」から2グループ（Ethiopia×Natural、Kenya×Washed）を作成し、詳細ページのCoffee Informationが「コーヒー1」「コーヒー2」に分かれて産地と精製方法の対応が保たれていること、つながり図で産地・精製方法がそれぞれ扇状に配置されること、似た記録セクションが正しく共通属性4件（Ethiopia/Natural/Kenya/Washed）を拾うことを確認、(3) Statsページの精製方法ランキングでWashed/Naturalがブレンド記録も含めて正しく集計されている（Washed 11件、Natural 5件）ことを確認。テスト後に作成した確認用記録は削除済み。

**未解決事項**: 前回エントリと同じ（`docs/design.md`「Design Tokens」節のグラフノード配色の記述が古い。CTA色の再検討は保留。デプロイ済みDBのデータ移行要否は未確認）。今回のスキーマ再変更で、前回PRの移行検討（`originId`→`originIds`）はそのまま不要になった（`originId`→`components`への1回限りの移行が必要な場合、改めてスクリプトを書く必要がある）。

**次に実装すべき最小単位**: デプロイ済み環境（Render/Atlas）のデータ移行要否をユーザーに確認する。それ以外は前々々回エントリと同じ（`docs/design.md`のグラフノード配色の記述修正）。

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

Insight機能（`feat/insights`）追加時に`cd backend && npm test`を再実行し、Test Suites: 14 passed, Tests: 242 passed（Insight関連16件を含む）を確認済み。`cd frontend && npm run lint && npm run build`もあわせて成功を確認済み。2026-08にmainへmerge済み。

横断検索・カフェのグラフノード化（`feat/search-and-cafe`）追加時に`cd backend && npm test`を再実行し、Test Suites: 16 passed, Tests: 260 passed（search関連17件・cafeノード関連1件を含む）を確認済み。`cd frontend && npm run lint && npm run build`もあわせて成功を確認済み（テスト実行中に一度、システムのメモリ逼迫と思われる原因でMongoDB接続タイムアウトが発生したが、再実行で全件成功することを確認し、コードの問題ではないと判断した）。

エンティティ詳細ページ（`feat/entity-detail-pages`。`feat/search-and-cafe`から分岐したため、これをmainへmergeすると両方の変更が同時に入る）追加時に`cd backend && npm test`を再実行し、Test Suites: 17 passed, Tests: 273 passed（entityDetail関連9件・graphApiの新エンドポイント関連4件を含む）を確認済み。`cd frontend && npm run lint && npm run build`もあわせて成功を確認済み。

統計ページ（`feat/stats-page`）追加時に`cd backend && npm test`を再実行し、Test Suites: 19 passed, Tests: 286 passed（stats関連13件を含む）を確認済み。`cd frontend && npm run lint && npm run build`もあわせて成功を確認済み。

Statsページの3段構成＋Collectionセクション追加時に`cd backend && npm test`を再実行し、Test Suites: 21 passed, Tests: 311 passed（statsBuilder関連14件を含む）を確認済み。`cd frontend && npm run lint && npm run build`もあわせて成功を確認済み。

「本番品質」改善Tier 0（不要ファイル削除）時は、バックエンドのコード変更が無いため`cd backend && npm test`は未実施。`cd frontend && npm run lint && npm run build`の成功のみ確認済み。

「本番品質」改善Tier 1（セキュリティの基本装備）時に`cd backend && npm test`を再実行し、Test Suites: 23 passed, Tests: 330 passed（authController/userController関連19件を含む）を確認済み。Docker Compose環境の実機（curl）でもhelmetヘッダー・rate limit・パスワードハッシュ化・バリデーションの動作を確認済み。

「本番品質」改善Tier 2（既知のレスポンシブ崩れ・表示一貫性の解消）時は、フロントエンドのみの変更のため`cd backend && npm test`は未実施。`cd frontend && npm run lint && npm run build`の成功と、Docker Compose環境でウィンドウ幅380pxに実際にリサイズした上での目視確認を実施済み。

「本番品質」改善Tier 3（README技術面の修正・スクリーンショット・アーキテクチャ図）時は、コード変更を伴わないため（README.md・画像ファイルのみ）`cd backend && npm test`は対象外。`cd frontend && npm run lint && npm run build`の成功のみ確認済み（Markdown/画像の変更でも既存コードに影響が無いことの確認として実施）。

「本番品質」改善Tier 4（アクセシビリティ）時は、フロントエンドのみの変更のため`cd backend && npm test`は未実施。`cd frontend && npm run lint`（`eslint-plugin-jsx-a11y`導入後、0件）・`npm run build`の成功と、ConfirmDialogのフォーカストラップをブラウザで実際に操作しての確認を実施済み。

「本番品質」改善Tier 5（フロントエンドのテスト基盤）とnpm audit解消時に、`cd frontend && npm run lint && npm test && npm run build`（新規21テストすべて成功）、`cd backend && npm test`（`npm audit fix`後のリグレッション確認、23 suites / 330 tests）をあわせて実行し、いずれも成功を確認済み。

mobbin.com刷新一式のブラウザ実機確認・`.auth-card-kicker`修正時（2026-08-19）は、CSS1行の変更のみのため`cd backend && npm test`は未実施。`cd frontend && npm run lint && npm run build`の成功と、claude-in-chromeによるDocker Compose環境（`http://localhost:5174`）での実機確認（Home/Records/Graph/Stats/Login/Register/RecordDetail/EntityDetailの各画面、コンソールエラー無し）を実施済み。

New Record・Editボタンの見づらさ修正時（2026-08-19）は、CSS1行（`a`セレクタを`@layer base`で囲む）の変更のみのため`cd backend && npm test`は未実施。`cd frontend && npm run lint && npm run build`の成功と、`getComputedStyle`による修正前後の`color`値比較、Records/RecordDetail/RecordFormの各画面でのzoom screenshot目視確認を実施済み。

デスクトップ表示の左右余白解消時（2026-08-19）は、frontendのみの変更（新規`styles/pageContainer.js`+7ページのclassName置き換え）のため`cd backend && npm test`は未実施。`cd frontend && npm run lint && npm run build`の成功と、claude-in-chromeでウィンドウ幅1800px相当にリサイズした上でのHome/Records/Stats/RecordDetail/RecordFormの目視確認、`getBoundingClientRect`による実測幅の確認を実施済み。

コーヒー診断機能追加時（2026-08-24）に`cd backend && npm test`を再実行し、Test Suites: 27 passed, Tests: 416 passed（diagnosis関連13件を含む）を確認済み。`cd frontend && npm run lint && npm run build`もあわせて成功を確認済み。Docker Compose環境（`http://localhost:5174`）でのclaude-in-chrome実機確認（Home/Diagnosis/Statsの各画面、日英切り替え、コンソールエラー無し）も実施済み。

Graph画面の作り込み（ノードサイズ・混雑・リサイズ・クリック判定・カメラ追従）時（2026-08-26）は、backendの変更が無いため`cd backend && npm test`は未実施。`cd frontend && npm run test`（新規24件を含む5 test files / 58 tests すべて成功）・`npm run lint && npm run build`の成功と、claude-in-chrome実機確認（ノードサイズ差・リサイズ追従・クリック・カメラ自動フィットの再開・パン操作、コンソールエラー無し）を実施済み。同日追記した孤立ノードの中心引き戻し（`forceX`/`forceY`）についても、複数回のフレッシュリロードで孤立ノードが集団の近くに収まること、開始から収束までの動きが自然であることを確認済み。

UI/UXの作り込み（全体レビューの修正＋色使い・導線の一貫性強化）時（2026-08-27）は、backendの変更が無いため`cd backend && npm test`は未実施。`cd frontend && npm run lint && npm run test && npm run build`（58 tests、既存のまま）すべて成功。claude-in-chromeで、Graph画面リロード後のノード配色、EntityDetail・Diagnosisの戻る導線、Home/Records間の空状態表示統一、Diagnosisのarchetypeカラー、記録フォームの2カラム化と編集時の初期展開、RecordDetailの区切り線、Graphのフィルター/凡例の見出し、リストの初期表示（空白フラッシュ無し）を確認済み。全画面でコンソールエラー無し。

Graph画面のノード検索追加時（2026-08-27）は、backendの変更が無いため`cd backend && npm test`は未実施。`cd frontend && npm run lint && npm run test && npm run build`（58 tests、既存のまま）すべて成功。claude-in-chromeで、検索によるノード絞り込み・選択・カメラの自動パン/ズーム、該当なし表示、外側クリックでの閉じる動作を確認済み。コンソールエラー無し。

World Map機能追加時（2026-08-28）に`cd backend && npm test`を再実行し、Test Suites: 27 passed, Tests: 418 passed（graphBuilder関連2件を含む）を確認済み。`cd frontend && npm run lint && npm run test && npm run build`（68 tests、新規5件を含む）もあわせて成功を確認済み。Docker Compose環境で両コンテナへ`npm install`後、claude-in-chromeで`/map`ページの実機確認（訪問済み産地のハイライト・ホバーツールチップ・クリックでのエンティティ詳細遷移・空状態、コンソールエラー無し）を実施済み。

### 2026-09-14: 記録フォームのUI/UX再設計（branch `feat/record-form-visual-polish`）

ユーザーから「コーヒーを記録するページについて、記録体験を向上させるというテーマでUI/UXを再設計したい」という依頼。特定の不満点は無く、ゼロから方向性を相談した。AskUserQuestionでの複数ラウンドの相談の結果、以下2方向に絞った（「記録カードのライブプレビュー」案は検討の結果、実装を見送り。「タイトル欄を目立たせる」案は選ばれず対象外）。

**1. 選択肢への知識グラフの視覚言語の反映**:
- `features/coffee-records/components/OriginPicker.jsx`（新設）: 産地の入力を、ネイティブ`<select>`から単一選択のチップピッカーへ置き換え。各チップに`utils/originAccent.js`の`getOriginAccentClass`（記録カード・グラフ・世界地図で既存使用中）で色ドットを表示する。ネイティブ`<option>`には信頼できる背景色スタイリング手段が無いための対応（`ChipMultiSelect.jsx`の単一選択版という位置付け）
- `features/coffee-records/components/AttributeLabel.jsx`（新設）: `FormField`のlabelに`features/graph/utils/nodeVisuals.js`の`getNodeVisual(type)`アイコンを添える小さなラッパー。産地・農園・品種・精製方法・焙煎度・フレーバーの計6箇所（`CoffeeComponentFields.jsx`に4箇所、`RecordForm.jsx`に2箇所）へ適用
- 精製方法・焙煎度は`nodeVisuals.js`上も値ごとの色を持たない（種別1つにつき1色）ため、ネイティブ`<select>`のまま変更していない

**2. 保存の瞬間の演出**:
- `RecordFormPage.jsx`の`handleFormSubmit`: 保存成功後、`window.matchMedia("(prefers-reduced-motion: reduce)")`を確認し、reduceでなければ`isJustSaved`をtrueにしてから約450ms待って`navigate()`する（reduceの場合は従来どおり即座に遷移）
- `RecordForm.jsx`: `isJustSaved`propを受け取り、保存ボタンのアイコンを`Loader2`（送信中）→`Check`（保存直後）、ラベルを`t("common.saving")`→新規`t("common.saved")`（ja: 「保存しました」/ en: "Saved"）へ切り替える。ボタンの色・形（`primaryButtonClass`）は変更しない（`docs/design.md`の「静かな道具」という世界観を踏襲し、過去にHome画面のCTAで「派手すぎる」という指摘を受けた経緯を踏まえた）

**テスト環境の不足発見**: jsdomが`window.matchMedia`を実装しておらず、`RecordFormPage.test.jsx`の保存テストが`TypeError: window.matchMedia is not a function`で失敗した。`IntersectionObserver`と同じ既存パターンに倣い、`src/test/setup.js`へ常に`matches: false`を返す最小限のダミー実装を追加して解消した。

`docs/design.md`の「New / Edit Record」節に、上記2点の設計意図（ライブプレビュー見送りの経緯は書かず、採用した2点のみ）を追記した。バックエンドの変更は無し（表示・入力体験のみのフロントエンド完結の変更のため、`cd backend && npm test`は未実施）。

**データフロー**: `CoffeeComponentFields.jsx`/`RecordForm.jsx`の`OriginPicker`/`AttributeLabel`は表示のみの変更で、`useRecordForm.js`の状態管理・API送信ロジックには変更が無い。保存成功時のみ、`RecordFormPage.jsx`の`navigate()`呼び出しが`isJustSaved`のstate更新を挟んで約450ms遅延する（`justSavedRef.current = true`によるuseBlockerスキップは従来どおり同期的に発生するため、確認ダイアログ挙動への影響は無い）。

**実行したテストと結果**: `cd frontend && npm run lint && npm run test && npm run build`（0エラー、48 files/344 tests成功、ビルド成功）。claude-in-chromeでdocker-compose環境（demoユーザー）を実機確認: (1) 新規記録作成フォームで「＋ コーヒーの詳細を追加」→産地チップに産地ごとの色ドットが表示され、Ethiopiaを選択・選択状態のハイライトを確認、(2) 産地・農園・品種・精製方法・焙煎度・フレーバーの各labelに種別アイコンが表示されることを確認、(3) 保存後にトースト（チェックマーク+「記録しました」）が表示され、記録詳細ページへ正しく遷移し、つながり図にEthiopiaノードが反映されていることを確認。コンソールエラー無し。テスト後に作成した確認用記録は削除済み。

**未解決事項**: 前回エントリと同じ（`docs/design.md`「Design Tokens」節のグラフノード配色の記述が古い可能性。デプロイ済みDBのデータ移行要否は未確認）。

**次に実装すべき最小単位**: デプロイ済み環境（Render/Atlas）のデータ移行要否をユーザーに確認する。それ以外は前回エントリと同じ（`docs/design.md`のグラフノード配色の記述修正）。

### 2026-09-15: 記録体験の刷新 — レシート型フォーム＆保存後の「発見」（branch `feat/record-experience-redesign`）

前回（記録フォームへの視覚言語反映・保存演出）に続き、ユーザーから
「現状は一般的なデータ入力画面という感じで、このアプリの個性を出したい」
というフィードバックを受けた。ユーザー提示のモックアップ（レシート/
チケット風カード、味覚のスライダー入力、保存後に発見を見せる画面）を
たたき台に、AskUserQuestionでの複数ラウンドの議論を経て方針を確定した:
(1) 記録フォームをレシート型の単一カードへ全面刷新、(2) 抽出の詳細
（BREW）は既存方針どおりフォームに含めない、(3) 味覚6軸はスライダーへ
変更し常時表示化、(4) 保存後に専用のインタースティシャル画面で「発見」
（初登場・マイルストーン到達）を見せる。実装前にExploreエージェント2体
（フロントエンドの既存UI資産／バックエンドの発見検出ロジック候補）と
Planエージェント1体を使って設計を検証してから着手した。

**backend（discoveries検出）**:
- `core/graph/graphBuilder.js`の`collectAttributeRefs`をexport（挙動は
  変更しない。1レコードの属性参照を正規化する唯一の場所を、発見検出でも
  再利用するため）
- 新規`core/discoveries/discoveryBuilder.js`（純粋関数、`similarRecordsBuilder.js`
  と同じ構成）: `buildDiscoveries(existingRecords, newRecord, flavorsByNormalizedName)`。
  保存前の自分の記録群から属性ごとの登録回数を集計し、新規レコードが
  持つ属性について「保存前カウント0→`firstAppearance`」「区切りの良い
  件数(2,3,5,10)に到達→`milestone`」を判定する。保存後の全件再取得は
  不要（新規レコード自身の属性を+1した値で差分が求まるため）。keyword型
  （notesの自動抽出、ユーザーが選んだ値ではない）は対象外。1回の保存で
  最大3件（firstAppearance優先、milestoneはrecordCount降順）
- `services/coffee/graphService.js`の`loadFlavorsByNormalizedName`をexport
- `services/coffee/coffeeRecordService.js`の`createRecord`: 戻り値を
  `serializeCoffeeRecord`単体から`{ record, discoveries }`へ変更。作成前に
  `coffeeRecordRepository.findAllForUser`で既存記録を取得しdiscoveries計算に使う。
  `updateRecord`（PATCH）は変更せず、発見演出は作成時のみ（編集は「新しい
  体験を記録した」文脈ではないため）
- `controllers/coffeeRecordController.js`の`createCoffeeRecord`:
  レスポンスへ`discoveries`を追加（`{ data: record, discoveries }`）

**frontend（レシート型フォーム）**:
- `RecordForm.jsx`: 3枚のカードに分かれていた構成を、`divide-y
  divide-dashed divide-line/60`で区切る1枚のカードへ全面書き換え。
  ゾーン構成はHEADER（title/consumedAt/recordType/cafeName）→COFFEE
  DETAILS（段階的開示、既存ロジック維持）→TASTE（常時表示、新設）→
  NOTES→FOOTER（総合評価★+保存ボタン）。`useRecordForm`との契約
  （values/setValue/addComponent等）は一切変えず、JSX構成のみ変更。
  新しい色トークンは追加せず、既存の`line/60`・`font-mono`・
  `CoffeeComponentFields.jsx`と同じ見出しクラスだけでレシート感を表現した
- `hasExistingCoffeeDetails`/`hasHiddenError`からTASTE_AXESを除外
  （TASTEが常時表示になったため、Coffee Detailsの自動展開判定の対象外にした）
- 新規`TasteSliderInput.jsx`: 味覚6軸の入力を`RatingInput`（★5段階）から
  `<input type="range" min={0} max={5}>`へ変更。値の型（""または"1"〜"5"）は
  変えない。min=0を「未評価」専用の値として扱い、中間値を仮の初期値に
  しない設計（3を初期表示すると「3が選ばれている」ように誤認されるため）
- `formStyles.js`に`zoneHeadingClass`を追加（ゾーン区切りの破線は
  1箇所でしか使わないため`divide-y`をRecordForm.jsx側に直接適用）

**frontend（保存後の発見インタースティシャル）**:
- `coffeeRecordApi.js`: `createCoffeeRecord`/`updateCoffeeRecord`の戻り値を
  `record`単体から`{ record, discoveries }`へ変更（PATCHは常に`discoveries: []`）。
  **影響範囲**: `BrewDetailsCard.jsx`（抽出の詳細のインライン編集、PATCH呼び出し）
  も`{ record: updated }`への分割代入に修正が必要だった
- 新規`SaveDiscoveryReveal.jsx`: 記録のタイトル・評価（★、`RecordDetailPage.jsx`
  と同じバッジ）+発見ごとに`getNodeVisual(nodeType)`のアイコン・色+文言+
  「つながりを見る」（エンティティ詳細ページへのリンク）を表示。バッジ・
  紙吹雪・効果音などのゲーミフィケーション演出は入れず、テキストと
  既存の視覚言語だけで構成（過去のHome画面CTA「派手すぎる」指摘を踏まえた）
- `graph/utils/entityLink.js`に`entityDetailPathFromNodeId(nodeId)`を追加
  （discoveriesは`{type}:{id}`形式で組み立て済みのnodeIdを返すため）
- `RecordFormPage.jsx`: `handleFormSubmit`成功後、`discoveries.length > 0`
  なら`revealDiscoveries` stateをセットして`SaveDiscoveryReveal`を表示
  （ヘッダーごと差し替え）、0件なら従来通りチェックマーク演出→即座に
  詳細ページへ遷移。`justSavedRef.current`は従来どおり同期的にtrueへ
  セットするため、発見画面表示中もuseBlockerの確認ダイアログは出ない
- i18n新規名前空間`discoveries`（`ja.json`/`en.json`に
  savedHeading/firstAppearance/milestone/viewConnection/continue）

**docs**: `docs/design.md`「New / Edit Record」を全面刷新後の構成
（HEADER/COFFEE DETAILS/TASTE/NOTES/FOOTERゾーン）と保存後の発見の説明に
更新。`docs/features.md`に新規「Save Discoveries」節を追加（Insight・
Discover・Similar Recordsと同じ構成: Purpose/なぜAI推薦ではないか/閾値/
対象範囲/Source of Truth/Response Shape/表示）、機能一覧にも追記した。

**データフロー**: `RecordForm`の入力（TasteSliderInput/CoffeeComponentFields等）
→`POST /api/coffee-records`→`coffeeRecordService.createRecord`が保存前に
`findAllForUser`で既存記録を取得→`coffeeRecordRepository.create`で保存→
`buildDiscoveries(既存記録, 新規記録)`で発見を計算→
`{ data: record, discoveries }`を返す→フロントの`coffeeRecordApi.js`が
`{ record, discoveries }`に整形→`RecordFormPage.jsx`がdiscoveriesの有無で
分岐（`SaveDiscoveryReveal`表示 or 従来の保存演出）。

**実行したテストと結果**: `cd backend && npm run typecheck && npm test`
（0エラー、35 suites/573 tests成功。discoveryBuilder.test.js新規8件、
coffeeRecordApi.test.jsへdiscoveries系4件・PATCH確認1件を追加）。
`cd frontend && npm run lint && npm test && npm run build`（0エラー、
52 files/357 tests成功、ビルド成功）。フロントのテスト修正は、
`createCoffeeRecord`/`updateCoffeeRecord`のモック戻り値を`{ record, discoveries }`
形式へ揃える必要があった箇所（`RecordForm.test.jsx`・`useRecordForm.test.js`・
`RecordFormPage.test.jsx`・`BrewDetailsCard.test.jsx`）を修正し、
`RecordFormPage.test.jsx`にはモジュールスコープの`vi.fn()`が呼び出し回数を
テスト間で引き継いでしまう問題（`beforeEach`での`mockReset()`追加で解消）も
見つかり修正した。claude-in-chromeでdocker-compose環境（demoユーザー）を
実機確認: (1) レシート型カードのゾーン区切り・TASTE常時表示・Coffee
Detailsの段階的開示（開閉挙動は従来どおり）を確認、(2) TasteSliderInput
のクリック・矢印キー操作、Home キーで「未評価」に戻ることを確認、
(3) 記録したことのない産地（Yemen）で新規作成→発見インタースティシャルに
「Yemenを初めて記録しました」+★評価バッジが表示され、「つながりを見る」で
正しいエンティティ詳細ページ（記録数1件）へ遷移することを確認、(4) 同じ
産地で2件目を作成→「Yemenを含む記録が2件になりました」（milestone）が
表示されることを確認、(5) 発見が無い保存では従来どおりインタースティシャルを
挟まず即座に詳細ページへ遷移することを確認。コンソールエラー無し。
確認用に作成した2件の記録は削除済み。

**未解決事項**: 前回エントリと同じ（`docs/design.md`「Design Tokens」節の
グラフノード配色の記述が古い可能性。デプロイ済みDBのデータ移行要否は
未確認）。加えて今回、属性間の多段階パス検出（「Gotiti→Peach→Washed
Ethiopia」のような2ホップのつながり表現）は意図的にスコープ外とした
（堅実な範囲＝初登場＋マイルストーンのみを選択したため）。将来検討する
場合、現在の記録↔属性の二部グラフだけでは表現できず、属性→記録→別属性の
2ホップ探索を新設する必要がある。

**次に実装すべき最小単位**: デプロイ済み環境（Render/Atlas）のデータ移行
要否をユーザーに確認する。それ以外は前回エントリと同じ
（`docs/design.md`のグラフノード配色の記述修正）。属性間のつながり検出
（2ホップ探索）を追加する場合は、まずユーザーと必要性を相談する。

---

### 2026-09-17: 記録体験「コーヒーキャンバス」への作り直し（branch `feat/record-experience-redesign`継続）

前回（2026-09-15）のレシート型フォームに対し、「Arcのような世界最高の
アプリを目指している」という方針のもと「モックと違う、やり直し」という
強いフィードバックを受けた。実コードを直接書き換えるのではなく、
Artifactでのモックアップ検討を先行させる進め方に切り替えた。

**モックアップの試行錯誤（実コード変更なし）**:
1. 「Coffee Canvas」（産地バッジ・六角形の味覚レーダーを直接操作する
   キャンバス案）を作成、承認された
2. 実データ件数（産地20件・フレーバー約41種等）で組んだ「Coffee Canvas
   v2」で、フレーバー・農園・品種等をすべてインライン常時表示にした
   ところ、キャンバス自体が縦に長くスクロールする状態になり
   「スクロールするのはゴミアプリの象徴」という指摘を受けた
3. 「産地の色でキャンバス全体を染める」演出も「ダサい」という指摘で撤回
4. 対応案として、任意項目を「現在値を示す小さいボタン（クリックで
   ポップオーバー編集）」にする構成へ変更。ポップオーバーの開く位置が
   不自然という指摘を受け、ボタンの実座標を基準にした位置計算＋画面端
   での自動反転を追加
5. フレーバー（41件）・品種（13件）はチップを全展開すると
   ポップオーバーが巨大化するという指摘を受け、選択済みタグ＋検索欄＋
   最大6件の絞り込み候補という検索式タグ入力（GitHubのラベル選択・
   Notionのマルチセレクトと同型）へ差し替えた。ポップオーバーの大きさが
   「選んだ数」で決まり「選べる総数」に左右されなくなった
6. 書体（Inter統一かFraunces新規導入か）はユーザー判断でInter維持を選択。
   実務での妥当性をWebSearchで確認（Linear/Notion=Inter、Vercel=Geist、
   Stripe=Söhne。いずれも単一サンセリフ書体、装飾的な組み合わせは
   マーケティングサイト寄りの手法という傾向を確認した）

**実コードへの反映**:
- 新規`TasteRadarInput.jsx`: 六角形レーダーの頂点をPointer Eventsで
  ドラッグして味覚6軸を入力する。ジオメトリは表示用`TasteRadarChart.jsx`
  と共有するため`tasteRadarLayout.js`へ`RADAR_CENTER`/`RADAR_MAX_RADIUS`/
  `radarAxisUnitVector`/`radarPointOnAxis`を追加export（既存の
  `buildTasteRadarLayout`の挙動は変更なし）。各頂点は`role="slider"`+
  `tabIndex`+矢印キー/Home/Endのキーボード操作にも対応（旧
  `TasteSliderInput.jsx`は削除）
- 新規`OriginBadgePicker.jsx`: 産地の円形バッジ選択（旧`OriginPicker.jsx`
  のチップ選択を置き換え、削除）。`getOriginHex`（既存の20産地対応表）を
  そのまま使う。旧実装にあった「ラベルへのonClickでlabel/inputの二重
  発火」バグを、onClickをinput要素自体へ付け直すことで修正した
- 新規`DiscoveryBadge.jsx`: 産地選択直後の保存前プレビュー（既存
  `POST /api/discoveries/preview`、バックエンド無改修）を、旧実装の
  トーストから専用の小さいバッジへ差し替え。新規i18nキー
  `discoveries.previewFirstAppearance`/`previewMilestone`（保存後の
  確定文言`firstAppearance`/`milestone`とは文言を分けた。プレビューは
  「〜になります」、確定は「〜になりました」）
- 新規`PropertyButton.jsx`: 任意項目1つぶんの小さいボタン＋
  ポップオーバー。開いたときの座標をボタンの`getBoundingClientRect()`
  から`position:fixed`で計算し（`useLayoutEffect`でペイント前に確定）、
  画面右端・下端に収まらない場合は自動で左寄せ／上向きへ反転する。
  開閉はFramer Motionの`type:"spring"`アニメーション
- 新規`TagCombo.jsx`: 選択肢が多い項目（フレーバー・品種）向けの検索式
  タグ入力。`ChipMultiSelect.jsx`と同じ`{id, options, selectedIds,
  onToggle}`の形を踏襲し、呼び出し側は配線を変えずに差し替えられる
  （`ChipMultiSelect.jsx`自体は他画面用に現存）
- `CoffeeComponentFields.jsx`: 1グループ目（`values.components[0]`）を
  RecordForm.jsx側の産地バッジ＋個別PropertyButtonへ展開したため、この
  コンポーネントは2グループ目以降（ブレンド）専用に単純化した
  （`variant` propを削除）。品種欄もTagComboへ差し替え
- `useRecordForm.js`: `emptyComponent`をexport、新規
  `setPrimaryComponentValue(field, value)`/`togglePrimaryComponentVariety(id)`
  を追加（1グループ目がまだ無い状態から呼ばれた場合、内部で自動的に
  作る）。既存の`setComponentValue`/`toggleComponentValue`等は変更なし
- `RecordForm.jsx`: 全面書き換え。タイトル（大見出し）→産地バッジ＋
  味覚レーダー（sm以上2カラム）→日時・home/cafe（必須、常時表示）→
  「コーヒーの詳細」（フレーバー・農園・品種・精製方法・焙煎度・
  ロースター名・店名・メモをPropertyButton化、常時表示だが折り返す
  ボタンの帯なので選択肢件数に左右されない）＋ブレンド追加→評価・保存。
  産地の色は産地バッジ自体とレーダーの塗り色にのみ使い、キャンバス背景
  全体を染める演出は削除した
- i18n新規キー: `recordForm.chooseOrigin`/`addFlavor`/`addDetails`/
  `blendCount`/`selectedCount`、`common.searchPlaceholder`/`noMatches`。
  `recordForm.addComponent`は「コーヒーの詳細を追加」→「ブレンドを
  追加」に文言変更（この画面では1グループ目が常時表示になり、この
  ボタンは実質ブレンド追加専用になったため）

**docs**: 今回は`docs/design.md`「New / Edit Record」の更新は未着手
（次のエントリで反映予定、下記「次に実装すべき最小単位」参照）。

**データフロー**: 変更なし。作成・更新は従来どおり
`POST/PATCH /api/coffee-records`のみ、発見プレビューも既存
`POST /api/discoveries/preview`をそのまま使う。バックエンド・DBスキーマ
への変更は無い。

**実行したテストと結果**: `cd backend && npm run typecheck && npm test`
（0エラー、35 suites/573 tests成功、無改修）。`cd frontend && npm run
lint && npm run build && npx vitest run`（0エラー、49 files/354 tests
成功）。`RecordForm.test.jsx`を新UIに合わせて全面書き換え
（PropertyButtonのクリック開閉・産地バッジ選択と発見プレビュー・
味覚レーダーのキーボード操作・ブレンド追加/削除を検証）。
claude-in-chromeで実機確認: 産地バッジ選択（レーダーの塗り色反映・
「クリア」リンク）、フレーバーのPropertyButtonを開いて検索→選択→
タグ削除→ボタン表示の更新、日時・home/cafe切り替え、ブレンド追加の
一連の流れをdocker-compose環境（demoユーザー）で確認した。ポップ
オーバーが画面下端付近のボタンから開いても正しく上向きに反転し、
コンテンツが正しく読める位置に表示されることを確認済み。

**未解決事項**:
- モバイル幅（`sm`未満）でのPropertyButtonポップオーバーの見え方・
  タップ操作は未確認（`position:fixed`の座標計算自体はビューポート
  基準のため理論上は動くはずだが、実機・エミュレータでの確認はまだ）
- 編集（`/records/:id/edit`、既存の値が入った状態）での動作は未確認
  （新規作成のみ実機確認済み）
- Artifactモックアップでの自動クリック検証は今回のセッションを通じて
  不安定だった（産地バッジ・フレーバーチップのクリックが反映されたか
  目視できない場面が複数回あった）。実コード側（React実装）は
  claude-in-chromeで個別に実機確認済みのため実害はないが、今後
  Artifactでの検証を行う際はこの制約を踏まえること
- デプロイ済み環境（Render/Atlas）のデータ移行要否は前回から引き続き未確認

**次に実装すべき最小単位**:
1. モバイル幅・編集モードでの実機確認
2. デプロイ済み環境のデータ移行要否をユーザーに確認する（前回から持ち越し）

（`docs/design.md`「New / Edit Record」節は今回のエントリ作成時にあわせて
書き直し済み）

---

### 2026-09-17: 記録フォームの横幅がモックより狭かった問題を修正（branch `feat/record-experience-redesign`継続）

上記「コーヒーキャンバス」作り直し分を実機（claude-in-chrome、docker-compose
環境・demoユーザー）で確認したところ、「幅が狭い」という指摘を受けた。
原因は`RecordForm.jsx`のフォーム本体に残っていた`max-w-4xl`（896px）で、
ページ全体を包む外枠`contentContainerClass`（`max-w-[1200px]`、
`docs/design.md`参照ではなく`frontend/src/styles/pageContainer.js`の
コメント参照）より内側で二重に幅を絞っていた。単一カラムのフォームだった
頃の値がキャンバス化（産地+味覚レーダーの2カラムレイアウト、
「コーヒーの詳細」のボタン群）後も残ったままだったのが原因。

**対応**: `max-w-4xl`を削除し、外枠の1200pxまでフォームが使えるように
した。産地バッジは1行あたり5個→7個、コーヒーの詳細のPropertyButtonは
5個+2個の2行に収まるようになり、Coffee Canvas v2モックアップ
（Artifact）と比べて間延びした印象が解消した。

**実行したテストと結果**: `cd frontend && npm run lint && npm run
build && npx vitest run`（0エラー、49 files/354 tests成功）。
claude-in-chromeで`/records/new`を再確認し、幅が広がったことを
スクリーンショットで確認済み。

**未解決事項**: モバイル幅・編集モードでの実機確認は前回から引き続き未実施。

---

### 2026-09-17: グラフ画面のラベルをフォーカス中のノードだけに絞る

実データ（記録18件・ノード61件）でグラフ画面を確認したところ、全ノードの
ラベルが常時表示されるため、ノード同士やラベル同士が重なって読めなく
なっていた（既存の`chargeStrength`/`linkDistance`調整だけでは根本解決
しないと判断）。ユーザーと相談し、Artifactで4つの再設計案（A: 静かな星図
＝ラベルはホバー時のみ／B: フォーカスモード＝選択ノードの近傍だけ拡大／
C: 諸島マップ＝種別ごとに領域を分ける／D: 一覧＋ミニグラフ＝表がメイン）
を比較検討した上で、Bを軸にする方針で合意した。あわせて「ナビバーから
`?focus=`無しで開いたときに何を初期フォーカスするか」も論点になり、
「何もフォーカスしない（静かな全体俯瞰を初期状態にし、検索/クリック/
他画面からのfocus=で選んだ瞬間だけスポットライトへ遷行）」を選んだ。

**調査してわかったこと**: `GraphCanvas.jsx`には既に`hoveredNodeId`/
`selectedNodeId`と隣接ノード判定（`adjacency`）、それを使った「関連
ノード以外を薄くする」仕組み（`isNodeDimmed`）、選択時だけ隣接ノードへ
ズームする`fitCamera`が実装済みだった。つまり土台は既にB寄りで、
**ラベルの描画条件だけ**が「フォーカスの有無に関わらず常に描く」ままに
なっているのが密集の根本原因だった。想定していたような大きな作り直しは
不要と判明し、`drawNode`のラベル描画部分にのみ条件を追加する形で対応した。

**対応**: `isNodeLabelVisible`関数を追加（`isNodeDimmed`と対になる形）。
`focusId`（ホバー中 or 選択中のノードID）が無ければラベルを描かず、
ある場合はフォーカス対象本人とその隣接ノードだけラベルを描く。アイコン・
色・形は従来通り常時描画するため、種別の判別自体（docs/design.mdの
「色だけで状態を表現しない」）には影響しない。カメラの寄り・ダイミングの
仕組みは変更していない。

**実行したテストと結果**: `cd frontend && npm run lint && npm run build`
（0エラー）。claude-in-chromeで`/graph`を実機確認し、アイドル状態で
ラベルが一切出ないこと、ノードにホバーするとそのノード＋隣接ノードだけ
ラベルが出ることを確認済み。

**未解決事項**: A/C/Dの案（Artifactモックアップとして作成済み）は実装
していない。将来ノード種別の識別性やナビゲーションの起点をさらに見直す
場合の候補として残す。ノード同士の物理的な間隔（`chargeStrength`/
`linkDistance`）自体は今回変更していないため、記録数がさらに増えた
場合の詰まり具合は引き続き未検証（下記「未解決事項」の該当項目参照）。

---

### 2026-09-17: グラフのノードアイコンをPhosphor Icons本体へ全面差し替え

lucide-reactの汎用アイコン（地球儀・水滴・きらめき等）では種別が覚えにくい
というフィードバックを受け、Artifactでの試作（手描きの曲線→崩れて表示が
壊れる不具合を2回踏んだ）を経て、最終的にユーザー提供の参考画像
（Phosphor Icons参考）をもとに、実在の`@phosphor-icons/react`本体の
アイコンへ9種類全て差し替えた。

**対応**: `record: CoffeeIcon` / `origin: MapPinIcon` / `farm: BarnIcon`
（Phosphorの`Plant`はIT文脈で「サーバーファーム」を意味する図柄のため
使わず、文字通り納屋を表す`Barn`を採用） / `variety: PlantIcon`（芽） /
`process: CherryToBeanIcon`（新規コンポーネント。精製方法＝コーヒー
チェリーから豆を取り出す工程を表現するため、Phosphor本体には対応する
単体アイコンが無く、`Cherries`と`CoffeeBean`のパスを縮小配置し矢印で
つないだ合成アイコンを作った） / `roastLevel: FireIcon` /
`flavor: SparkleIcon` / `cafe: StorefrontIcon` / `keyword: TagIcon`。
`canvasIcons.js`（canvas描画用）と`nodeVisuals.js`（DOM用）の両方を
Phosphor本体の実際のパスデータで更新した。docs/design.mdの「アイコンは
lucide-reactのみを使う」ルールも、この9種類に限る例外として明記した。

**未解決事項**: `CherryToBeanIcon`は凡例（12px相当）では3要素（チェリー・
矢印・豆）が潰れて判別しづらいことを実機で確認済み。グラフ本体の
ノードサイズ（48px前後）では問題ないため、ユーザーと相談のうえ
そのまま採用した。将来さらに手を入れる場合は、矢印を省く／
チェリーかbeanどちらか一方に絞るなどの簡略化が候補になる。

**実行したテストと結果**: `cd frontend && npm run lint && npm run build`
（0エラー）。claude-in-chromeで`/graph`（凡例・キャンバス・検索・
選択パネル）と`/entities/process:xxx`（見出しアイコン・関連属性の
アイコン一覧）を実機確認し、9種類とも崩れずに表示されることを確認済み。

---

### 2026-09-18: グラフを「直接操作している体験」へ作り直し（branch `feat/graph-tactile-interaction`）

「グラフを直接操作しているという体験が感じられない」という指摘を受け、
グラフ画面（構図・物理演算・配色・サイドパネル）をArtifactでの対話的な
プロトタイプ検討（複数ラウンド、物理エンジン単体のモック・配色4案・
高密度塗りつぶし構図・サイドパネル4レイアウト案）を経て、承認を得た内容を
本番コードへ実装した。CLAUDE.mdの規定通り、実装前に実装対象・変更予定
ファイル・データフロー・影響範囲・テスト方法を提示し、特に規模の大きい
「物理エンジンの置き換え」については、react-force-graph-2d（d3-force）
からの全面置き換えとチューニングに留める案の2択を提示した上で、
ユーザーの判断で全面置き換えを選んだ。

**対応**:

1. **物理演算をreact-force-graph-2d（d3-force）から自前実装へ全面置き換え**
   （`GraphCanvas.jsx`）。graph-physics-mock.htmlで承認済みの定数
   （`REPULSION` `SPRING_K` `SPRING_LEN` `DAMPING` `CENTER_K`
   `DRAG_SPRING` `DRAG_DAMPING`）とアルゴリズム（反発→バネ→位置ベースの
   衝突解消(3反復)→中心引力+積分、ドラッグ中はポインタへバネで追従し
   離すと慣性で流れる）をそのまま移植した。react-force-graph-2d時代に
   ライブラリの内部実装の癖へ合わせて積み上げていた回避策（クリック
   判定の自前実装、`onEngineTick`/`onEngineStop`が発火しない問題への
   対処、リサイズ時のズーム誤爆対策）は、物理演算・描画・ポインタ処理を
   すべて自前で持つようになったことで不要になった。初期表示は
   400ステップぶん物理演算を裏側で先に収束させてから最初の描画を行い、
   「開くたびにノードが弾け飛んで収まる」アニメーションを見せない
   （データ変更時も同様）。カメラのフィット（全体／フォーカス対象+隣接
   ノード）はease-out（400ms）で遷移する自前実装に置き換えた。
   `react-force-graph-2d`・`d3-force`は`package.json`・node_modules
   （ホスト＋Dockerコンテナ双方）から削除した。
2. **ノードの見た目を「輪郭線+小さいアイコン」から「種別色で塗りつぶした
   円+暗色アイコン」へ変更**。属性ノードも角丸矩形から円へ統一した
   （`graphNodeSizing.js`の`attributeHalfWidth`/`attributeHalfHeight`を
   `attributeRadius`へ統合、`graphHitTest.js`の当たり判定も円1本化）。
   ベースサイズを拡大（record: 16→26px、attribute: 15→20px）。エッジも
   1px灰色の細線から、つながる属性ノードの色を帯びた太めの線へ変更した。
3. **配色をグラフ専用の9トークンへ刷新**（`--color-graph-*`、
   index.css）。寒色〜暖色にまたがる配色（産地=青・農園=緑・品種=黄・
   精製方法=紫・焙煎度=橙・フレーバー=マゼンタ・カフェ=ティール・
   キーワード=シアン・記録=赤）。**調査で判明**: 以前`nodeVisuals.js`が
   使っていた`--color-accent-*`は、Discover・WorldMapLegend・
   OverviewStats・Diagnosisのarchetype色とも共有されているトークンだった
   （事前に把握していた「影響範囲は/graph画面に閉じる」という説明と
   矛盾することが実装中に判明）。値を直接上書きすると無関係な4画面の
   配色まで変わってしまうため、グラフ専用の新規トークンへ分離した
   （既存の`--color-accent-*`・4画面は変更していない）。originノードは
   従来通り種別共通色ではなく産地ごとの個別色（`originAccent.js`）を使う。
4. **ラベルの既定表示を「記録は常時、属性はインタラクション時のみ」に
   変更**（`isNodeLabelVisible`）。属性ノードは2026-08から実装済みの
   「フォーカス中のノード+直接の隣接ノードだけ表示」ルールをそのまま
   維持し、記録（一杯の記録）のタイトルだけ常時表示にする条件を追加した。
5. **選択中ノードのサイドパネル（`NodeDetailPanel.jsx`）の見出しを、
   グラフのノードと同じ塗りつぶし円バッジへ変更**。`nodeVisuals.js`へ
   `solidBgClass`（不透明度なしの塗りクラス）を追加。中身の構成（属性:
   種別・ラベル・記録数・関連記録一覧、記録: 記録日・評価・メモの抜粋）や
   デスクトップ=右固定パネル／モバイル=bottom sheetという出し分けは
   変更していない（Artifact検討中に「P1: 現行の固定サイドカラム案」を
   ユーザーが選んだ結果、既存の情報構成をほぼそのまま活かせた）。

**副次的に対応したこと**: `docs/design.md`「Design Tokens」節の
グラフノード配色の記述が実際のコードと乖離していた、2026-08から続く
既知の未解決事項（多数のエントリで「次に実装すべき最小単位」として
持ち越されていた）を、今回グラフの配色自体を書き直すのにあわせて解消した
（`--color-accent-*`の実際の値・命名をCatppuccin Mocha準拠に修正し、
グラフ専用トークンへの分離も明記）。あわせて、"Graph Visual Semantics"
節冒頭の「ラベルまたは形状でも判別可能」という記述も、record/属性の
形状統一に合わせて更新した。

**データの流れ・影響範囲**: バックエンドAPI・`graphAdapter.js`の
`{nodes, links}`形状は変更していない。`GraphCanvas`の呼び出し側
（`GraphPage.jsx`）のprops（`graph` `selectedNodeId` `onSelectNode`
`focusRequest` `interactive`）も変更していない。影響は`/graph`画面と、
そこから遷移する`/entities/:nodeId`のNodeDetailPanel相当部分に閉じる。

**実行したテストと結果**: `cd frontend && npm run lint`（0エラー）、
`npm run test`（356件全て成功）、`npm run build`（0エラー。GraphPageの
バンドルサイズはreact-force-graph-2d/d3-force削除により縮小）。
`graphNodeSizing.test.js`・`graphHitTest.test.js`は、属性ノードの
角丸矩形→円統一に合わせて既存テストを書き換えた。claude-in-chromeで
実データ（記録数18件・ノード61件）の`/graph`を確認し、塗りつぶし円・
寒色〜暖色の配色・記録ラベルの常時表示・ノードクリックでの選択（リング表示
+側面パネル、record/属性どちらも確認）・隣接ノードのラベル開示・
非関連ノードのダイミングが、いずれも意図通り動作することを確認した。
Home画面のグラフプレビュー（`GraphPreview.jsx`）にも新配色が問題なく
反映されていることを確認した。コンソールエラーは無し。

**未解決事項**: ドラッグ操作そのもの（ポインタへバネで追従し離すと
慣性で流れる感触）は、Artifactモック上でユーザーに確認いただいた挙動を
コードとして忠実に移植したが、claude-in-chromeの自動操作では単発の
`left_click_drag`アクションでは挙動の細部（追従の遅れ・慣性）までは
確認しきれなかった（自動操作の制約であり、実装ロジック自体はモックと
同一）。実際にブラウザで触っての確認をお願いしたい。モバイル・タッチ
操作での動作（`touch-action:none`は設定済みだが実機未確認）も未検証。

**次に実装すべき最小単位**: ユーザーに実機（ドラッグの感触・モバイル
タッチ操作）を確認してもらい、問題があれば`GraphCanvas.jsx`冒頭の
物理定数（`REPULSION` `SPRING_K` `DAMPING`等）を調整する。それ以外は
MVPの完了条件を満たしているため、下記「次に実装すべき最小単位」の
候補から次のテーマを選ぶ。

**追記（同日）**: 実機確認したユーザーから「ノードの感覚が狭すぎる」との
指摘を受けた（`?focus=`付きで開いた際、選択ノード周辺の複数ノードが
はっきり重なって見える状態）。原因は2つ。(1) ノードの半径を拡大した際
（上記2.）、間隔を決める物理定数（`REPULSION` `SPRING_LEN`）と衝突解消の
反復回数をモックの値（小さいデモ用ノードサイズ前提）のまま据え置いていた。
(2) `drawNode`が選択中ノードの描画半径に`nodeRadius(node, true)`
（`SELECTED_SCALE`＝1.35倍）を使う一方、`node.scale`（フォーカス時の
バネ追従アニメーション、最大1.14倍）も`ctx.scale`で重ねて適用しており、
選択中ノードだけ実際の当たり判定・衝突半径（常に非選択時サイズ基準）より
大幅に大きく描かれ、周囲のノードに食い込んで見えていた。
`REPULSION: 2600→5200`・`SPRING_LEN: 95→170`・衝突解消の反復回数
`3→5`に引き上げ、`drawNode`の描画半径から`SELECTED_SCALE`の二重適用を
外した（選択の強調は`node.scale`の拡大＋白いリングのみで表現）。
`npm run lint`/`npm run test`（356件）/`npm run build`は引き続き
0エラー。claude-in-chromeで同じ`?focus=`URLと通常表示の両方を再確認し、
重なりが解消していることを確認した。

**追記2（同日）**: 上記の対処後も「そもそも間隔が狭い。モックと全然違う」
という指摘を受けた。デバッグログを一時的に仕込んで調査したところ、
以下が判明した。

- `fitCamera`のズーム倍率はクランプされておらず（実測: 61ノードで
  scale 0.516、`MIN_ZOOM`の0.3には達していない）、カメラのフィット
  ロジック自体は疑わしくないと分かった
- 実データの記録ノードの最大degreeは10（`sizeForDegree`で+57px、
  半径にして約83px＝直径166px）。モックは13ノード・固定サイズ
  （record半径30px固定）でしか検証されておらず、実データの
  ノード数（61）・degreeに応じた可変サイズという組み合わせでは、
  1度目の対処で引き上げた固定長のバネ（`SPRING_LEN`）でも
  「大きいノード同士が繋がると自然長より実サイズの方が大きく、
  常に衝突解消と綱引きする」という構造的な問題が残っていた

**根本対応**: バネの自然長を固定値（`SPRING_LEN`）から、つながる2ノード
の実際の半径+ 一定の余白（`SPRING_GAP`、70px）で動的に決める方式へ
変更した（`restLength = nodeRadius(a) + nodeRadius(b) + SPRING_GAP`）。
degreeが高く半径が大きいノード同士が繋がっても自然長が常に実サイズに
追従するため、衝突解消との綱引きが起きなくなる。あわせて`REPULSION`を
5200→7000、`CENTER_K`を0.0012→0.0009（中心への引き戻しを弱め、
クラスタが自然に広がれる余地を増やす）に調整した。

`npm run lint`/`npm run test`（356件）/`npm run build`は引き続き0
エラー（調査用の一時的な`console.log`は削除済み）。claude-in-chromeで
実データの通常表示・`?focus=`表示の両方を再確認し、1度目の対処より
明確にノード間の余白が広がったことを確認した。

**追記3（同日）**: それでも「そもそも間隔が狭い。モックと全然違うのはなぜ」
という指摘を受けた。今度はモック（`graph-theme-concepts.html`のQタブ、
10ノードの手配置イラスト）の実際の座標を計算し、記録ノード半径に対する
隣接ノードとの間隔が実測でおよそ4〜5倍（余白 300px超／半径38px程度）と、
自分が設定した値（当時のSPRING_GAP 70px）とは一桁近く違う水準だったと
判明した。

デバッグログでbounding box・実際のscaleを計測しながら調査したところ、
以下が分かった。

- `fitCamera`のズーム倍率は都度クランプされておらず、疑わしくない
  （実測: 61ノードでscale 0.3〜0.5程度）
- SPRING_GAPやREPULSIONを引き上げても、bounding box自体はあまり
  大きくならなかった（例: SPRING_GAP 70→220でもbboxはわずかな増加）。
  原因は`CENTER_K`（中心への引き戻し力）が支配的だったこと。反発力は
  距離の2乗に反比例して弱まるのに対し、`CENTER_K`は常に一定の力で
  引き戻し続けるため、ノード数を増やしたりSPRING_GAPを伸ばしたりしても、
  最終的な釣り合いの半径はほぼ`REPULSION`と`CENTER_K`の比で決まって
  しまい、他の定数を動かしても収束後の広がりにはあまり効かなかった
- このグラフは1つの記録が複数の属性（産地・精製方法・焙煎度・
  フレーバー複数等）を共有する密な構造のため、共通の属性ノードへ
  複数の記録が同時に引っ張られる「ハブ」ができやすく、そこだけ
  ばねの自然長を伸ばしても局所的に詰まったまま残りやすい

**対応**: `CENTER_K`を0.0012→0.00015（8分の1）まで大幅に弱め、孤立ノードが
際限なく漂流しない範囲でクラスタ全体が広がれる余地を最大化した。加えて
衝突解消の反復回数を5→10、衝突半径に足す余白（`LABEL_CLEARANCE`、
`graphNodeSizing.js`）を20→60pxに引き上げ、ばね（ソフトな力）だけでなく
衝突解消（毎ステップ必ず満たされるハード制約）でも最低限の間隔を保証する
ようにした。`PRE_CONVERGE_STEPS`も400→1500へ増やし、この新しい釣り合いに
確実に収束させている。

`npm run lint`/`npm run test`（356件）/`npm run build`は引き続き0エラー
（調査用の一時的な`console.log`は削除済み）。claude-in-chromeで実データの
通常表示・`?focus=`表示を再確認し、モックに近い余白感になったことを
確認した（ハブ状に密集する一部の記録同士は、グラフの構造上どうしても
やや近くなるが、以前のような明確な重なりは解消した）。

**未解決事項として残った点**: 61ノード全体を常に画面へ収めるという
既存の前提（`fitCamera`が全ノードをbounding boxに収める）と、
「モック並みに余裕のある間隔」という要望は、ノード数が増えるほど
本質的に両立しづらくなる（間隔を伸ばすほどbounding boxが大きくなり、
収めるためにズームアウトすると結局ノード自体も縮小して見える）。
今回は物理定数の調整（ハブの詰まりを軽減する方向）で対応したが、
記録数がさらに増えた場合は、既定表示で全ノードを収めることに拘らず
一部だけを表示して残りはパン操作で探索する、といった設計変更が
必要になる可能性がある（次に実装すべき最小単位の候補として残す）。

**追記4（同日）**: 上記の「未解決事項として残った点」について、
ユーザーへ「そもそもグラフ全体を見せるメリットはあるのか」を確認した。
検討の結果、以下の理由で「グラフ全体を常に画面に収める」という前提
自体をやめる判断になった。

- 61ノード規模で全体を収めると、ラベルはほぼ読めず「色のついた丸の
  集まり」以上の情報は得られない。実際の「発見」はInsight・Stats・
  Discoverや、ノードをクリックしての局所的な探索が担っており、
  ズームアウトした全体像そのものに強い実用的価値は無かった
- 今回のグラフ作り直しの出発点だった「直接操作している感覚」と、
  「全部を無理やり画面に収める」（＝ノードを小さく・間隔を詰めて
  でも収めようとする）という前提は、本質的に矛盾していた
- 参考にしているObsidianのグラフビューも、既定では全体フィットせず
  ある程度zoomされた状態から始まり、ユーザーが自由にパン/ズームする
  設計になっている

**対応**: `fitCamera`を、フォーカス対象がある場合（`?focus=`・検索での
選択・ノードクリック）と無い場合で挙動を分けた。フォーカスが無い
既定表示では、全ノードのbounding boxに合わせてズームするのをやめ、
ノードがほぼ実寸で見える固定倍率（`COMFORTABLE_SCALE = 1`）で全ノードの
重心を画面中央に置くだけにした。画面外にはみ出た部分はパン操作で
探索してもらう。フォーカスがある場合は、対象+隣接ノードへズームする
従来の挙動をそのまま維持した（`?focus=`・検索からの遷移は「このノードを
見たい」という明確な意図への応答のため）。あわせて、この変更により
「間隔を無理に広げてbounding boxを縮める」必要が無くなったため、
未使用になった`FIT_PADDING`定数を削除した（`FIT_PADDING_FOCUSED`は
フォーカス時の余白として引き続き使用）。

「グラフが育っている感じ」（記録・つながりが増えるほど豊かに見える
演出）は今回のスコープから切り離し、別途検討することにした
（ユーザーとの合意）。Home画面のグラフプレビュー（`GraphPreview.jsx`、
記録数・つながり数の表示）が現状その役割の一部を担っている。

`npm run lint`/`npm run test`（356件）/`npm run build`は引き続き
0エラー。claude-in-chromeで実データの通常表示・`?focus=`表示を再確認し、
ノードがほぼ実寸・生き生きとした密度感で表示され、はみ出た部分は画面外へ
延びる（パンで見に行く）ことを確認した。これまでの3回の物理定数調整
（追記1〜3）による間隔の広さもそのまま活きている。

**追記5（同日）**: 「デカすぎる」との指摘を受け、`COMFORTABLE_SCALE`を
1→0.7へ調整した。`npm run lint`/`npm run test`（356件）/`npm run build`
は引き続き0エラー。claude-in-chromeで再確認し、1画面によりまとまった数の
ノードが収まりつつ、個々のノードも引き続き読み取れるサイズであることを
確認した。

**追記6（同日）**: 「グラフ全体が回転している。止まっていてほしい」と
いう指摘を受けた。原因は、承認済みのgraph-physics-mock.htmlにあった
「事前収束後、速度を明示的にゼロへリセットする」という1行
（`nodes.forEach(n => { n.vx=0; n.vy=0; ... })`）を、本番実装へ移植する
際に見落としていたことだった。この行が無いと、1500ステップの事前収束で
完全にはゼロになりきらないわずかな残留速度が、マウント後も毎フレーム
（step()は永続ループで回り続ける設計）積分され続け、実データ（61ノード・
今回引き上げた強めの物理定数）ではその蓄積が「グラフ全体がゆっくり
回転している」ように見えるレベルになっていた（モックは13ノード・
穏やかな定数だったため目立たなかったと考えられる）。

**対応**: 事前収束ループの直後に`nextNodes.forEach(n => { n.vx=0;
n.vy=0; })`を追加した。`npm run lint`/`npm run test`（356件）/
`npm run build`は引き続き0エラー。claude-in-chromeで`/graph`を開いた
まま10秒以上待機し、同じノードのスクリーンショット上の座標が実質的に
変化しない（回転・ドリフトが解消した）ことを確認した。

---

### 2026-09-18: 記録カードのタグへGraph画面の配色を適用（branch `feat/graph-tactile-interaction`継続）

「Graph画面の雰囲気を記録ページとHomeにも適用してほしい」という要望を
受け、Artifactでのモック確認（Before/After比較・フレーバー42種の配色案）
を経て、`RecordCard.jsx`（記録一覧）・`HomeRecordCard.jsx`（Home）の
タグ（精製方法・フレーバー）にGraph画面の色を反映した。

**対応**:

1. 精製方法タグ: Graph画面と同じ種別共通色（`nodeVisuals.js`の
   `getNodeVisual("process")`、紫の`--color-graph-process`）を、
   一覧では塗りタグ（`bgTintClass`+`colorClass`）、Homeではテキスト色
   （`colorClass`）として適用した。
2. フレーバータグ: 産地（`originAccent.js`）と同じ「値ごとの個別色」の
   考え方で、新規`frontend/src/features/coffee-records/utils/
   flavorAccent.js`を追加した。`backend/seeds/data/flavors.js`の
   全42種それぞれに、そのキーワードを連想させる個別のHEX値を手動で
   割り当てている（例: Lemon=黄緑、Blueberry=青、Chocolate=茶、
   Honey=黄金）。Artifactで全42種の配色を一覧表示してユーザー確認を
   得てから実装した。一覧では塗りタグ+色付きドット、Homeでは
   フレーバーごとに色分けしたテキスト（区切りの「•」は無色）で表示する。
3. 精製方法とフレーバーで「種別共通色」と「値ごとの個別色」を使い分けて
   いる理由: 精製方法・焙煎度は選択肢の種類数が少なく個別色にする実益が
   薄いのに対し、産地・フレーバーは「具体的に何を選んだか」を色だけでも
   大まかに掴めた方が実用的なため（詳細は`docs/design.md`「Records」節
   参照）。

**データの流れ・影響範囲**: バックエンドのマスターデータ・APIは変更して
いない。配色はフロントエンドの静的対応表（`flavorAccent.js`）のみで
完結する（`originAccent.js`と同じ設計）。影響は`RecordCard.jsx`・
`HomeRecordCard.jsx`のタグ表示に閉じる。

**実行したテストと結果**: `cd frontend && npm run lint`（0エラー）、
`npm run test`（356件）。`HomeRecordCard.test.jsx`の「flavorsは中黒で
まとめて表示する」テストは、フレーバーごとに個別の色を付けるため1つの
テキストノードではなく別々のspanへ分けた実装に合わせて、各フレーバー名・
区切り文字を個別に確認する形へ更新した。`npm run build`（0エラー）。
claude-in-chromeで実データの`/records`・`/`（Home）を確認し、精製方法が
紫、フレーバーがそれぞれ異なる色（Berry=マゼンタ系、Citrus=オレンジ系、
Chocolate=茶、Honey=金など）で表示されることを確認した。コンソール
エラーは無し。

**未解決事項**: `flavorAccent.js`の対応表はマスターデータの追加に自動で
追従しない（`originAccent.js`と同じ制約）。`backend/seeds/data/
flavors.js`へ新しいフレーバーを追加する際は、この対応表にも1行手動で
追加する必要がある（忘れても中立グレーになるだけでエラーにはならない）。

---

### 2026-09-18: Graph画面のflavorノードにもフレーバー個別配色を適用（branch `feat/graph-tactile-interaction`継続）

「（記録カードのタグに適用したフレーバー個別配色を）Graph画面のノードにも
適用してほしい」という要望を受け、`GraphCanvas.jsx`のflavorノードの塗り色を、
種別共通色（マゼンタ、`--color-graph-flavor`）から`flavorAccent.js`の
値ごとの個別色へ変更した。originノードが`originAccent.js`の個別色を使う
のと同じパターン。

**対応**: `nodeFillColor`関数（`GraphCanvas.jsx`）に`node.type ===
"flavor"`の分岐を追加し、`getFlavorHex(node.label)`を返すようにした。
エッジの色（`edgeColor`）は`nodeFillColor`を再利用しているため、
flavorノードにつながるエッジも自動的に個別色になる。`NodeDetailPanel.jsx`
のバッジ背景色（`badgeBgClass`）にも同様の分岐を追加した
（`getFlavorAccentClass`）。Home画面のグラフプレビュー
（`GraphPreview.jsx`の装飾イラスト）は、origin個別色化の際も変更して
いなかったのと同じ理由（読めることを目的としない縮小イラストのため）で
今回も種別共通色のまま変更していない。

**実行したテストと結果**: `cd frontend && npm run lint`（0エラー）、
`npm run test`（356件）、`npm run build`（0エラー）。claude-in-chromeで
`/graph`を確認し、flavorノード（例: Floral）が対応表通りの個別色で
塗られ、つながるエッジ・選択時のサイドパネルバッジも同じ色で揃うことを
確認した。

---

### 2026-09-18: デザイン・テーマの矛盾レビュー（branch `feat/graph-tactile-interaction`継続）

「デザインやテーマに矛盾がないか一度レビューしてほしい」という依頼を
受け、`docs/design.md`を全文読み直し、今回のセッションで加えた記述同士の
矛盾と、コード側の古いdocs参照を確認した。

**見つけた矛盾・古い記述と対応**:

1. Graph節の配色一覧（「産地=青・フレーバー=マゼンタ」）が、すぐ下の
   「origin・flavorノードは値ごとの個別色を使う」という記述と矛盾して
   見えた → 配色一覧の色は「`GraphLegend.jsx`の凡例スウォッチ・値ごとの
   個別色を持たない種別の実際のノード色」であり、産地・フレーバーの
   凡例色は代表色に過ぎず個々のノードの実際の色とは一致しない旨を
   明記した。
2. フレーバーの件数表記が「New / Edit Record」節で「約41種」、
   「Records」節で「全42種」と食い違っていた → 42種に統一した。
3. `flavorAccent.js`（フレーバー個別色）が中央の「Design Tokens >
   Color」節に載っておらず、機能別の節でしか触れられていなかった →
   `originAccent.js`と並べて中央のColor節にも追記した。
4. 「Home」節の「構成例」が古く、実際には無い「Your Coffee
   Connections」「よく登場する産地・フレーバーの簡易表示」という項目名の
   ままだった（実際は2026-08にDiscoverカード+GraphPreviewへ統合済み） →
   ユーザー確認のうえ、`HomePage.jsx`の現在の構成・コメント履歴に基づいて
   書き直した。

**副次的に見つけたコード側の問題**: `docs/design.md`のレビュー中に、
`docs/insights.md`・`docs/search.md`・`docs/entity-detail.md`・
`docs/stats.md`・`docs/discover.md`（すべて`docs/features.md`へ統合済み）・
`docs/vision.md`・`docs/product-principles.md`（すべて`docs/product.md`へ
統合済み）という、実際には存在しないdocsファイルへの参照が、frontend
13ファイル・backend 13ファイルの計26ファイルのコメント内に残っている
ことを`grep`で発見した。ユーザー確認のうえ、全26ファイルの該当箇所を
現在のファイル名・見出しへ一括修正した（内容の変更は無く、パス参照の
修正のみ）。

**実行したテストと結果**: `cd frontend && npm run lint`（0エラー）、
`npm run test`（356件）、`npm run build`（0エラー）。`cd backend &&
npm run test`（573件、0エラー）。docsとコードコメントのみの変更のため、
挙動への影響は無い。

**未解決事項**: 今回の一括修正は「存在しないファイルへの参照」という
機械的に検出できる問題に絞った。`docs/product.md`「偶然の一致を断定
しない」のような、引用符付きで参照されている見出し文言そのものが
実在の見出しと一致するかまでは検証していない（`docs/product.md`の
Product Principlesは7項目あるが、この特定の文言は見出しとして存在しない
可能性がある）。

---

### 2026-09-18: デザイン・テーマの統一 — 値ごとの個別色と旧パレットの一本化（branch `feat/graph-tactile-interaction`継続）

上記レビューの直後、ユーザーから「デザインや、テーマにページによって
差があります。統一させるべきでは？graphを作り込んだ際のことを思い
出してください。それをベースにします。」という、より本質的な指摘を
受けた。さらに一度提示した範囲（A: 値ごとの個別色の抜け漏れ、B: 旧
`--color-accent-*`パレットの残存）に対しても「それ以外にもあるはずです。
丁寧に確認してください」という追加指摘があり、grepとファイル全文読み込み
による28ファイル規模の再監査を行った上で実装した。

**実装対象**: Graph画面で先行導入していた「産地・フレーバーは値ごとの
個別色、他7種別は型共通色」というルールを、記録詳細・エンティティ詳細・
統計・横断検索・発見バッジなど、記録系画面全体へ一貫して適用する。あわせて
旧`--color-accent-*`（Catppuccin Mochaの9色）をまだ使っていた
Discover・WorldMapLegend・Diagnosis（archetypeVisuals.js）を、Graph画面
作り直しで新設した`--color-graph-*`へ移行し、旧パレット自体を削除する。

**なぜ今実装するのか**: `docs/design.md`「Product Principles」的な観点
ではなく、「同じ産地・フレーバーの色が画面によって違って見える」という
一貫性の欠如そのものがユーザー指摘の対象だった。原因は、Graph画面の
色解決ロジック（型共通色 or 値ごとの個別色）を呼び出し側ごとに個別実装
していたため、新しい画面を作るたびに「値ごとの個別色を使う」判断が
漏れうる構造だったこと。

**新規作成ファイル**: `frontend/src/features/graph/utils/nodeColor.js`
（`{ type, label }`から型共通色・値ごとの個別色のどちらを使うべきかを
一元的に解決する共有ヘルパー。`getNodeColorHex`/`getNodeSolidBgClass`/
`getNodeTintBgClass`/`getNodeTextColorClass`の4関数）。

**変更ファイル**:
- `features/coffee-records/utils/originAccent.js`: `getOriginTintClass`
  （15%不透明度版、タグ用）を追加
- `features/graph/components/GraphCanvas.jsx` /
  `features/graph/components/NodeDetailPanel.jsx`: 既存の個別実装を
  `nodeColor.js`経由へ差し替え（二重管理の解消）
- `pages/EntityDetailPage.jsx`: ヘッダーアイコン・記録数StatCard・
  関連属性チップを`nodeColor.js`経由の色へ
- `pages/RecordDetailPage.jsx`: 産地・フレーバー等のリンク付きピルを
  同様に
- `features/stats/components/TopRankingList.jsx`: ランキング行に色付き
  ドットを新規追加（従来は見出しアイコンのみに色があり、個別行は無色
  だった）
- `features/search/components/EntityResultCard.jsx`: 横断検索結果の
  ヘッダーアイコン
- `features/graph/components/GraphNodeSearch.jsx`: グラフのノード検索欄
  （従来は種別グループ内の全ノードが同じ色で、Graph画面のキャンバス側と
  食い違っていた）
- `features/graph/components/RecordConnectionsDiagram.jsx`: 記録詳細の
  「つながり」図のノードアイコン
- `features/coffee-records/components/DiscoveryBadge.jsx` /
  `SaveDiscoveryReveal.jsx`: バッジを「薄い塗り+種別共通色アイコン」の
  旧スタイルから「塗りつぶした円+`text-on-inverse`アイコン」の新スタイル
  （Graph・NodeDetailPanel・記録カードと同じ）へ統一。`getNodeSolidBgClass`
  を使用
- `features/discover/components/DiscoverCard.jsx`: Insight/Diagnosis/
  World Map行のアイコン色を`text-accent-sapphire`/`accent-moss`/
  `accent-sky`から`text-graph-process`/`graph-record`/`graph-origin`へ
  （Discover行の`text-success`は元々セマンティック色のため対象外）
- `features/map/components/WorldMapLegend.jsx`: 「訪問済み」凡例の3つの
  点を、無関係な`accent-sky`/`accent-pink`/`accent-yellow`から、実際に
  3地域の産地色を示す`getOriginAccentClass("Ethiopia"/"Colombia"/
  "Guatemala")`へ（「産地ごとに色が異なる」という凡例の趣旨に忠実にした）
- `features/diagnosis/utils/archetypeVisuals.js`: 9つの`text-accent-*`を
  対応する`text-graph-*`へ（ファイル自身のコメントが「どのノード種別の
  色に寄せたか」を1:1で明記していたため、機械的な置き換えで済んだ）
- `features/stats/components/OverviewStats.jsx`: コメントのみ修正
  （コード自体は元々`getNodeVisual("record")`経由で`--color-graph-record`
  を参照していたが、コメントが旧トークン名`accent-moss`のままだった）
- `frontend/src/index.css`: 参照元が無くなった旧`--color-accent-*`
  （9色）を削除
- `docs/design.md`: 「Graph Visual Semantics」節に値ごとの個別色と
  型共通色の使い分けルールを明文化。「Design Tokens > Color」節の
  旧パレット分離の説明を、削除後の実態にあわせて更新

**意図的にスコープ外とした箇所**（型共通色のままが正しいと判断）:
`AttributeLabel.jsx`（フィールドラベル自体のアイコン、特定の値を
指さない）、`CollectionStats.jsx`・`WorldMapPage.jsx`の集計件数表示、
`RecordForm.jsx`の複数選択サマリー（PropertyButton）、装飾用の
`GraphPreview.jsx`・`GraphIllustration.jsx`、`GraphFilters.jsx`・
`GraphLegend.jsx`のフィルター・凡例。

**データフロー**: 変更なし（表示ロジックのみ。APIレスポンス形状・DBの
読み書きには影響しない）。

**実行したテストと結果**: `cd frontend && npm run lint`（0エラー）、
`npm run test`（356件、0エラー。事前に存在した`logout`時の
`Not implemented: navigation`というjsdomの警告出力は無関係な既知の
ノイズ）、`npm run build`（0エラー。1.3MB超のチャンクサイズ警告は
本変更と無関係の既存事象）。

**視覚確認**: `backend/.env`の`MONGO_URI`を一時的にAtlas（`bad auth`で
接続失敗。下記「未解決事項」参照）からローカルMongoDB（`mongodb://
127.0.0.1:27017/coffeeApp`）へ切り替え、`npm run seed:demo`でデモ
データを投入した上で、claude-in-chromeでHome・Stats・Entity Detail
（origin:Ethiopia）・Graph（キャンバス・ノード検索）・Record Detail
（つながり図）・World Map（凡例）・Diagnosisの各画面を実機確認した。
産地・フレーバーの値ごとの個別色、農園/品種/精製方法/焙煎度/カフェ/
キーワードの型共通色、Diagnosisのarchetypeアイコン色がいずれも意図通り
表示されることを確認済み。確認後、`.env`はAtlas接続へ戻し、ローカルの
frontend/backend開発サーバーは停止済み。

**未解決事項**:
- 今回のヒアリングで確認した`backend/.env`の`MONGO_URI`（Atlas）は
  `MongoDB connection error: bad auth : Authentication failed`で
  引き続き接続できない（2026-08-30に既知の環境課題として記録済み、
  下記の既存項目参照）。認証情報のローテーションまたはネットワーク
  （IPアクセスリスト）側の問題と思われるが、Atlas側の管理画面へは
  アクセス権が無いため、ユーザー自身の確認が必要
- `originAccent.js`（20産地、L67〜85%のパステル寄り明度）と
  `flavorAccent.js`（42フレーバー、彩度の高い個別色）は、それぞれ別の
  時期に別のトーンで設計されたため、同じ画面に並んだときに産地色が
  フレーバー色より視覚的に弱く見える（Graph画面のノードで顕著）。
  今回のスコープ（値ごとの個別色を「適用する画面」を揃える作業）には
  含まれない「色自体の見直し」であり、着手するかはユーザーとの別途の
  判断が必要

---

### 2026-09-18: デザイン・テーマの統一・追補 — `records/new`の選択済みタグが無色のまま残っていた件（branch `feat/graph-tactile-interaction`継続）

上記の統一作業を報告した直後、ユーザーから「records/newページが
変更されていない」という指摘を受けた。

**原因**: 記録作成フォーム（`RecordForm.jsx`・`CoffeeComponentFields.jsx`）
のフレーバー・品種選択は、ポップオーバー内の検索式タグ入力
`TagCombo.jsx`を使う。前回の監査では、フォーム側の色表示として
PropertyButtonの要約テキスト（「2件選択」等、複数値の集合を示すだけ）
だけを確認し、「型共通色すら不要」と判断してスコープ外にしていた。
しかし実際にポップオーバーを開くと見える「選択済みタグ」自体
（1つずつの具体的な値。例:「Berry」「Almond」）は、この要約テキストとは
別物で、記録カード等と同じ「1つの具体的な値の表示」に該当し、無色
（`bg-surface-2`固定）のまま見落としていた。

**変更ファイル**:
- `features/coffee-records/components/TagCombo.jsx`: `type`（ノード
  種別）propを追加。指定時は選択済みタグへ`nodeColor.js`経由の色
  （tint背景+文字色+個別色ドット、`RecordCard.jsx`と同じ見た目）を
  付ける。未指定時は従来の無色のままフォールバック
- `features/coffee-records/components/RecordForm.jsx`:
  `TagCombo`呼び出し2箇所（flavorIds、primary component の
  varietyIds）に`type="flavor"`/`type="variety"`を追加
- `features/coffee-records/components/CoffeeComponentFields.jsx`:
  同様に`type="variety"`を追加（2グループ目以降のブレンド用）
- `docs/design.md`: 「値ごとの個別色と型共通色の一貫性」節に追記

**実行したテストと結果**: `npm run lint`（0エラー）、`npm run test`
（356件、0エラー。`TagCombo.jsx`自体の専用テストは無し）、`npm run
build`（0エラー）。claude-in-chromeで`/records/new`を開き、産地
（Ethiopia）選択後にフレーバーで「Berry」（個別色・マゼンタ系）と
「Almond」（個別色・茶系）、品種で「Geisha」（型共通色・黄）を選択し、
選択済みタグがそれぞれ意図した色で表示されることを実機確認した。

**未解決事項**: 同じ監査の抜け漏れが他にも残っている可能性がある
（今回は「フォームのポップオーバーを実際に開いて確認する」という
実機確認をしていなかったことが原因のため、次回同種の監査では
ポップオーバー・モーダル等インタラクションで初めて見える表示も
含めて確認する）。

---

### 2026-09-19: ローディング表示をコーヒーのドリップアニメーションへ統一（`CoffeeLoader`、branch `feat/graph-tactile-interaction`継続）

「ローディングにこだわりたい。コーヒーが注がれる/ドリップするアニメーション
を付けたい」という依頼を受けた。既存のローディング表示は2系統あった:
①ボタン内の小さいスピナー（記録の保存ボタン・抽出詳細の保存ボタン、
`Loader2`アイコン）②ページ全体のスケルトン（Stats/Graph/Records等13箇所、
内容の形を模したシマー演出）。両方に適用することをユーザーに確認した。

実装前に、Artifactで動くモックを作り、ユーザーと何度かやり取りしながら
デザインを詰めた（本文チャットではなくArtifact上で「注ぐ案」「ドリップ案」
「ドリッパーを追加」「液面が満ちる感じを追加」「液面がマグの線と重なって
いる」「色がコーヒーではなくトマトジュースに見える」「液面の形をマグの
輪郭に合わせる」という順で反復修正し、最終的に「ドリッパーの注ぎ口から
一滴ずつ落ち、落ちるたびにマグの液面が一段ずつ満ちていく」デザインで
承認を得た）。このモック検討の過程で、**同じSVG要素へ`clip-path`と
`transform-box: fill-box`を伴う`transform`アニメーションの両方を乗せると、
クリップ領域がtransformに追従せずズレる**というChromeの挙動を実機で発見した
（液面の底がマグの丸みからはみ出して見える不具合として現れた）。`clip-path`
を動かない親`<g>`要素へ移し、アニメーションする`<rect>`をその中に入れる
構成に分離して解消した。この対応はモックだけでなく本実装のコンポーネント
設計にもそのまま反映している。

**新規作成ファイル**:
- `frontend/src/components/CoffeeLoader.jsx`: `size="sm"`（18px、ボタン内、
  `aria-hidden`のみで`Loader2`と同じ扱い）／`size="lg"`（72px、
  `aria-busy`+`aria-label`付き、ページ/セクション全体用）の2バリエーションを
  持つ共有ローディングコンポーネント。ドリップ（1.15秒）4回でちょうど
  液面サイクル（4.6秒）と揃えているため、一滴落ちるごとに液面が一段
  上がって見える。カップの輪郭パスは保存ボタンの完了演出
  （`RecordForm.jsx`の`PourIcon`、変更なし）と同じものを再利用している
- `frontend/src/components/CoffeeLoader.module.css`: アニメーション本体
  （プレーンCSSの`@keyframes`のみ、Framer Motion不使用。`LandingPage`の
  `GraphIllustration.module.css`と同じ構成）。13以上のファイルから
  読み込まれるため、Framer Motionに依存していないページのバンドルへ
  影響を与えないための選択。`prefers-reduced-motion: reduce`では
  ドリップ・液面とも静止表示にフォールバックする

**変更ファイル**（`Loader2`/各種Skeletonを`CoffeeLoader`へ置き換え）:
①ボタン: `RecordForm.jsx`（`isSubmitting`時。post-saveの`PourIcon`は
変更なし）、`BrewDetailsCard.jsx`
②ページ/セクション全体（計12箇所）: `StatsPage.jsx`、`DiagnosisPage.jsx`、
`WorldMapPage.jsx`、`ProfilePage.jsx`、`RecordDetailPage.jsx`、
`RecordFormPage.jsx`（編集時のみ）、`HomePage.jsx`（Recent Records）、
`RecordsPage.jsx`、`features/search/components/SearchResults.jsx`、
`GraphPage.jsx`（`fillHeight`使用）、`NodeDetailPanel.jsx`、
`EntityDetailPage.jsx`。`RecordListStates.jsx`・`GraphStates.jsx`は
該当エクスポート（`RecordListSkeleton`/`GraphLoadingState`）のみ削除し、
Empty/NoMatch/Error系のstateは変更していない

**削除したファイル**: `StatsSkeleton.jsx`、`DiagnosisSkeleton.jsx`、
`WorldMapSkeleton.jsx`、`ProfileSkeleton.jsx`、`RecordDetailSkeleton.jsx`、
`RecordFormSkeleton.jsx`、`HomeRecordCardSkeleton.jsx`、
`StatCardSkeleton.jsx`、`RankingListSkeleton.jsx`（いずれも参照元が
無くなったことをgrepで確認済み）。`App.css`の`@keyframes shimmer` /
`.skeleton-block`（`prefers-reduced-motion`ブロック含む）も削除。ついでに
無関係だが同じセレクタに依存して残っていた未参照のMLB時代の死んだCSS
（`.future-star-card--loading .skeleton-block`関連3ルール、
`future-star-card`というclassNameは現在のJSXに存在しないことを確認済み）
も同じタイミングで削除した。

**`docs/design.md`の編集**: 「New / Edit Record」節のFramer Motion項目
から「（他の画面には広げない）」という制限句を削除し、
「ローディング表示は`CoffeeLoader.jsx`に統一し全画面へ展開した
（Framer Motionのバネ物理計算自体は引き続きこの画面限定）」という
日付付き注記を追加した（ユーザーからの直接の指示、「そんなしょうもない
記述は消して」）。

**データフロー**: 変更なし（表示ロジックのみ。APIレスポンス形状・DBの
読み書きには影響しない）。

**実行したテストと結果**: `npm run lint`（0エラー）、`npm run test`
（356件、0エラー）、`npm run build`（0エラー。CSSバンドルが約73.7kB→
71.1kB、StatsPage/DiagnosisPage/EntityDetailPageの各チャンクも縮小し、
スケルトン削除が反映されていることを確認）。claude-in-chromeで
ローカルMongoDBへ一時切り替えのうえ、`/records/new`での保存
（ボタンスピナー→`PourIcon`遷移に回帰無し）、`BrewDetailsCard`の
インライン保存、Stats/Diagnosis/Graph（キャンバス全体＋ノード検出パネル）
の各画面遷移を実機確認した。いずれもコンソールエラー無し。ローカル
ネットワークでの読み込みが速すぎて、アニメーションの途中フレームを
スクリーンショットで捉えることはできなかったが、承認済みのArtifactモック
と全く同じSVGパス・CSS `@keyframes`をそのまま本実装へ移植しているため
（クリップの不具合修正を含む）、見た目の妥当性はモック側で検証済み。

**未解決事項**: ローカルの高速なネットワーク環境では、実アプリ上で
アニメーションの動いている様子を目視確認できていない（各画面とも
一瞬で読み込みが終わるため）。本番相当の速度低下環境（低速回線の
シミュレーション等）での見え方は未確認。

---

### 2026-09-19: CoffeeLoaderの表示位置統一とDiscoverカードへのローディング表示追加（branch `feat/graph-tactile-interaction`継続）

ユーザーから「ページによってローディングの表示位置がバラバラ」
「Homeの Discover カードだけローディング表示が無いのはなぜ」という
指摘を受けた。Explore agentで`CoffeeLoader size="lg"`の全12箇所の
呼び出しコンテキストを監査した結果、以下が判明した。

- 12箇所中11箇所は`fillHeight`を渡しておらず、`py-16`という余白のみで
  高さの最低保証を持たなかった。実際の表示位置は「ページ本体を丸ごと
  ローディング表示に置き換える」パターン（見出し等のchromeが一切無い
  状態でコンテナ最上部から始まる）と、「見出し・フィルター等のchromeは
  残したままセクション内にインラインで表示する」パターンの2系統に
  分かれており、どちらに該当するかはページごとに異なるため、周辺に
  何が描画されているか次第で見た目の位置が変わっていた
- `DiscoverCard.jsx`（Home画面）は、`useInsights`/`useDiscoverTeaser`の
  `isLoading`を「行を表示するかどうか」の判定にしか使っておらず、
  読み込み中は何も表示しない実装のままだった（コメント上は「読み込み中も
  含めて何も無ければカード自体を隠す」という設計だったが、実際には
  Diagnosis/Map行が常時表示のため、カード自体は最初から見えている状態で
  Insight/Discover行だけが前触れなく出現する形になっていた）

**変更ファイル**:
- `frontend/src/components/CoffeeLoader.jsx`: `size="lg"`の高さ指定を
  `fillHeight`の有無に関わらず常に`min-h-64`（`EmptyState.jsx`の
  `fillHeight`と同じ値）を適用する形に統一した。`fillHeight`は追加で
  `h-full`を与える（Graph画面のような実際に高さを持つ親でのみ意味を
  持つ）役割のみに整理し、12箇所すべてが最低256pxの中央寄せ領域を
  持つようにした
- `frontend/src/features/discover/components/DiscoverCard.jsx`:
  Insight行・Discover行それぞれについて、`insightsLoading`/
  `teaserLoading`のあいだは`CoffeeLoader size="sm"`+`t("common.loading")`
  の仮行を表示し、解決したら実際の行へ置き換えるようにした（常時表示の
  Diagnosis/Map行はfetchを持たないため対象外）

**データフロー**: 変更なし（表示ロジックのみ）。

**実行したテストと結果**: `npm run lint`（0エラー）、`npm run test`
（356件、0エラー）、`npm run build`（0エラー）。claude-in-chromeで
ローカルMongoDBへ一時切り替えのうえHome・Statsページの解決後の表示に
崩れが無いことを確認、コンソールエラー無し。ローカルネットワークが
速すぎてローディング中フレームは今回も目視確認できていない（前回
エントリと同じ既知の制約）。

**未解決事項**: 「ページ本体を丸ごと置き換える」5〜7ページと
「chromeを残したままインライン表示する」ページとで、`min-h-64`という
最低保証は揃えたが、前者は依然としてページ上部寄りに、後者は見出し等の
下に表示される、という構造的な違いまでは解消していない（呼び出し側の
JSX構造を全ページで揃えるにはより大きな変更が必要なため、今回は
「最低限の高さを揃える」範囲に留めた）。気になる場合は次の対応候補。

---

### 2026-09-19: ローディング中も見出し・戻る導線を残すよう5ページを再構成（branch `feat/graph-tactile-interaction`継続）

上記の「min-h-64で最低限揃えた」対応について、ユーザーから「実務の
アプリでは、ページ本体を丸ごと置き換えるパターンとchromeを残す
パターンが混在していると一貫性が無いように見える」という指摘を受けた。
Linear/Notion/Vercelダッシュボードのような実務プロダクトでは、見出し・
フィルター等のchromeは常に残したまま中身だけローディング表示にする
パターンが一般的、という考えを共有し、承認を得たうえで実施した。

**対象**: 「ページ本体を丸ごとローディング表示に置き換えていた」5ページ
（`StatsPage.jsx`・`ProfilePage.jsx`・`RecordDetailPage.jsx`・
`RecordFormPage.jsx`・`EntityDetailPage.jsx`）を、
`WorldMapPage.jsx`・`DiagnosisPage.jsx`が既に持っていた「見出し等の
chromeは先に出し、中身だけをローディング/エラー/本体で出し分ける」
構造へ揃えた。

**やり方（ページごとにデータに依存しない部分を見極めて先出しした）**:
- `StatsPage.jsx`: 見出し（固定テキスト＋Diagnosisリンク）は元々
  データ非依存だったため、単一の`return`＋本体だけを条件分岐する形に
  リファクタ（`isLoading`/`error`/空/本体の4分岐）
- `ProfilePage.jsx`: 同様に見出しを先出しし、本体（フォーム群+
  ConfirmDialog+フッター）をFragmentでまとめて条件分岐
- `RecordDetailPage.jsx`: 見出し自体は`record.title`に依存するため
  先出しできないが、`<BackLink fallback="/records" />`はrecordを
  必要としないため、これだけ先に出す
- `RecordFormPage.jsx`: `<BackLink>`+`<h1>`は`isEditing`（route
  paramsだけで決まる）にしか依存しないため、`staticHeader`という
  ローカル変数に切り出し、ローディング/エラー/本体の3箇所で共有
- `EntityDetailPage.jsx`: パンくず/BackLink（`location.state.trail`
  だけで決まる）を`backNav`として先出し。ローディング中は
  `EntityTrail`の`current`（`detail.label`が必要）を`null`にして
  暫定表示する

**データフロー**: 変更なし（表示ロジックのみ）。

**実行したテストと結果**: `npm run lint`（0エラー）、`npm run test`
（356件、0エラー）、`npm run build`（0エラー）。claude-in-chromeで
ローカルMongoDBへ一時切り替えのうえ、5ページすべての解決後の表示に
崩れが無いこと（`ProfilePage.jsx`のFragment化を含む）、
`RecordFormPage.jsx`の編集画面が既存データで正しくプリフィルされる
ことを確認した。コンソールエラー無し。

**未解決事項**: ローカルネットワークが速すぎて、ローディング中に
実際に見出し/BackLinkが表示され続けている様子を目視確認できていない
（前回・前々回のCoffeeLoaderエントリと同じ既知の制約）。コードレベルの
確認（各分岐でheader/BackLinkが`isLoading`判定より前に置かれている
こと）に留まる。

---

### 2026-09-19: DiscoverCardのローディングをカード単位の二択へ統一（branch `feat/graph-tactile-interaction`継続）

前回、`DiscoverCard.jsx`のInsight行・Discover行に個別の
`CoffeeLoader size="sm"`を添える対応をしたが、ユーザーから
「Diagnosis/Map行（常時表示・fetch無し）だけ先に表示され、
Insight/Discover行（fetchあり）だけ後から個別に出現するのが非対称で
違和感がある」という指摘を受けた（本文チャットでの往復で、Home画面の
CTA・Discoverカードだけ「早く表示される」ように見える、という指摘から
実際の原因を特定した）。

**原因**: `DiscoverCard.jsx`は`useInsights`/`useDiscoverTeaser`という
独立した2つのhookを1枚のカードにまとめているが、Diagnosis/Map行は
そもそもfetchを持たない完全に静的なリンクのため「早く表示される」
のではなく最初から待つものが無かった。同じカード内で「待つ理由が無い
行」と「待って個別に出現する行」が混在していたことが非対称さの原因
だった。`GraphPreview.jsx`・`DiscoverSuggestions.jsx`・
`SimilarRecords.jsx`はいずれも単一hookのみで、`isLoading`時は
コンポーネント全体を`return null`する二択のみのため、この非対称は
存在しない（監査して確認済み）。複数の独立したhookを1枚のカードに
まとめているのは`DiscoverCard.jsx`だけだった。

**変更**: `insightsLoading || teaserLoading`のあいだはカード全体を
`CoffeeLoader size="lg"`1つに差し替え、両方解決してから常時表示の
Diagnosis/Map行を含む最大4行をまとめて表示する形にした（「最近の記録」
セクションと同じ「読み込み中 or 全部表示」の二択）。行ごとの個別
`CoffeeLoader size="sm"`は削除。

**データフロー**: 変更なし。

**実行したテストと結果**: `npm run lint`（0エラー）、`npm run test`
（356件、0エラー）、`npm run build`（0エラー）。claude-in-chromeで
ローカルMongoDBへ一時切り替えのうえHome画面の解決後表示に崩れが
無いことを確認、コンソールエラー無し。

**未解決事項**: 今回もローカルネットワークが速すぎて読み込み中の
カード全体ローダー表示を実機のスクリーンショットで確認できていない。

---

### 2026-09-19: 一覧・グリッド系のローディングをshimmerスケルトンへ戻す（branch `feat/graph-tactile-interaction`継続）

本番（Vercel）でユーザーが実際にローディング中の状態を確認できたところ、
「Discoverカード・CTAは静的ですぐ表示されるのに、'最近の記録'だけ
大きいCoffeeLoaderアイコンが表示されるのは不自然」という指摘を受けた。
議論の結果、以下が判明・合意した:

1. 静的な要素（データ取得不要なCTA・リンク）が先に表示されること自体は
   Web開発の標準的な作法（progressive rendering。GitHub/Gmail/Notion等
   実務プロダクトの一般的な挙動）であり、問題ではない
2. 問題の実体は、一覧・グリッド系（本来カードが複数枚並ぶ場所）に、
   形も大きさも無関係な単一の大きいCoffeeLoaderアイコンを置いていた
   ことによる視覚的な不釣り合い。Web開発ではこの場面、
   Facebook/LinkedIn発祥の「カードと同じ形のプレースホルダーを出す」
   skeleton screenパターンが標準
3. ユーザーからは当初「ゲームのようなNow Loading画面（全データが揃う
   until何も出さない）」という別のイメージも提示されたが、これは
   Web開発の慣例ではない（ネイティブアプリ/ゲーム機の作法）ことを
   説明し、不採用とした
4. CoffeeLoaderのドリップアニメーション自体は気に入っているため
   「無駄にしたくない」という要望があり、一覧・グリッド系だけ
   shimmerスケルトンへ戻し、CoffeeLoaderは他の箇所（ボタン・フルページの
   状態・Graphキャンバス・DiscoverCard）でそのまま使い続けることで
   合意した。ドリップアニメーション自体の他箇所への転用（空状態・
   コーヒー診断の結果発表・Landingページ等）は次の検討候補として提示済み
   （ユーザーからの返答待ち）

**変更ファイル**（git履歴から4b62788の1つ前のコミットの内容を復元）:
- `frontend/src/features/coffee-records/components/HomeRecordCardSkeleton.jsx`
  （復元、新規作成扱い）
- `frontend/src/features/coffee-records/components/RecordListStates.jsx`:
  `RecordListSkeleton`エクスポートを復元
- `frontend/src/App.css`: `@keyframes shimmer` / `.skeleton-block`
  （`prefers-reduced-motion`ブロック含む）を復元
- `frontend/src/pages/HomePage.jsx`・`frontend/src/pages/RecordsPage.jsx`・
  `frontend/src/features/search/components/SearchResults.jsx`:
  `CoffeeLoader size="lg"`を元のスケルトンコンポーネントへ戻した
- `frontend/src/components/CoffeeLoader.jsx`・`docs/design.md`:
  この使い分け（一覧/グリッド系はスケルトン、それ以外はCoffeeLoader）を
  コメント・ドキュメントに追記

**データフロー**: 変更なし。

**実行したテストと結果**: `npm run lint`（0エラー）、`npm run test`
（356件、0エラー）、`npm run build`（0エラー）。claude-in-chromeで
ローカルMongoDBへ一時切り替えのうえHome/Records一覧/横断検索結果の
解決後表示に崩れが無いことを確認、コンソールエラー無し。

**未解決事項**:
- ドリップアニメーションの他箇所への転用（空状態・コーヒー診断結果・
  Landingページ等）はユーザーへ提案済みだが、着手するかは未確定
- 本番での「Insight行が以前表示されていたのに今回は表示されなかった」
  という点（このエントリの直前のやり取りで気づいた）は、今回の
  ローディング表示の変更とは無関係な可能性が高いが、原因を調査して
  いない（ユーザーへ確認を投げたが、この対応の間に本題（ローディングの
  不自然さ）へ話が移ったため未解決のまま）

---

### 2026-09-19: CoffeeLoaderドリップアニメーションを「発見」画面・空状態へ転用（branch `feat/graph-tactile-interaction`継続）

前回提案した3つの転用候補（空状態・コーヒー診断結果・Landing）のうち、
ユーザーから「コーヒーの記録完了の際にアニメを挟むのはどう」という
別提案があり、相談の結果、以下2箇所で実施することになった:

1. **保存後の「発見」画面**（`SaveDiscoveryReveal.jsx`）の冒頭
2. **記録が1件も無いときの空状態**（`RecordsEmptyState`、Records画面）

**実装対象・なぜ今実装するのか**: 上記の通り、ユーザーとの相談で決定。
発見画面は「コーヒーが淹れ上がって、発見が明らかになる」という一連の
流れを演出する1回きりの体験、空状態は「記録するまでずっと続く状態」を
表すループ表示という、性質の異なる2つの使い方を使い分けている。

**変更ファイル**:
- `frontend/src/features/coffee-records/components/SaveDiscoveryReveal.jsx`:
  `BREW_INTRO_MS`（4600ms、CoffeeLoaderのドリップ×4=液面サイクル1周ぶん）
  だけ`isBrewing`状態でCoffeeLoaderを表示し、`setTimeout`経過後に本体
  （記録タイトル・評価・発見一覧・「記録を見る」ボタン）を表示する
  ように変更。`prefers-reduced-motion`では最初から`isBrewing: false`に
  して演出をスキップする（`RecordFormPage.jsx`の`isJustSaved`と同じ方式）
- `frontend/src/features/coffee-records/components/RecordListStates.jsx`:
  `RecordsEmptyState`の固定Coffeeアイコン（lucide-react）を
  `CoffeeLoader size="lg"`のループ表示へ変更。共通の`EmptyState.jsx`は
  Lucideアイコン（`size`数値+`strokeWidth`）を前提にしておりCoffeeLoaderの
  APIとは形が異なるため、この空状態だけ`EmptyState.jsx`を経由せず専用の
  マークアップにした（見た目のクラスは`EmptyState.jsx`のデフォルトと
  同じに揃えている）
- `frontend/src/i18n/locales/ja.json` / `en.json`: `discoveries.brewingLabel`
  （CoffeeLoaderの`aria-label`用、視覚的なキャプションは表示しない。他の
  CoffeeLoader使用箇所と同じくアイコンのみ）を追加
- `docs/design.md`: 上記2箇所の使い分け（一瞬の演出 vs ループ）を追記

**データフロー**: 変更なし。

**実行したテストと結果**: 既存テストのうち、この変更で実際に壊れたもの:
- `SaveDiscoveryReveal.test.jsx`（6件中6件が発見演出の追加により失敗）:
  フェイクタイマー（`vi.useFakeTimers()`）を導入し、`render`直後に
  `BREW_INTRO_MS`ぶん`vi.advanceTimersByTime`で進めて演出をスキップする
  ヘルパーへ変更。ボタンクリックを伴うテストだけは、`userEvent.click`が
  内部で実タイマーのdelayに依存するため、クリック前に`vi.useRealTimers()`
  へ戻す対応が必要だった（`userEvent.setup({ advanceTimers })`を試したが
  タイムアウトしたため、実タイマーへ戻す方式に変更）
- `RecordFormPage.test.jsx`（1件）: 発見画面の内容を待つ`findByText`に
  `{ timeout: 6000 }`を明示的に指定（既定の1000msでは4.6秒の演出を
  待ちきれずタイムアウトするため）

`npm run lint`（0エラー）、`npm run test`（356件、0エラー）、
`npm run build`（0エラー）。claude-in-chromeでローカルMongoDBへ一時
切り替えのうえ、実際に発見が起こる記録（未使用の産地Burundiを選んで
保存）を作成し、保存直後にCoffeeLoaderの「淹れている」演出→発見一覧
（「Burundiを初めて記録しました」）への遷移を実機で確認した。また
新規テストアカウント（記録0件）で`/records`の空状態にCoffeeLoaderの
ループ表示が出ることも確認した。いずれもコンソールエラー無し。
確認後、テストレコード・テストアカウントは削除済み。

**未解決事項**: 本番での「Insight行が以前表示されていたのに今回は
表示されなかった」という点は、依然として未調査のまま。

---

### 2026-09-19: 本番データのバックフィル — ブレンド移行前の記録がグラフ/Insight/Discoverから見えなかった不具合を修正

**実装対象**: 本番MongoDB（Atlas）に残っていた、ブレンドコーヒー対応
（`e23a1bf`/`082ae0a`、2026-09）より前に作成されたCoffeeRecordの
産地・農園・品種・精製方法を、旧フィールド（`originId`/`farmName`/
`varietyIds`/`processId`を記録直下に直接持つ形）から新フィールド
（`components`配列）へ移すバックフィル。

**なぜ今実装するのか**: ユーザーから「本番でInsight行の見え方が
以前と違う」という報告を受けて調査したところ、`docs/features.md`
「Insights」「Discover」やGraph生成（`graphBuilder.js`）が産地・
精製方法を`record.components`からしか読んでいないことが判明。
ブレンド対応の移行時、既存レコードを新フィールドへ移すバックフィルが
行われておらず、移行前に作られた記録は「産地なし」として知識グラフ・
Insight・Discoverからは見えない状態のまま放置されていた（フレーバーは
記録直下のフィールドのままで影響を受けないため、フレーバー由来の
Insightだけは表示され、産地由来のInsight/Discoverだけが出ない、という
一見不可解な状態になっていた）。Home画面の記録カード表示は別経路
（旧`originId`もフォールバックで読む処理）のため見た目は正常に見え、
発覚が遅れた。

**調査の過程**: ローカルの`backend/.env`のAtlas接続情報が
`bad auth`で使えなくなっていたことも判明（2026-08-30から未解決事項
#13として記載されていたもの）。ユーザーがRenderダッシュボードの
Environment変数から最新の接続文字列を取得し、ローカル`.env`を更新して
解消。あわせて、production APIへ直接テストユーザーを登録して該当DBへ
実際に書き込まれるかを確認する手順で、この接続文字列が確かに本番
backend（Render, `coffee-app-backend-v6xq.onrender.com`）と同じDBを
指していることを実証済み。

**変更したデータ**: 本番DB `coffeeApp`の`coffeerecords`コレクション
のうち、`components`が空配列かつ旧`originId`を持つドキュメント20件
（Demo User・hikaruさんの記録、双方含む）。各ドキュメントについて
`components: [{ originId, farmName, varietyIds, processId }]`を
`$set`（他フィールドは一切変更しない）。旧フィールド自体は削除せず
残置（現在のMongooseスキーマはこれらを宣言していないため実害は無い）。

**実行したスクリプトと結果**: `backend/_backfillComponents.mjs`
（一時スクリプト、実行後に削除。gitには一度もコミットしていない）。
まず`--dry-run`で対象20件の内容を確認したのち、本番DBへ実際に
書き込み。「更新件数: 20」を確認し、その後同じ条件でのクエリが0件に
なることも確認済み。

**確認方法**: claude-in-chromeで本番サイト（hikaruさんの実アカウント）
を再読み込みし、知識グラフのノード数が「28件のノード・37件の
つながり」から「47件のノード・63件のつながり」へ増加したことを確認
（バックフィル前は見えていなかった産地・品種・精製方法ノードが
反映された）。Discover提案行は今回もなお非表示のままだが、これは
バグではなく正しい計算結果（Colombiaの2件が異なる精製方法のため
「最も多い精製方法」が1つに決まらず、他の産地は1件ずつで閾値
`minRecordsForOrigin: 2`未満のため）であることをコードで確認済み。

**データフロー**: 変更なし（アプリのコード自体は変更していない。
既存データの形をコードの前提に合わせて修正しただけ）。

**未解決事項**: 同種の「スキーマ変更時にバックフィルを書き忘れる」
リスクへの一般的な対策（マイグレーションの手順化・チェックリスト化）
は未着手。今回のような1回きりのバックフィルスクリプトを`backend/`配下に
恒久的に置く運用にするかどうかも未検討（今回は完了後に削除する方針を
取った）。

---

### 2026-09-20: Render方向性の探索とデザインの角丸撤廃、Graph画面の常時ドリフト修正

**実装対象**: (1) Render.comを参考にしたLanding/Homeのビジュアル方向性検討（Artifactモック）。(2) Home画面の知識グラフカード（`GraphPreview.jsx`）を実データのノード・エッジ表示へ作り直し。(3) 背景色・カード背景色をより黒に近い値へ変更。(4) アプリ全体の角丸を撤廃（`rounded-none`へ統一）。(5) Graph画面（`GraphCanvas.jsx`）で、操作していない間もグラフ全体がゆっくり回転して見える不具合を修正。

**なぜ今実装するのか**: ユーザーがRender.comのビジュアル言語（黒基調+単色アクセント、動きのある密度、角ばったUI）を気に入り、coffee-app自身のデザイン方向性として採用したいという要望から。(5)は作業中にユーザーが気づいた既存の不具合報告。

**(1) デザイン探索**: Artifact上でRenderのランディングページの実際のレイアウト・配色を調査した（`document.body.innerText`にモック要素の文字列が一切含まれず、211個のpathからなる1枚の専用SVGイラストだったと判明）。ここから座標を実測して静的にレイアウトを再現し、中身をcoffee-app自身の言葉・データへ差し替えたモックを複数バージョン作成した（Landing/Home）。最終的にはRenderの画面形そのものへの拘りをやめ、coffee-appの中身（見出し・記録トースト・ドリップアニメーション・知識グラフ1枚）に合わせた構成へ着地した。Artifactでの検討に留め、まだ実装には反映していない。

**(2) GraphPreview.jsx**: 見出し行（タイトル+ノード/エッジ件数）／グラフ本体／フッター行（タグライン+導線）の3段構成に作り直した。以前は「読めなくていい、ごく薄い」方針（opacity 40%）だったが、実データのノード・エッジをはっきり表示する方向へ変更。`previewIllustration.js`の`buildPreviewLayout`が返す各edgeに`targetType`を追加し、エッジの色を接続先ノードの種別色で塗るようにした（docs/design.md「Graph」のエッジ配色方針と統一）。

**(3) 配色**: `--color-base`を`#141414`→`#000000`、`--color-raised`（カード背景）を`#1f1f1f`→`#0a0a0a`へ変更。境界線（`border-surface-2`）があるため、純黒背景からも埋もれずに区別できる。

**(4) 角丸の撤廃**: `formStyles.js`の`cardClass`・`primaryButtonClass`等（アプリ全体で共有される中心的なクラス）に加え、個別コンポーネントで直接指定されていた`rounded-xl`/`rounded-2xl`/`rounded-full`/`rounded-md`等を、約25ファイルにわたり`rounded-none`へ統一した。知識グラフのノードバッジ・色ドットなど、docs/design.mdで明示的に円形と定義されている要素（`h-*`/`w-*`の固定サイズに`rounded-full`を組み合わせたもの）は対象から除外し、円のまま維持している。

**(5) Graph画面の常時ドリフト修正**: `GraphCanvas.jsx`の物理演算は「減衰(`DAMPING: 0.86`)はするが完全停止はしないバネ物理」を意図的な仕様としていた（2026-09-18のコメント参照、承認済みのモックの動きを踏襲）が、実データでは減衰だけでは速度が厳密にゼロへ収束せず、毎フレームの積分でグラフ全体がゆっくり回転して見える不具合が再発した（`PRE_CONVERGE_STEPS`後の一度きりの速度リセットだけでは、その後も回り続けるメインループに対して不十分だった）。`physicsActiveRef`を追加し、ドラッグ中でなく全ノードの速度が閾値未満（`SETTLE_VELOCITY_SQ`）になったら`step()`自体の呼び出しを止める方式へ変更した。ドラッグ開始時に再度有効化する。これにより「減衰はするが完全停止はしない」という以前の方針を撤回した。

その後、ユーザーから「一度ドラッグすると、その後動かしていなくても再び回転してしまう」という追加報告を受けた。原因は、ドラッグ終了後に速度が`SETTLE_VELOCITY_SQ`を自然に下回るのを待つだけの実装だと、ノード数の多い実データ（60件超）では収束しきらないケースがあり、`physicsActiveRef`がfalseに戻らず動き続けてしまうこと。ドラッグ終了時刻から`POST_DRAG_SETTLE_FRAMES`（90フレーム、約1.5秒）を`settleDeadlineRef`にセットし、この残りフレームがゼロになったら速度の大小に関わらず強制的にゼロへリセットして停止する、保証付きの上限を追加した。ドラッグ→リリース後、数秒空けたスクリーンショット2枚が完全一致することを実機で確認済み。

さらに、この強制停止が「動きの途中で急に止まる」カクつきを生んでいるという指摘を受けた。`settleDeadlineRef`がゼロになった瞬間に速度をいきなりゼロへ固定していたため、まだ速度が残っている状態から不連続に静止していたことが原因。`COOLDOWN_FRAMES`（30フレーム、停止までの残りフレームがこの値以下になった区間）の間、通常のDAMPINGに加えて1→0への線形イーズアウトをかける`extraDamping`を追加し、停止直前になめらかに減速してから止まるようにした。

続けて「動かしている（ドラッグ中の）動きがカクつく」という報告を受けた。静止時（`step()`を呼ばない）は滑らかで、ドラッグ中（`step()`が毎フレーム走る）だけ重いという条件が一致することから、`step()`内の計算量が原因と特定した。衝突解消ループが固定10回×O(ノード数^2)（実データ60ノード超で約17,700回の距離計算）を毎フレーム走らせており、重なりが既に解消済みで何も押し戻していないフレームでも同じ回数を無条件に繰り返していた。1回の反復で誰も押し戻されなければそれ以上重なりは残っていないため、`anyPushed`フラグで早期に打ち切るよう変更した（`GraphCanvas.jsx`の該当コメント参照）。挙動は変えず（同じ収束結果）、無駄な反復だけを削減する変更。

この対処だけでは「まだ解決していない」という報告が続いた。ユーザーからの「Obsidianを参考にしては」という提案を受けて調査したところ、`drawNode`が**全ノードに毎フレームCanvas 2DのshadowBlurを掛けていた**ことが分かった（`(node.id === selectedNodeId ? 18 : 10) / totalScale`、実データ60ノード超）。選択中・ホバー中・ドラッグ中のノードだけに影を残しそれ以外をフラットにする対処を一度実装したが、「見た目を変えろとは言っていない、動きを再現するだけの話」という指摘を受け、この見た目の変更は完全に取り消した（`drawNode`のshadowBlurを元通り全ノードへ適用する形に戻し、`draw()`の`visualContext`から`draggingId`を削除）。

あらためて「Obsidianの動きを調べて実装する」方針で、WebSearchでObsidianの実際の物理演算を調査した。ObsidianはグラフビューにD3の`d3-force`をそのまま使用していることが判明した。d3-forceの実装で特に重要な2点:
- **ドラッグは座標の固定（fx/fy）**: バネで追従させるのではなく、ドラッグ中のノードは毎ティック `node.x`/`node.y` をポインタ位置へ直接リセットし、`node.vx`/`node.vy` もゼロにする。遅れ・揺れが一切無い1:1追従になる。
- **alpha（温度）による減衰**: 毎ティック `alpha += (alphaTarget - alpha) * alphaDecay` で単一のalpha値を更新し、この値を全ての力（反発・バネ・中心引力）に掛ける。alphaが`alphaMin`未満になったらシミュレーションを止める。ドラッグ中は`alphaTarget`を1ではなく0.3程度に留め、周囲のノードが穏やかに反応するようにする。

この2点をこのアプリの物理演算（`GraphCanvas.jsx`のstep()）へそのまま移植した:
- `DRAG_SPRING`/`DRAG_DAMPING`（バネ追従ドラッグ）を削除し、ドラッグ中のノードは`n.x = target.x; n.y = target.y; n.vx = 0; n.vy = 0;`という直接座標固定に変更
- `SETTLE_VELOCITY_SQ`/`POST_DRAG_SETTLE_FRAMES`/`COOLDOWN_FRAMES`（速度閾値判定・強制タイムアウト・停止直前のイーズアウトという3つの場当たり的な対処）を全て削除し、`alphaRef`/`alphaTargetRef`によるd3-force方式のalpha減衰へ一本化した。`ALPHA_DECAY`（0.0228）・`ALPHA_MIN`（0.001）はd3-forceの既定値をそのまま使用
- ドラッグ開始時`alphaTargetRef.current = ALPHA_TARGET_DRAG`（0.3）、終了時`alphaTargetRef.current = 0`。alphaが`ALPHA_MIN`未満になったら`step()`内で`physicsActiveRef.current = false`にして物理演算を止める（この判定自体は前回までの実装から維持）
- 事前収束（`PRE_CONVERGE_STEPS`）ループの前に`alphaRef.current = 1`をセットし、ループ後に`alphaRef.current = 0`へ明示的にリセット

見た目（shadowBlur等の描画コード）は一切変更していない。反発力・バネ定数・中心引力・DAMPING（速度減衰）・衝突解消ループの前回対処（早期打ち切り）はいずれも変更せず、alphaによる力のスケーリングとドラッグの座標固定方式だけを追加・置き換えた。

ブラウザのFPS計測はCDPのタイムアウト等でこのセッションでは実施できず、定量的な改善幅は未計測。実機で、ドラッグ中のノードがポインタへ1:1で追従すること、重なりが無いこと、リリース後に静止する（数秒空けたスクリーンショット2枚が完全一致）ことを確認済み。

**変更ファイル**:
- `frontend/src/features/graph/components/GraphPreview.jsx`
- `frontend/src/features/graph/utils/previewIllustration.js`
- `frontend/src/index.css`（`--color-base`・`--color-raised`）
- `frontend/src/features/coffee-records/components/formStyles.js`
- 上記に加え、`rounded-*`を使用していた約25個のコンポーネントファイル（`RecordCard.jsx`・`HomeRecordCard.jsx`・`GraphFilters.jsx`・`EntityDetailPage.jsx`・`RecordDetailPage.jsx`・`StatCard.jsx`・`ConfirmDialog.jsx`等）
- `frontend/src/features/graph/components/GraphCanvas.jsx`

**データフロー**: 変更なし（表示・演出・スタイルの変更のみ）。

**実行したテストと結果**: `npm run lint`（0エラー）・`npm run build`（0エラー）・`npm run test`（356件、0エラー）を各変更のたびに実行。claude-in-chromeでローカルMongoDBへ一時切り替えのうえ、Home画面（知識グラフカード・角丸・背景色）、Graph画面（静止の確認、スクリーンショット2枚を数秒空けて比較し位置が完全一致することを確認／ドラッグ操作で物理演算が正しく再有効化されること／リリース後に再収束して静止することを確認）を実機確認した。

**未解決事項**: `docs/design.md`「Radius / Spacing」節はまだ角丸のある旧トークン（`rounded-2xl`等）を前提にした記述のまま。今回の変更（角丸撤廃・黒基調化）を反映した更新が必要。Render方向性の探索（Landing/Homeのモック）を実際のコードへ反映するかどうかも未定。

---

### 2026-09-20: 記録詳細・エンティティ詳細ページのダッシュボード化

**実装対象**: `RecordDetailPage.jsx`・`EntityDetailPage.jsx`を、KPIタイル行+2カラムグリッドの「ダッシュボード風」レイアウトへ作り直した。デスクトップ（`lg`以上）では画面の高さに収まり、ページ自体はスクロールしない。

**なぜ今実装するのか**: ユーザーから「records詳細ページとentitiesページをダッシュボード風にします」という明示的な依頼。Artifactでモック（タブ切り替えで両ページ分）を作成し、承認を得たうえで実装した。モック提示後、「Homeと同じ画面いっぱいに」「デスクトップではスクロールする必要がない方が良い」という追加要望を受け、モックをビューポート内固定（各カードが自分の中身だけ内部スクロールする構成）へ改修してから実装に進んだ。「それぞれのアクセントカラーは既存コードに則って」という指示も受け、モックで使っていたハードコードのhexは使わず、実装では`getNodeVisual`/`nodeColor.js`（知識グラフのノード種別色）をそのまま再利用した。

**レイアウトの実装方針**: `docs/design.md`「Record Detail」に追記済み（詳細はそちら参照）。要点:
- コンテナ幅を`contentContainerClass`（1200px）から`wideContainerClass`（1600px、Home画面と同じ）へ変更
- KPIタイル行を追加（既存の`StatCard`を再利用。新しい集計値は作らず、既に計算済みの値を先出しするだけ）
- `lg:h-[calc(100vh-3.5rem)]`でページ自体をナビバー分を引いた画面高さに固定し、2カラムグリッド（`lg:grid-cols-[1.6fr_1fr]`）にする
- 各カードは`lg:min-h-0`+`lg:overflow-y-auto`で見出しを固定したまま本文だけ内部スクロールする
- lg未満（モバイル）ではこれらの制約をすべて外し、従来通り1カラムで縦にスクロールする（`lg:`プレフィックス無しのクラスは一切変更していないため、CSSのカスケードにより自動的に元の見た目へ戻る）

**実データで踏んだ不具合と修正**: 実装直後、claude-in-chrome+ローカルMongoDBで実データを確認したところ、「コーヒーの詳細」カードの中身がほぼ空（罫線だけ）に潰れる不具合が発生した。原因はCSS flexboxの仕様: `flex-basis: 0%`の兄弟（Coffee Information、`flex-[3_1_0%]`）と`flex-basis: auto`の兄弟（`BrewDetailsCard`、当時は無指定で自然な高さ）を同じ列に混在させると、コンテナの合計高さが不足したとき（deficit）、`flex-basis: 0%`側の縮小スケール係数が常に0になるため、そちら側が数学的に0へ潰れ、`flex-basis: auto`側（自然な高さのまま縮まない）がすべての空間を奪ってしまう。`BrewDetailsCard.jsx`にも`lg:flex lg:min-h-0 lg:flex-1`+内部スクロールを追加し、メイン列の全カードを同じ`flex-basis: 0%`方式へ揃えて解消した。

サイドバー列（味覚グラフ/つながり図/似た記録）でも同種の問題が発生した。「つながり」図（`RecordConnectionsDiagram`、aspect-square）は自然な高さがサイドバー列の持ち分（実データで530px）を超えることがあり、当初`SimilarRecords`に付けていた`flex-1`（0%-basis）がまたゼロへ潰れ、5件あるはずの類似記録が完全に不可視になっていた（`ul`の高さ0で確認）。今回は逆方向の修正にした: `SimilarRecords`を`flex-1`から外し、味覚グラフ・つながり図と同じ「自然な高さのまま置く」方式に統一（正方形の図解・最大5件という上限があり内容量が予測できるため、flex-1で無理に埋めようとしない）。あわせて、両カラムの列（stack）自体にも保険として`lg:overflow-y-auto`を追加し、自然な高さの合計が列の持ち分を超えた場合でも、列全体をスクロールしてすべての内容に到達できるようにした（個々のカードを潰すのではなく、列がスクロールすることで解決する設計に変更）。

**EntityDetailPage.jsx**: 同じ方針で作り直した。既存のKPI行（記録数・平均評価・最後に飲んだ日）に「関連する種別」（`relatedTypes.length`）のタイルを追加した（新規i18nキー`entityDetail.relatedTypesCount`）。「関連する属性」セクションは、種別ブロックを縦積みから`lg:grid-cols-2`の2列へ変更（広がった横幅を使い切るため）。こちらは「関連する属性」「関連する記録」の2つとも`flex-1`（0%-basis）で統一しており、上記のような混在は無いため、同種の不具合は発生しなかった。

**変更ファイル**:
- `frontend/src/pages/RecordDetailPage.jsx`
- `frontend/src/pages/EntityDetailPage.jsx`
- `frontend/src/features/coffee-records/components/BrewDetailsCard.jsx`
- `frontend/src/features/similarRecords/components/SimilarRecords.jsx`
- `frontend/src/features/discover/components/DiscoverSuggestions.jsx`（`mb-6`の削除、親のgapに委ねる形へ）
- `frontend/src/i18n/locales/ja.json`・`en.json`（`entityDetail.relatedTypesCount`追加）
- `docs/design.md`（「Record Detail」節に追記）・`docs/features.md`（「Entity Detail」の「表示」節に追記）

**データフロー**: 変更なし（表示・レイアウトの変更のみ。KPIタイルも既存の計算結果を再利用するだけで、新しいAPI呼び出し・集計ロジックは追加していない）。

**実行したテストと結果**: `npm run lint`（0エラー）・`npm run build`（0エラー）・`npm run test`（356件、0エラー）。claude-in-chromeでローカルMongoDBへ一時切り替えのうえ、ブレンド記録（2コンポーネント・産地/品種/精製方法あり）とEntity Detail（Ethiopia、関連記録6件）を実機確認。デスクトップ幅（1680px）でページ自体がスクロールしないこと（`document.documentElement.scrollHeight === clientHeight`をJS側でも確認）、各カードの内部スクロール・列レベルのフォールバックスクロールが実際に機能すること（「コーヒーの詳細」「似た記録」「関連する記録」のいずれも、圧縮されず全件に到達できることを確認）を検証した。モバイル幅は、このセッションのブラウザ自動化ツールでウィンドウを直接縮小しても`window.innerWidth`が反映されなかったため（複数タブが同一ウィンドウを共有している影響と推測）、2026-08-31に確立済みのiframe代替手法（`width:390px`のiframeを注入し`contentWindow`側を検証する。IMPLEMENTATION.md該当エントリ参照）で両ページを確認した。KPIタイルが1列に積み上がること、`window.innerWidth`が386px、`pageScrollable`（`scrollHeight > clientHeight`）が`true`（通常のページスクロールに戻っている）ことを確認し、デスクトップ用の`lg:`制約が漏れていないことを実証した。

**未解決事項**: 今回の「コンテナ内で自然な高さの兄弟同士がflexboxの空間を奪い合う」不具合は、今後同種のダッシュボード風レイアウトを他画面に広げる際にも再発しうる一般的な罠のため、同じ列内のカードは可能な限り同じflex方式（全部flex-1か、全部自然な高さのどちらか）に揃える、という判断基準を今回の実装で得た。

---

### 2026-09-20: ダッシュボード化のモック再現度を修正

**実装対象**: 直前のRecordDetail/EntityDetailダッシュボード化で、Artifactモックと実装の見た目が大きく異なっていた5箇所を、モック通りへ作り直した。

**なぜ今実装するのか**: ユーザーから「モックと大幅にデザインが違いますが、なぜ？」という指摘。確認したところ、KPI行を（モックの区切り線付き統計ストリップではなく）既存の`StatCard`をただ並べただけにしていた、似た記録を1列のまま2列化していなかった、味覚グラフを横並びにしていなかった、EntityDetailの関連する記録を表形式にしていなかった、「種別ごとの内訳」カードを丸ごと実装し忘れていた、という5点の乖離があった。既存コンポーネントの再利用を優先しモックの細部を簡略化してしまったのが原因で、これはユーザーへ確認せず自分の判断で進めてしまった落ち度だった。

**実装内容**:
1. **KPIタイル**: 新規`components/KpiStrip.jsx`（`KpiStrip`/`KpiTile`）を追加。1px gapの背景色（`bg-surface-2`）で各セル（`bg-raised`）を区切ることで、モックの「1枚の枠を細い線で分割した統計ストリップ」を再現した。`StatCard`（個別に枠+影が付き隙間が空く見た目）とは別物として使い分ける。RecordDetailPage.jsx・EntityDetailPage.jsxの両方で`StatCard`から差し替えた
2. **似た記録**: `SimilarRecords.jsx`の`<ul>`を`flex flex-col`から`grid grid-cols-1 sm:grid-cols-2`へ変更。各アイテムは元々ボーダー付きの個別ボックスだったため、グリッド化だけで対応できた
3. **味覚グラフ**: `TasteRadarChart.jsx`に`layout="row"`propを追加（既定は従来通り`"stacked"`）。`row`のときは図と数値一覧（縦積みの罫線区切りリストへ変更）を横並びにする。ArchetypeCard.jsx（Diagnosisページ）は`layout`を指定していないため見た目に影響なし。RecordDetailPage.jsxだけ`layout="row"`を渡す
4. **関連する記録（EntityDetail）**: `<ul>`+`<li>`+`<Link>`のカード形式から`<table>`（タイトル/日付/評価/メモの4列）へ変更。行のスクロールイン演出（`useReveal`）は`transform`が`<tr>`で仕様上不安定なため削除した（見た目だけの演出で機能的な後退ではない）。新規i18nキー4件（`entityDetail.recordsTableTitle`等）
5. **種別ごとの内訳（EntityDetail）**: 完全に実装し忘れていたセクションを追加。`relatedTypes`ごとに`item.count`の合計を集計し、最大値に対する比率で横棒グラフを描く。値ごとの個別色ではなく型共通色（`getNodeVisual`）を使う（docs/design.md「値ごとの個別色と型共通色の一貫性」の、集計値は型共通色のままという既存ルールに従う）。サイドバー列の先頭（操作ボタン・Discover提案より前）に配置。新規i18nキー`entityDetail.breakdownHeading`

**変更ファイル**:
- 新規: `frontend/src/components/KpiStrip.jsx`
- `frontend/src/pages/RecordDetailPage.jsx`・`EntityDetailPage.jsx`
- `frontend/src/features/coffee-records/components/TasteRadarChart.jsx`
- `frontend/src/features/similarRecords/components/SimilarRecords.jsx`
- `frontend/src/i18n/locales/ja.json`・`en.json`（`entityDetail.recordsTable*`4件・`entityDetail.breakdownHeading`追加）

**データフロー**: 変更なし。「種別ごとの内訳」もAPIが既に返している`detail.relatedAttributes`の`count`を集計しているだけで、新しいAPI呼び出しは追加していない。

**実行したテストと結果**: `npm run lint`（0エラー）・`npm run build`（0エラー）・`npm run test`（356件、0エラー。既存テストの修正は不要だった）。claude-in-chromeでローカルMongoDBへ一時切り替えのうえ実機確認: KPIストリップの区切り線、似た記録の2列グリッド、関連する記録の表形式、種別ごとの内訳の横棒グラフ（フレーバー13件を最大値として他種別が比例縮小）をいずれもモック通りに確認。デスクトップでページ自体がスクロールしないことも再確認済み。

**未解決事項**: 特になし。

---

### 2026-09-21: Statsページのダッシュボード化

**実装対象**: `StatsPage.jsx`を、RecordDetail/EntityDetailと同じダッシュボード方針（KPIストリップ+lg以上でビューポートに収める構成）へ作り直した。

**なぜ今実装するのか**: ユーザーから「statsページです。まずはモックを作成してください」という依頼。Artifactでモックを提示したところ「スクロール不要にしたい」という追加要望を受け、「記録のペース」（3項目）と「Collection」（6項目）のKPI行を1本へ統合し、唯一内容量が伸びうる「味の傾向」のランキングだけを可変領域にする案へモックを修正し、承認を得てから実装した。

**実装内容**:
- **KPIストリップの統合**: `OverviewStats.jsx`に`variant`prop（既定`"cards"`、新規`"strip"`）を追加した。`"strip"`のときは個別に枠+影が付く`StatCard`ではなく、`KpiStrip`の中で使う裸の`KpiTile`（components/KpiStrip.jsx）のフラグメントを返す。`DiagnosisPage.jsx`は`variant`を指定していないため既定の`"cards"`のまま、見た目に変化は無い（実機で確認済み）。`CollectionStats.jsx`は呼び出し元がStatsPage.jsxの1箇所のみだったため、`variant`分岐を作らず`KpiTile`のフラグメントを返す形へ直接変更した
- **KpiStrip.jsxの列数を修正**: 固定`grid-cols-4`のままだと9タイル（3+6）が4/4/1に折り返され、最終行に大きな空白セルができてしまった。`grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr))`へ変更し、タイル数に応じて自動的に列を埋めるようにした（RecordDetail/EntityDetailの4タイルでも見た目は変わらないことを確認済み）
- **見出しの統合**: 「記録のペース」「Collection」の2見出しを「記録の概要」（新規i18nキー`stats.summaryHeading`）1つへ統合し、「世界地図で見る」リンクをそこへ付け替えた。不要になった`stats.paceHeading`/`stats.collectionHeading`キーは削除した
- **グラフのカード化**: `MonthlyTrendChart.jsx`・`RatingDistributionChart.jsx`の独自の枠線スタイル（影なし）を、他のダッシュボードカードと同じ`cardClass`（影付き）へ揃え、グラフの高さも詰めた（コンパクトな2カラム常時表示のため）。両者ともStatsPage.jsxの1箇所でしか使われていないため安全に変更できた
- **ランキングの個別カード化**: 以前は1つの大きい`cardClass`セクション内に5つの`TopRankingList`を並べていたが、種別ごとに個別の`cardClass`カードへ分割し、`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`のグリッドに並べた（`TopRankingList.jsx`自体は変更していない。DiagnosisPage.jsxでの素の使用にも影響なし）
- **ビューポートフィット**: ページ全体を`lg:h-[calc(100vh-3.5rem)] lg:flex lg:flex-col`にし、KPIストリップ・グラフ2カラムは自然な高さのまま、ランキンググリッドだけ`lg:flex-1 lg:min-h-0 lg:overflow-y-auto`にして残りの高さを埋める。ランキングは各種別最大5件までという上限（`docs/features.md`）があり内容量が予測できるため、RecordDetail/EntityDetailで踏んだ「flex-basis:0%と自然な高さの兄弟が混在して潰れる」不具合の対象にはならなかった（唯一の可変領域のため競合する兄弟が無い）

**変更ファイル**:
- `frontend/src/pages/StatsPage.jsx`・`StatsPage.test.jsx`
- `frontend/src/features/stats/components/OverviewStats.jsx`・`CollectionStats.jsx`・`MonthlyTrendChart.jsx`・`RatingDistributionChart.jsx`
- `frontend/src/components/KpiStrip.jsx`
- `frontend/src/i18n/locales/ja.json`・`en.json`（`stats.summaryHeading`追加、`stats.paceHeading`/`stats.collectionHeading`削除）
- `docs/design.md`（「Stats」節に追記）・`docs/features.md`（Stats節・World Map節の「Collection」表記を更新）

**データフロー**: 変更なし。表示の再構成のみで、`GET /api/stats`のレスポンス形（`overview`/`collection`フィールド名含む）は変更していない。

**実行したテストと結果**: `npm run lint`（0エラー）・`npm run build`（0エラー）・`npm run test`（356件、うち`StatsPage.test.jsx`の見出しアサーションを新しい見出しに合わせて更新）。claude-in-chromeでローカルMongoDBへ一時切り替えのうえ実機確認: KPIストリップが9タイルを1行で均等に表示すること、グラフ2カラム、ランキングの個別カード化、デスクトップ（1680px）でページ自体がスクロールしないこと（`document.documentElement.scrollHeight === clientHeight`）、DiagnosisPage.jsxのOverviewStats表示に変化が無いことをいずれも確認した。

**未解決事項**: 特になし。

---

### 2026-09-21: 記録詳細「つながり」図をGraph画面のデザインへ統一

**実装対象**: `RecordConnectionsDiagram.jsx`（記録詳細ページの「つながり」セクション）のノード・エッジの見た目を、GraphCanvas.jsx・NodeDetailPanel.jsxの2026-09の作り直しに揃えた。

**なぜ今実装するのか**: ユーザーから「records詳細ページのグラフプレビューが実際のグラフのデザインと異なります。統一させて。」という指摘。確認したところ、`nodeColor.js`（ノードの色を1箇所で決める共有ヘルパー）経由でアイコンの色自体は既に統一済みだったが、ノードの見た目（輪郭線+`bg-surface-1`の中立背景 vs 実際のGraphの塗りつぶし円）とエッジの色（一律`stroke-surface-2`グレー vs 実際のGraphの属性ノード色）が、2026-09のGraph画面の作り直し（「輪郭線+小さいアイコン」→「種別色で塗りつぶした円+暗色アイコン」、エッジも属性ノードの色を帯びる）に追随できておらず、移行漏れだったことが分かった。

**実装内容**:
- **ノード**: 中心の記録ノード・各属性ノード（`ConnectionNode`）を、NodeDetailPanel.jsxと同じ「塗りつぶし円（`getNodeSolidBgClass`）+暗色アイコン（`text-on-inverse`）+`shadow-elevated`」へ変更した。中心ノードは`getNodeVisual("record").solidBgClass`をそのまま使用
- **エッジ**: `recordConnectionsLayout.js`（DOM非依存の純粋関数）の各edgeオブジェクトに`type`/`label`を追加した。フレーバーの幹（中心→trunk）は複数のフレーバーで共有する線のため特定の値を持たず、`label: null`にした。`RecordConnectionsDiagram.jsx`側で`edgeColorHex()`ヘルパーを新設し、GraphCanvas.jsxの`edgeColor()`（属性ノード側の色を使う）と同じロジックでSVGの`stroke`に生のhex値を渡す（`label`があれば`getNodeColorHex`で個別色/型共通色を自動判定、`label`が無い幹だけは`getNodeVisual(type).canvasColor`で型共通色に固定。`getNodeColorHex`へlabel:nullを渡すとflavorAccent.jsの汎用フォールバック色（中立グレー）になってしまい、フレーバーらしい色にならないため使わなかった）

**変更ファイル**:
- `frontend/src/features/graph/components/RecordConnectionsDiagram.jsx`
- `frontend/src/features/graph/utils/recordConnectionsLayout.js`
- `docs/design.md`（「値ごとの個別色と型共通色の一貫性」節に追記）

**データフロー**: 変更なし。表示の見た目のみで、`buildRecordConnectionsLayout`が受け取る入力（record.components等）・返す座標は変えていない（各edgeに`type`/`label`フィールドを追加しただけ）。

**実行したテストと結果**: `npm run lint`（0エラー）・`npm run build`（0エラー）・`npm run test`（356件、0エラー。既存の`recordConnectionsLayout.test.js`・`RecordConnectionsDiagram.test.jsx`は座標・リンク・件数のみを検証しており色を見ていないため、修正不要だった）。claude-in-chromeでローカルMongoDBへ一時切り替えのうえ実機確認: ブレンド記録の「つながり」図（Ethiopia/Guatemala/Natural/Washed/Medium/Floral/Chocolate）を`/graph?focus=record:<id>`で同じ記録を開いた実際のGraph画面と並べて比較し、ノードの色（Ethiopiaの個別色、Natural/Washedの精製方法共通色等）・塗りつぶしの見た目が一致することを確認した。

**未解決事項**: 特になし。

---

### 2026-09-21: 記録詳細つながり図の線幅調整、Profileページの余白・タイポ統一

**実装対象**: (1) `RecordConnectionsDiagram.jsx`のエッジのstrokeWidthを1.1→0.5へ細くした。(2) `ProfilePage.jsx`のsection見出し・余白を他の詳細系ページ（RecordDetail/EntityDetail/Stats）と揃えた。

**なぜ今実装するのか**: (1)はユーザーから「繋がりの線を細くして」という指摘。(2)は「Profileページもダッシュボード化すべきでは」という相談に対し、一本道の設定フォーム（並べて見せる数値・ランキングが無い）という性質上ダッシュボード化は不要と回答したうえで、「余白・タイポを揃えて」という指示を受けて対応した。

**実装内容**:
- (1) 前回のGraph画面デザイン統一の直後の微調整のみ
- (2) `ProfilePage.jsx`の4つのsection見出し（表示言語・アカウント情報・パスワードを変更・アカウントを削除）を`text-sm`→`text-base`（RecordDetailPage等と同じ5段階タイプスケールの「カード内タイトル」相当）へ統一。見出し→本文の余白を`mt-4`→`mt-5`（他ページと同じ）へ統一。名前変更のsectionだけ他の3sectionと違い見出しが無かったため、新規i18nキー`profile.accountHeading`（「アカウント情報」。メールアドレスの読み取り専用表示もこのsection内にあるため）を追加して揃えた。あわせて、`{!isLoading && !error && user && (<>...`のJSXインデントが崩れていた（フラグメント内の要素が親と同じ深さのまま平坦になっていた）のを整形した

**変更ファイル**:
- `frontend/src/features/graph/components/RecordConnectionsDiagram.jsx`
- `frontend/src/pages/ProfilePage.jsx`
- `frontend/src/i18n/locales/ja.json`・`en.json`（`profile.accountHeading`追加）
- `docs/design.md`（「Profile / Settings」節に追記）

**データフロー**: 変更なし（表示・スタイルの変更のみ）。

**実行したテストと結果**: `npm run lint`（0エラー）・`npm run build`（0エラー）・`npm run test`（356件、0エラー。`ProfilePage.test.jsx`含め既存テストの修正は不要だった）。claude-in-chromeでローカルMongoDBへ一時切り替えのうえ、Profileページの4見出しがすべて同じサイズで揃っていること、アカウント情報sectionに見出しが表示されることを実機確認した。

**未解決事項**: 特になし。

---

## 未解決事項

- 2026-08-26、収束後のグラフレイアウトが詰まって見える問題は、衝突半径をノードごとの実サイズ＋ラベル余白に連動させる（`nodeCollideRadius`）ことで対処した。`chargeStrength: -450`・`linkDistance: 100`・sqrtカーブの`DEGREE_SIZE_SCALE: 18`は実データ（記録15件）での目視確認に基づく値のため、記録数がさらに増えた場合の見え方は未検証
- 2026-08-26、グラフを開いた直後に大きくズームアウトして見づらい問題が発生。当初「`chargeStrength`不足でノードが重なって固定される」と誤診断したが、実際の原因は「産地・精製方法・フレーバー等を何も選択していない記録（エッジ0本の孤立ノード）が反発力だけで際限なく漂流し、それを画面に収めようとカメラが大きくズームアウトする」ことだった。`GraphCanvas.jsx`に中心への引き戻し力（`forceX(0)`/`forceY(0)`、strength 0.05）を追加して解消済み（詳細は2026-08-26の追記エントリ参照）。なお、これとは別に対処を一度ユーザーの確認を取らずに実装してしまい（`warmupTicks`等）、新たな副作用を生んだため取り消した経緯がある（同エントリ参照）。同種の孤立ノードが将来大量に増えた場合の見え方までは検証していない
- Graph画面で「たまにノードが巨大化して見える」というユーザー報告は、2026-08-26にユーザーへ再ヒアリングした結果、以前の診断（カメラのbounding box計算タイミングが原因）が誤りだったと判明した。正しい原因は「グラフ画面を開いたまま他のタブ・アプリに切り替えて放置すると、`window.devicePixelRatio`のズレによりcanvasの描画倍率が実際の内部解像度とずれる」というもの（詳細は2026-08-26のエントリ参照）。発生条件が特殊でリロードという回避策も既にあるため、ユーザーと相談のうえ修正は見送っている
- ~~`react-force-graph-2d`の`onEngineTick`/`onEngineStop`が発火しない問題~~ → 2026-09-18、`react-force-graph-2d`（d3-force）自体を自前の物理演算へ全面置き換えたため解消（該当エントリ参照）。ライブラリの内部実装に依存する不具合ではなくなった
- FastAPIサービスは現状ヘルスチェックのみで、コーヒードメインの実処理を持たない（`docs/architecture.md`の方針通りの意図的な状態であり、バグではない）
- 知識グラフの`dateFrom` / `dateTo`フィルターはAPI・純粋関数側には実装済みだが、フロントエンドのフィルターUIには未反映
- Space Monoは評価・日付・グラフの件数にのみ適用済み。`RecordsPage`の件数表示（`records.countLabel`）など、他の数値表示への適用可否は未判断
- Insightの優先度選択（`insightBuilder.js`のPRIORITY）は現状固定順。ユーザーの記録傾向によっては同じ種類のInsightばかり出続ける可能性があり、「全件見る」画面や表示の入れ替わりは未実装
- 検索結果の属性カード一覧（`entities`）は現状recordCount順のみで、多数の属性がヒットしたときの上限や、さらに絞り込む手段は未実装
- エンティティ詳細ページの関連属性は種別ごと最大5件まで。件数が多い属性（例: フレーバーが10種類以上共起する）を全部見る手段は未実装
- Statsページは全期間の記録から計算しており、期間フィルター（直近3か月/今年など）は未実装（`docs/stats.md`の設計通り、Insightと同じく「記録全体のふりかえり」を示すための意図的な仕様だが、記録件数が増えた場合は要検討）
- Discoverの提案（`docs/features.md`「Discover」）の「この産地を記録してみる」リンクは`/records/new`への単純な遷移で、産地の事前入力はしていない（`RecordForm`にプリフィル機構が無いため）
- CQI参照データ（`backend/data/cqiDatabase.json`）は目安値であり、実際のCQIデータベースの正確な値を再現したものではない（開発環境に外部データセットを取得するネットワークアクセスが無いため。ファイル内コメントに明記済み）
- 2026-08-31（案D）、`frontend/src/App.css`（当時8,930行）の全クラスセレクタとJSX側の実際の使用箇所を機械的に突き合わせたところ、847個のトップレベルセレクタのうち801個が未使用の可能性があるという、想定を大きく超える規模のMLB時代のCSS残存が判明した。ただし機械的な文字列照合には限界があり（`` `toast toast--${type}` ``のようなテンプレートリテラルで動的に組み立てるクラス名は誤って未使用判定されうる）、801件の一括削除は安全ではないため見送った。`PageHeader.jsx`削除（下記）に伴い、参照元を1コンポーネントへ完全に限定できた`.page-header*`等（約145行）だけを安全に削除済み。2026-08-31（設計レビュー）に、このファイルへ名指しで記載されていた`.home-player-section`等4セレクタ+関連2ブロック（計約110行）も追加で削除した。2026-09-01、残り約800件についても、動的クラス名の誤検出パターン（`toast--*`）を洗い出したうえで機械的な安全判定を行い、779クラス・1036ルールを一括削除した（`App.css`は1,368行まで縮小。詳細は該当日のエントリ参照）。生きているUI（40クラス）と、汎用的な修飾子クラスとの組み合わせで判断を保留した19クラスだけが残っている（`docs/mlb-legacy-inventory.md`参照）
- `HomeVsCafeCard.jsx`と対応するi18nキー（`stats.homeVsCafeHeading`）・APIの`homeVsCafe`フィールドは、Statsページの3段構成からは表示を外したが、削除せず残している（将来の再導入候補）。当面はコード上に存在するが画面には出ない状態が続く
- フロントエンドのテストは、2026-09-01時点で`RecordForm`まわり・`ChipMultiSelect`・`TasteRadarChart`・`Discover`/`OriginQuality`関連・`WorldMap`・`ConfirmDialog`・`recordFormat`/`errorMessage`/`authFormValidation`/`ProtectedRoute`/`AppErrorBoundary`/`recordConnectionsLayout`（設計レビューで追加）に加え、`EmptyState`/`Navbar`/`NodeDetailPanel`/`RecordConnectionsDiagram`/`GraphNodeSearch`/`RatingInput`/`FormField`/`RecordCard`/`HomeRecordCard`と、Login/Register/Profile/Home/Records/Stats/Diagnosis/EntityDetail/Graph/WorldMap/RecordDetailの全ページ（2026-09-01のエントリ参照）へ広がった。`GraphCanvas.jsx`本体（canvas描画・物理演算。jsdomでは動かない）と、表示専用の集計・検索系コンポーネント（`OverviewStats`/`RatingDistributionChart`/`TopRankingList`/`CollectionStats`/`MonthlyTrendChart`/`HomeVsCafeCard`/`DiscoverCard`/`ArchetypeCard`/`InsightList`/`SearchBox`/`EntityResultCard`/`StatCard`/`ErrorCard`）はまだテスト対象外
- 本番環境（Render）のログにエラーが出ていないかは未確認（アクセス権が無いため、ユーザー自身での確認が必要）
- danger/warn/rating/successの新しい値（mobbin.com実測のhue系）は、実際にmobbin.com上で可視使用されている場面を確認できないまま採用した。danger色はRegister/Loginのバリデーションエラー（欄の枠線・メッセージ）で実機確認済み（2026-08-20）。warn/successのトースト表示はまだ未確認
- Navbarアイコンのホバーアニメーション（`@animateicons/react`）は、ホバー時の背景ピル表示・アイコン切り替わりの範囲はブラウザで確認したが、キーボードフォーカス時の挙動と`prefers-reduced-motion`環境での見え方は未確認（静止スクリーンショットでは動きそのものの検証に限界があるため）
- `@animateicons/react`導入により初期バンドルが+89.6KB gzip増加した状態を、ユーザーの明示的な判断で受け入れている（ツリーシェイキングが効かない構造のため。上記エントリ参照）。将来バンドルサイズが問題になった場合はソースコピー方式への切り替えを検討する
- notesのキーワード辞書（`backend/data/tasteKeywords.json`）は初期セット（約28語）のみで、実際のユーザーの記録データに基づくチューニング（語の追加・削除、カテゴリ見直し）は未実施
- Insight/Statsへのkeywordノード活用は、今回意図的にスコープ外とした（`docs/features.md`「Graphとの境界」参照）。Graphのみで完結しており、機能としては欠けていない
- `noteKeywordExtractor.js`の否定ガード（`NEGATION_PARTICLES`）は、マッチした語の直後数文字だけを見る局所的な判定のため、文全体を後から打ち消す言い回し（例:「チョコレートのようなコクのあるコーヒーだと思っていたら、違っていた。」のように、離れた場所の「違っていた」で前半の印象を撤回する文）には対応できず、誤って`チョコレートのような`（flavorAlias経由でChocolateノードへ）・`コク`をキーワードとして検出してしまう。ユーザーと相談のうえ、これは辞書＋部分文字列一致というルールベース方式の設計上の限界として受け入れる方針にした（文構造の解析にはAI/NLPが必要で、`docs/product.md`「MVP Before Intelligence」の精緻化後もAI/NLPは引き続きスコープ外のため）。誤検出の影響は「余分なノードが1つ付く」程度に留まり、記録データ自体は壊れない。将来直すとしても、否定パターンの追加羅列ではなく根本的にNLPへ切り替える判断が必要になる
- コーヒー診断（`backend/core/diagnosis/diagnosisBuilder.js`）の8種類のARCHETYPESと閾値（`minRoastSample: 3`・`minFlavorSample: 3`）はデモデータでの動作確認のみで、実際のユーザーの記録傾向に基づくチューニングは未実施（`tasteKeywords.json`と同種の課題）
- ~~2026-08-27、`--color-accent-*`のトークン名が指すノード種別が変わっていた件（`nodeVisuals.js`で要確認）~~ → 2026-09-18、グラフのノード種別色は`--color-accent-*`から独立した専用トークン（`--color-graph-*`）へ分離したため、この注意事項自体が対象外になった（該当エントリ参照）。~~`--color-accent-*`は引き続きDiscover・WorldMapLegend・OverviewStats・Diagnosisのarchetype色として使われている~~ → 2026-09-18（デザイン・テーマの統一）、Discover・WorldMapLegend・Diagnosisを`--color-graph-*`へ移行し、`--color-accent-*`自体を削除した（該当エントリ参照）
- 2026-08-27に追加したGraph画面のノード検索（`GraphNodeSearch.jsx`）は、マウス/タップ操作のみでキーボードでの候補移動（矢印キー）には対応していない
- `frontend/src/features/map/utils/countryCodes.js`のISO alpha-2→numeric-3対応表は、現在`backend/seeds/data/origins.js`の20か国のみ検証済み。新しい産地をorigins.jsへ追加する際は、この対応表への追加も忘れないこと（追加し忘れてもエラーにはならず、その産地が地図上でハイライトされないだけ）
- `backend/repositories/coffeeRecordRepository.js`の`.populate("originId", "name")`が`countryCode`を含んでいなかった不具合（2026-08-28に`"name countryCode"`へ修正）と同様に、他のマスターデータのpopulate選択フィールドも「フロントが実際に必要とする全フィールドを網羅しているか」を機能追加のたびに確認する必要がある（同種の見落としが再発する可能性があるため）
- 2026-08-29の監査で見つかった項目のうち、`coffeeRecordQueryValidator.js`の`SORT_OPTIONS`の`__proto__`対策・`PATCH /api/users/me/password`のレート制限・`searchController.js`の配列クエリ対策・`User.js`の`email` `lowercase: true`・`authController.js`のタイミングサイドチャネル・`changePassword`の型検証・`ConfirmDialog.jsx`のフォーカス復元・`Navbar.jsx`の`aria-label`翻訳/`aria-expanded`は、2026-08-31までに全て対応済み（案A関連の各エントリ参照）。`utils/authFormValidation.js`のテストも2026-08-31（設計レビュー）に追加済み
- 2026-08-29、産地アクセントカラーをハッシュ方式から地域グループ×手動対応表（`originAccent.js`の`ORIGIN_NAME_TO_HEX`）へ切り替えた。新しい産地を`backend/seeds/data/origins.js`へ追加する際は、`countryCodes.js`と同様にこの対応表への追記が必要（追加し忘れても中立グレーになるだけでエラーにはならない）
- `frontend/src/App.css`の`--app-font`と`frontend/src/index.css`の`:root` font-familyが、同じ内容を2箇所で保持する重複構造になっている（2026-08-29のフォント使い分け復活時に同期漏れが実際に不具合を起こして発覚。両方は更新済みだが、根本的な重複自体は解消していない）
- 2026-08-30、ローディングスケルトンのレビューで、`App.css`に未参照のMLBレガシーCSS（`.scout-loading`・`.scout-skeleton-*`・`.future-star-card--loading`）を新たに発見した（`docs/mlb-legacy-inventory.md`が把握していた箇所とは別）。実害は無いが未整理のまま残っている
- ~~2026-08-30、Statsページのスケルトン修正時に、ローカルのbackendが`MongoDB connection error: bad auth`で起動できないことが判明した~~ → 2026-09-19、Renderダッシュボードから最新の接続文字列を取得し`backend/.env`を更新して解消（該当エントリ参照。原因はAtlasのDB利用ユーザー・パスワードが以前のものから変わっていたこと）
- 2026-08-30、ローディングスケルトンのレビュー（同日）で「`StatsSkeleton.jsx`は現状と一致している」と判断したのは誤りだった（`cardClass`化への追随だけを見ており、内部の`StatCard`/`TopRankingList`構造までは突き合わせていなかった）。同日中にユーザー指摘で修正済みだが、今後同種のレビューでは子コンポーネントの内部構造まで一段深く確認する
- 2026-08-30、コーヒー診断の強化で新規追加した13タイプ分の日本語・英語コピー（タイトル・説明文）は、既存5タイプと同じトーンで新規に書き下ろしたものであり、実データでの見え方の検証は行っていない
- 2026-08-30、診断の判定軸（焙煎度×フレーバーcategory）には`rating`（総合評価）を使っていない。ユーザーへの確認では選択肢に含めたが選ばれなかった（将来「高評価のタイプ」等のバッジを追加する場合の候補として残る）
- 2026-09-20、RecordDetail/EntityDetailのダッシュボード化（該当エントリ参照）で踏んだ「同じ列内でflex-basis:0%の兄弟とauto（自然な高さ）の兄弟を混在させると、コンテナが不足したときauto側が空間を奪い0%側が潰れる」というflexboxの罠は、今後同種のレイアウトを他画面に広げる際に再発しうる一般的な注意点として残る

## 次に実装すべき最小単位

MVPの完了条件（`docs/mvp.md`）は満たしているため、次に着手する場合の候補（優先度順）:

1. `App.css`に残る59個のトップレベルクラス（2026-09-01の機械的な削除で823個→59個まで縮小済み。40個は生きているUI、19個は汎用的な修飾子クラスと組み合わさっているため機械判定を保留したもの）を、個別に目視確認しながらさらに整理する
2. フロントエンドのテストを、Tier 3の表示専用コンポーネント（`OverviewStats`等、2026-09-01のエントリ参照）と`GraphCanvas.jsx`本体（canvasに依存するため工夫が要る）へさらに広げる
3. コーヒー診断のARCHETYPES（2026-08-30に21種類へ拡張済み）・閾値・新規13タイプのコピーを実データで検証し、調整する
4. keywordノードの辞書（`tasteKeywords.json`）を実データで検証し、語の追加・調整を行う
5. Insight/StatsでnoteKeywordExtractor.jsの結果を活用する機能を検討する（現状は意図的にGraphのみ）
6. Navbarアイコンのホバーアニメーションを、キーボードフォーカス時の挙動と`prefers-reduced-motion`環境で確認する
7. warn/successカラーが使われるトースト通知をブラウザで実機確認する
8. `records.countLabel`等、Space Monoが未適用の数値表示への適用可否を判断する
9. `OriginQualityScores`・`SimilarRecords`のモバイル幅での表示確認（2026-08-31、iframeを使う代替手法でHome/Records/Graph/World Mapは確認済みだが、この2つはまだ未実施）。同じiframe手法（IMPLEMENTATION.md該当エントリ参照）で確認できる
10. 2026-08-31（設計レビュー）で明示的にスコープ外とした4項目（JWTリフレッシュ・失効機構の新設、知識グラフのキャッシュ・ページネーション導入、全エンドポイントへのレート制限拡大、GraphCanvasの完全なキーボード操作対応）は、いずれもユーザーとの相談・別途の設計判断が必要な規模のため、着手する場合はまず方針を相談する
11. 2026-09-17、グラフ画面のラベル密集対応でArtifactにより検討した4案（A: 静かな星図/B: フォーカスモード（採用済み）/C: 諸島マップ/D: 一覧＋ミニグラフ）のうち、B以外は未実装のまま残っている。ノードの物理的な間隔（`chargeStrength`/`linkDistance`）自体の見直しも未着手（記録数がさらに増えた場合の詰まり具合が引き続き未検証のため）。将来さらに手を入れる場合、A（種別ごとの弧状レーン配置）かC（種別ごとの領域分け）を間隔調整とあわせて検討する
12. 2026-09-18、「デザイン・テーマの統一」で見つかった`originAccent.js`（パステル寄り明度）と`flavorAccent.js`（彩度の高い個別色）のトーンの不一致（同じ画面に並ぶと産地色がフレーバー色より弱く見える）を、着手するか含めてユーザーと相談する
13. ~~`backend/.env`のAtlas接続情報（`MONGO_URI`）が`bad auth`で使えない状態が2026-08-30から継続~~ → 2026-09-19に解消（上記「未解決事項」参照）
14. 2026-09-19のバックフィル（同エントリ参照）で発覚した「スキーマ変更時のバックフィル忘れ」を防ぐ一般的な運用（マイグレーション手順のチェックリスト化等）は未検討
