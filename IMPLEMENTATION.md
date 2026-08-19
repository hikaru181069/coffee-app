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

---

## 未解決事項

- 収束後のグラフレイアウトが以前（React Flow版）より詰まって見える。`chargeStrength`を強めても改善が小さく、根本原因は未特定（`FORCE_PARAMS`のコメント参照）
- Graph画面で「たまにノードが巨大化して見える」というユーザー報告への対処（カメラを合わせる処理にアニメーション時間を持たせた）は、コード上の有力な原因への対処であり、元の不具合を確実に再現できた上での検証ではない。再発する場合は追加調査が必要（上記エントリ参照）
- `react-force-graph-2d`の`onEngineTick`/`onEngineStop`が、力学シミュレーション自体は実際に動いている（`getGraphBbox()`で確認済み）にもかかわらず一度も発火しない。`react-kapsule`・`force-graph`本体のソースを読んでも確実な原因は特定できておらず、現状は自前の`requestAnimationFrame`ループで代替している（`GraphCanvas.jsx`冒頭の既知の不具合4、上記「`?focus=`遷移時にカメラをフォーカス対象ノードの周辺へズームする」エントリ参照）。ライブラリのバージョンアップ等で発火するようになった場合は、この代替実装は不要になる可能性がある
- `GraphCanvas`のsizeは初回計測値で固定しており、マウント後にウィンドウをリサイズしてもグラフのキャンバスサイズは追従しない（ズーム・ドラッグ・クリックの安定動作を優先したトレードオフ。上記エントリ参照）
- グラフを開いてから2秒間（カメラがフォーカス対象へ追従する間）にユーザーが操作すると、`userInteractedRef`により以後の自動フィットが完全に止まり、窮屈な配置のまま固定される。実用上は数秒待てば回避できるが根本対処ではない（上記エントリのトレードオフ参照）
- FastAPIサービスは現状ヘルスチェックのみで、コーヒードメインの実処理を持たない（`docs/architecture.md`の方針通りの意図的な状態であり、バグではない）
- 知識グラフの`dateFrom` / `dateTo`フィルターはAPI・純粋関数側には実装済みだが、フロントエンドのフィルターUIには未反映
- Space Monoは評価・日付・グラフの件数にのみ適用済み。`RecordsPage`の件数表示（`records.countLabel`）など、他の数値表示への適用可否は未判断
- Insightの優先度選択（`insightBuilder.js`のPRIORITY）は現状固定順。ユーザーの記録傾向によっては同じ種類のInsightばかり出続ける可能性があり、「全件見る」画面や表示の入れ替わりは未実装
- 検索結果の属性カード一覧（`entities`）は現状recordCount順のみで、多数の属性がヒットしたときの上限や、さらに絞り込む手段は未実装
- エンティティ詳細ページの関連属性は種別ごと最大5件まで。件数が多い属性（例: フレーバーが10種類以上共起する）を全部見る手段は未実装
- Statsページは全期間の記録から計算しており、期間フィルター（直近3か月/今年など）は未実装（`docs/stats.md`の設計通り、Insightと同じく「記録全体のふりかえり」を示すための意図的な仕様だが、記録件数が増えた場合は要検討）
- Discoverの提案（`docs/features.md`「Discover」）の「この産地を記録してみる」リンクは`/records/new`への単純な遷移で、産地の事前入力はしていない（`RecordForm`にプリフィル機構が無いため）
- CQI参照データ（`backend/data/cqiDatabase.json`）は目安値であり、実際のCQIデータベースの正確な値を再現したものではない（開発環境に外部データセットを取得するネットワークアクセスが無いため。ファイル内コメントに明記済み）
- `frontend/src/App.css`に、MLB時代のホーム画面（Team/Favorites/Recommendationsセクション、`player-list-carousel`等）向けの未参照CSSが別のブロックとしてもう1箇所残っている（2026-08に`.home-banner`等460行分は削除済みだが、`.home-player-section`等の同名クラスの別定義がまだ残存。`docs/mlb-legacy-inventory.md`参照）。JSXから一切参照されていないことは確認済みで、削除候補（同ブロック内で使われている旧`ctp-mauve`/`ctp-teal`/`ctp-maroon`/`ctp-peach`/`ctp-sky`/`ctp-pink`も、カラーテーマ刷新時にリネームせず残した。このブロックごと削除すれば一緒に消える）
- `frontend/src/components/PageHeader.jsx`は、当初Records/RecordDetail等で再利用する想定だったが、現在どのページからもimportされていない死んだコンポーネントとして残っている（`docs/mlb-legacy-inventory.md`参照）。削除候補
- `HomeVsCafeCard.jsx`と対応するi18nキー（`stats.homeVsCafeHeading`）・APIの`homeVsCafe`フィールドは、Statsページの3段構成からは表示を外したが、削除せず残している（将来の再導入候補）。当面はコード上に存在するが画面には出ない状態が続く
- `/api/auth/*`（register/loginそのもののエラー）と`/api/users/*`（`authenticate`ミドルウェアの401等）でエラー応答の形式が異なる（前者は`{message}`、後者は`{error: {code, message, details}}`）。frontendの`errorMessage.js`が前者の英語メッセージ文字列をそのまま照合する仕組みに依存しているため、今回は統一を見送った（上記Tier 1エントリ参照）
- `userController.js`の`findOneAndUpdate`が使う`new`オプションはMongooseの非推奨警告が出ている（`returnDocument: "after"`への置き換えが必要。動作には影響なし）
- フロントエンドのテストは検証ロジックと`ConfirmDialog`のみ。`RecordForm`本体・Graph関連（canvasに依存しjsdomでは動かない）・`ProfilePage`/`useProfile`はまだテスト対象外
- `fastapi-service/main.py`のCORS設定が`http://localhost:5001`にハードコードされたまま（実害は無いと判断し今回は未修正。frontendから直接FastAPIを呼ぶ設計に変わった場合は要修正）
- 本番環境（Render）のログにエラーが出ていないかは未確認（アクセス権が無いため、ユーザー自身での確認が必要）
- danger/warn/rating/successの新しい値（mobbin.com実測のhue系）は、実際にmobbin.com上で可視使用されている場面を確認できないまま採用した。今回の実機確認では評価の星（rating色）の表示のみ確認しており、danger/warn/successを実際に発火させる画面（バリデーションエラー等）はまだ未確認
- Navbarアイコンのホバーアニメーション（`@animateicons/react`）は、ホバー時の背景ピル表示・アイコン切り替わりの範囲はブラウザで確認したが、キーボードフォーカス時の挙動と`prefers-reduced-motion`環境での見え方は未確認（静止スクリーンショットでは動きそのものの検証に限界があるため）
- `@animateicons/react`導入により初期バンドルが+89.6KB gzip増加した状態を、ユーザーの明示的な判断で受け入れている（ツリーシェイキングが効かない構造のため。上記エントリ参照）。将来バンドルサイズが問題になった場合はソースコピー方式への切り替えを検討する

