# MLB Legacy Inventory

coffee-app は mlb-app を土台として再利用した。
このファイルは元々、**コーヒードメインでは使わないが、まだ削除していない**
mlb-app 由来のコードを一覧にしたもの（bootstrap時点の棚卸し）だった。

2026-08、「本番品質にするための改善」の一環で棚卸しをやり直したところ、
以下に記載していた**削除候補はbackend / frontend / fastapi-serviceすべて
既に削除済み**であることを確認した（`ls`・`grep`で実ファイルの有無を
1件ずつ確認）。このファイルは今後、過去の記録として残す。

## 判断の基準（当時の分類）

| 区分 | 意味 | 扱い |
| --- | --- | --- |
| 再利用 | 構成・パターンをコーヒードメインへ流用する | 命名と責務を見直して残す |
| 置換 | 同じ役割のコーヒー版を作って差し替える | Phase 1〜5 で置換 |
| 削除候補 | コーヒードメインに対応物が無い | Phase 6 で削除 |

## backend

### 再利用した（現存）

| ファイル | 役割 |
| --- | --- |
| `app.js` / `server.js` | アプリ組み立てと起動の分離（DB無しでsupertestできる構造） |
| `config/db.js` | MongoDB接続 |
| `models/User.js` | 認証ユーザー |
| `controllers/authController.js` | register / login / JWT発行 |
| `middleware/authenticate.js` | JWT検証 → `req.user`（旧`authMiddleware.js`から改名） |
| `services/fastApiService.js` | FastAPI呼び出しのパターン（timeout + フォールバック） |

### 削除済み（2026-08確認）

以下はすべて実在しないことを確認済み: `controllers/`配下のMLB系16種
（archetype/compare/externalPlayer/favorite/game/interaction/league/
matchup/news/player/position/recommendation/scout/similarPlayer/stats/team）
と対応する`routes/`16種、`models/Player.js` `FavoritePlayer.js`
`Interaction.js`、`services/mlb/`・`services/recommendations/`配下一式、
`mlbApiService.js` `recommendationService.js` `interactionService.js`
`cacheService.js`、`middleware/uploadMiddleware.js`、
`data/players.js`と各種CSV、`seedPlayers.js`（`seeds/run.js`・
`seeds/runDemo.js`へ置換済み）、`tests/playerFormatter.test.js`。
依存パッケージの`ioredis`・`multer`も`package.json`に存在しない。

`controllers/userController.js`・`routes/userRoutes.js`は、当時の想定通り
コーヒードメイン向けに置換済み（`favoriteTeam`等のMLB固有項目は無い）。

## frontend

### 再利用した（現存）

`utils/apiConfig.js` / `utils/authStorage.js` / `utils/datetime.js` /
`services/api/apiError.js` / `services/api/authApi.js` /
`components/ProtectedRoute.jsx` / `contexts/ToastContext.jsx` /
`components/ErrorCard.jsx` / `components/SkeletonCard.jsx` /
`components/SearchInput.jsx` /
`components/Navbar.jsx` + `components/BottomTabBar.jsx`

`components/PageHeader.jsx`は再利用予定だったが、実際には
どのページからも使われていない死んだコンポーネントとして残っている
（IMPLEMENTATION.mdの未解決事項参照。削除候補）。

### 削除済み（2026-08確認）

MLB系ページ約26件（`Archetype` `Compare` `Game` `League` `Matchup`
`News` `Player*` `Team` ほか）、`services/api/`のMLB系16件、
`PlayerCard`等のMLB系コンポーネント13件、`mlbTeams.js` `teamColors.js`
`archetypeColors.js`、`src/text.jsx`、`src/assets/hero.png`・
`home-ui*.png`は、いずれも実ファイルが存在しないことを確認済み。

`frontend/public/`直下に残っていた前身プロジェクト由来の未参照画像
`yozo.png` `logo-pop.JPG`も2026-08に削除した（コードから一切
参照されておらず、ポートフォリオとして公開する意味も無いため）。

`App.jsx`のルート定義は全面的にコーヒー版へ書き換え済み。ただし
`App.css`には、Home画面のチームカラーバナー・クイックアクション・
チームダッシュボード等、MLB時代のCSSがJSXから一切参照されないまま
約460行残っていた（2026-08に削除。lint/build成功・CSSバンドル
サイズの縮小で確認済み）。さらに同じクラス名の**別の**未参照ブロック
（`.home-player-section` `.home-team-section` `.home-favorites-section`
`.home-recommendations-section`等、Team/Favorites/Recommendations
セクション向けの古い定義）が別の行にも見つかっており、こちらは
規模が大きいため今回は未対応（IMPLEMENTATION.mdの未解決事項に記載）。

## fastapi-service

### 削除済み（2026-08確認）

`routers/archetype.py` `compare.py` `discover.py` `matchup.py`
`preference.py` `recommend.py` `similar.py` `scouting.py`、
`core/math_utils.py`、`tests/test_math_utils.py`はいずれも存在しない
（`routers/`・`core/`は`__init__.py`のみ）。`docs/architecture.md`の
方針通り、MVPではFastAPIに新規責務を持たせていない
（現状はヘルスチェックのみ）。

## インフラ

| 対象 | 現状 |
| --- | --- |
| `docker-compose.yml`の`redis`サービス | 削除済み（記載なし） |
| `.github/workflows/test.yml` | 再利用し、3サービス分のジョブ構成のまま維持 |
| `README.md` | プロダクト中心に全面刷新済み |

## 外部API依存

mlb-app が依存していた MLB Stats API・Baseball Savant のCSVへの
依存は無くなっている（`services/mlb/`配下ごと削除済み）。
