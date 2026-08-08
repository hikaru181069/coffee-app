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

---

## 未解決事項

- 収束後のグラフレイアウトが以前（React Flow版）より詰まって見える。`chargeStrength`を強めても改善が小さく、根本原因は未特定（`FORCE_PARAMS`のコメント参照）
- `GraphCanvas`のsizeは初回計測値で固定しており、マウント後にウィンドウをリサイズしてもグラフのキャンバスサイズは追従しない（ズーム・ドラッグ・クリックの安定動作を優先したトレードオフ。上記エントリ参照）
- 物理シミュレーションがまだクラスタ状に固まっているごく早いタイミング（開いた直後）でユーザーが操作すると、`userInteractedRef`により以後の自動フィットが完全に止まり、窮屈な配置のまま固定される。実用上は数秒待てば回避できるが根本対処ではない（上記エントリのトレードオフ参照）
- FastAPIサービスは現状ヘルスチェックのみで、コーヒードメインの実処理を持たない（`docs/architecture.md`の方針通りの意図的な状態であり、バグではない）
- 知識グラフの`dateFrom` / `dateTo`フィルターはAPI・純粋関数側には実装済みだが、フロントエンドのフィルターUIには未反映
- Space Monoは評価・日付・グラフの件数にのみ適用済み。`RecordsPage`の件数表示（`records.countLabel`）など、他の数値表示への適用可否は未判断
- `feat/graph-dynamic-visuals`（React Flow版、放棄済み。`feat/graph-force-graph-2d`は2026-08にmain済み）は削除候補
- Insightの優先度選択（`insightBuilder.js`のPRIORITY）は現状固定順。ユーザーの記録傾向によっては同じ種類のInsightばかり出続ける可能性があり、「全件見る」画面や表示の入れ替わりは未実装
- 検索結果の属性カード一覧（`entities`）は現状recordCount順のみで、多数の属性がヒットしたときの上限や、さらに絞り込む手段は未実装
- エンティティ詳細ページの関連属性は種別ごと最大5件まで。件数が多い属性（例: フレーバーが10種類以上共起する）を全部見る手段は未実装
- Statsページは全期間の記録から計算しており、期間フィルター（直近3か月/今年など）は未実装（`docs/stats.md`の設計通り、Insightと同じく「記録全体のふりかえり」を示すための意図的な仕様だが、記録件数が増えた場合は要検討）
- `BottomTabBar`のタブがStats追加で5個になった。ブラウザ自動化ツールでモバイル幅のビューポートを再現できず、狭い画面での折り返し・ラベル省略の見た目は未確認（実機での確認を推奨）
- **Home画面のInsight/GraphPreview（`flex-[2]`/`flex-[5]`で横並び）が、モバイル幅（実測316px）で崩れる。** Insightカードの幅が約90pxまで潰れ、文章が単語ごとに折り返って読めなくなる不具合を実機確認済みだが、未修正のまま（`lg`未満で縦積みに戻すなどの対応が必要）
- Discoverの提案（`docs/discover.md`）の「この産地を記録してみる」リンクは`/records/new`への単純な遷移で、産地の事前入力はしていない（`RecordForm`にプリフィル機構が無いため）
- CQI参照データ（`backend/data/cqiDatabase.json`）は目安値であり、実際のCQIデータベースの正確な値を再現したものではない（開発環境に外部データセットを取得するネットワークアクセスが無いため。ファイル内コメントに明記済み）
- `frontend/src/App.css`の`.home-banner`（サイドバー幅を打ち消す`margin-left: -13rem`を含む）は、サイドバー廃止後もどのJSXからも参照されていない死んだCSSのまま残っている。削除候補

## 次に実装すべき最小単位

MVPの完了条件（`docs/mvp.md`）は満たしているため、次に着手する場合の候補（優先度順）:

1. **Home画面のInsight/GraphPreviewをモバイル幅で縦積みに戻す**（上記の未解決事項。実機で崩れを確認済みの既知バグ）
2. `BottomTabBar`（5タブ化）をモバイル実機またはエミュレータで見た目確認する
3. Graph画面のフィルターUIに`dateFrom` / `dateTo`を追加する（バックエンドは実装済み）
4. Discoverの「この産地を記録してみる」を、産地を事前入力した状態で`/records/new`へ渡せるようにする
5. 収束後のレイアウト密度・ラベルの重なりを調整する（優先度は低い。実用上は問題ないため）
6. `feat/graph-dynamic-visuals`（React Flow版、放棄済み）ブランチを削除する
7. 記録詳細画面に「関連ノード」を直接埋め込む（現状はGraph画面・エンティティ詳細ページへの遷移のみ）
8. デプロイ設定の確認（Vercel / Render / MongoDB Atlas）とスクリーンショットの追加