## 次に実装すべき最小単位

MVPの完了条件（`docs/mvp.md`）は満たしているため、次に着手する場合の候補（優先度順）:

1. Graph画面のフィルターUIに`dateFrom` / `dateTo`を追加する（バックエンドは実装済み）
2. Discoverの「この産地を記録してみる」を、産地を事前入力した状態で`/records/new`へ渡せるようにする
3. 収束後のレイアウト密度・ラベルの重なりを調整する（優先度は低い。実用上は問題ないため）
4. `App.css`に残るもう1箇所の未参照MLB系CSS（`.home-player-section`等）と、死んだコンポーネント`PageHeader.jsx`を削除する
5. `/api/auth/*`と`/api/users/*`のエラー応答形式の不一致を解消する（frontendの`errorMessage.js`・i18nの`errors.legacy.*`も含めた変更が必要）
6. フロントエンドのテストを、`RecordForm`本体・`ProfilePage`/`useProfile`や他の重要コンポーネントへ広げる
7. `fastapi-service/main.py`のCORS設定（`http://localhost:5001`ハードコード）を、本番のURLを想定した形へ更新する（優先度は低い。実害は無いため）
8. danger/warn/successカラーを実際に発火させる画面（バリデーションエラー等）をブラウザで実機確認する
9. Navbarアイコンのホバーアニメーションを、キーボードフォーカス時の挙動と`prefers-reduced-motion`環境で確認する
