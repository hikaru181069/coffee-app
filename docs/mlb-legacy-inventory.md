# MLB Legacy Inventory

coffee-app は mlb-app を土台として再利用している。
このファイルは、**コーヒードメインでは使わないが、まだ削除していない**
mlb-app 由来のコードを一覧にしたもの。

`prompts/00-repository-bootstrap.md` の
「MLB固有機能は、依存関係を確認せず一括削除しない / 不要機能は一覧化し、
削除は別コミットまたは別作業に分ける」に従い、bootstrap では削除しない。

棚卸しの実施タイミング: `prompts/06-portfolio-polish.md`
（「不要なconsole.log、死んだコード、MLB固有コードの整理」）

## 判断の基準

| 区分 | 意味 | 扱い |
| --- | --- | --- |
| 再利用 | 構成・パターンをコーヒードメインへ流用する | 命名と責務を見直して残す |
| 置換 | 同じ役割のコーヒー版を作って差し替える | Phase 1〜5 で置換 |
| 削除候補 | コーヒードメインに対応物が無い | Phase 6 で削除 |

## backend

### 再利用（残す）

| ファイル | 役割 |
| --- | --- |
| `app.js` / `server.js` | アプリ組み立てと起動の分離（DB無しでsupertestできる構造） |
| `config/db.js` | MongoDB接続 |
| `models/User.js` | 認証ユーザー（`favoriteTeam` / `hasCompletedOnboarding` はMLB固有、Phase 1で整理） |
| `controllers/authController.js` | register / login / JWT発行 |
| `routes/authRoutes.js` | 認証ルート |
| `middleware/authMiddleware.js` | `protect`（JWT検証 → `req.user`） |
| `services/fastApiService.js` | FastAPI呼び出しのパターン（timeout + フォールバック）。中身のMLB関数は削除候補 |
| `tests/app.test.js` | 404ハンドラのテストのみ再利用可 |

### 削除候補

| 種別 | 対象 | 件数 |
| --- | --- | --- |
| controllers | `archetype` `compare` `externalPlayer` `favorite` `game` `interaction` `league` `matchup` `news` `player` `position` `recommendation` `scout` `similarPlayer` `stats` `team` | 16 |
| routes | 上記に対応する `*Routes.js` | 16 |
| models | `Player.js` `FavoritePlayer.js` `Interaction.js` | 3 |
| services | `mlb/` 配下すべて | 17 |
| services | `recommendations/` 配下すべて | 6 |
| services | `mlbApiService.js` `recommendationService.js` `interactionService.js` | 3 |
| services | `cacheService.js`（Redis。MVPの要件に無い） | 1 |
| middleware | `uploadMiddleware.js`（アバター画像アップロード。MVP対象外） | 1 |
| data | `players.js` `oaa_2026.csv` `sprint_speed_2026.csv` `arm_strength_2006.csv` `catcher_framing_2026.csv` | 5 |
| script | `seedPlayers.js`（Phase 1 のマスターデータseedで置換） | 1 |
| tests | `playerFormatter.test.js` | 1 |
| 依存 | `ioredis`（cacheService削除時）、`multer`（uploadMiddleware削除時） | 2 |

`controllers/userController.js` と `routes/userRoutes.js` は
プロフィール更新として再利用できるが、`favoriteTeam` などMLB固有項目を含むため **置換** 扱い。

## frontend

### 再利用（残す）

`utils/apiConfig.js` / `utils/authStorage.js` / `utils/datetime.js` /
`services/api/apiError.js` / `services/api/authApi.js` /
`components/ProtectedRoute.jsx` / `contexts/ToastContext.jsx` /
`components/ErrorCard.jsx` / `components/SkeletonCard.jsx` /
`components/SearchInput.jsx` / `components/PageHeader.jsx` /
`components/Navbar.jsx` + `components/BottomTabBar.jsx`（レスポンシブ構造のみ。項目はコーヒー版へ）

### 削除候補

| 種別 | 対象 | 件数 |
| --- | --- | --- |
| pages | `Archetype` `Compare` `Discover` `ExternalPlayers` `FavoriteEdit` `Favorites` `ForYou` `Game` `Home` `League` `Matchup` `News` `OnboardingFavorites` `PlayerDetail` `Players` `Position` `Positions` `Prospects` `Recommendations` `Scout` `Search` `Stats` `Team` ほか | 約26 |
| services/api | `authApi` `userApi` `apiError` 以外すべて | 16 |
| components | `PlayerCard` `ExternalPlayerCard` `FavoritePlayerCard` `PlayerForm` `PlayerSearchSelect` `PlayerSection` `PlayerStats` `PlayerYearByYear` `ScoreCard` `TeamCard` `NewsList` `HomeHero` `FilterControls` | 13 |
| services | `mlbTeams.js` `teamColors.js` `archetypeColors.js` | 3 |
| その他 | `src/text.jsx`、`src/assets/hero.png`、`home-ui.png` / `home-ui-image.png`（MLBのスクリーンショット） | 4 |

`App.jsx` のルート定義と `App.css` はコーヒー版の画面へ全面的に書き換える（Phase 3・5）。

## fastapi-service

`docs/architecture.md` は「MVPの単純なグラフ変換はExpress内の純粋関数を優先」としているため、
MVPでは FastAPI に新規責務を持たせない想定。

### 削除候補

| 対象 | 内容 |
| --- | --- |
| `routers/archetype.py` | 選手タイプのk-means分類 |
| `routers/compare.py` | 2選手の統計比較 |
| `routers/discover.py` | 類似選手・好み一致度 |
| `routers/matchup.py` | 投手vs打者の予測 |
| `routers/preference.py` | 行動履歴からの好み計算 |
| `routers/recommend.py` | 推薦スコアリング |
| `routers/similar.py` | 類似選手（レガシー） |
| `routers/scouting.py` | スカウティングレポート |
| `core/math_utils.py` | パーセンタイル計算。将来の味覚分析で一部流用できる可能性あり |
| `tests/test_math_utils.py` | 上記のテスト |

削除する場合は `main.py` の `include_router` と、
`backend/services/fastApiService.js` の対応関数も同時に消す必要がある。

## インフラ

| 対象 | 判断 |
| --- | --- |
| `docker-compose.yml` の `redis` サービス | `cacheService.js` 削除時に一緒に削除 |
| `.github/workflows/test.yml` | ジョブ構成は再利用。テスト対象の変更に追随させる |
| `backend/Dockerfile` / `frontend/Dockerfile` | 再利用（変更不要） |
| `frontend/vercel.json` | 再利用（SPAのrewriteのみ） |
| `README.md` | Phase 6 でプロダクト中心に全面刷新 |

## 外部API依存

mlb-app は MLB Stats API と Baseball Savant のCSVに依存している。
coffee-app は外部APIに依存しないため、これらの削除後は
`backend/services/mlb/mlbClient.js` と `mlbUrlBuilder.js` も不要になる。
