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

2026-08、「本番品質」改善のTier 6（実デプロイの動作確認）中に、上記の
表に誤って`services/fastApiService.js`を「再利用した（現存）」として
記載していたことが判明した。実際には`services/`配下は`coffee/`のみで
このファイルは存在せず、`process.env.FASTAPI_URL`を読むコードも
backend全体に無い。FastAPIサービス自体はデプロイ・起動しているが、
frontend・backendのどちらからも呼び出されておらず、ヘルスチェックの
みが動いている状態（`docs/architecture.md`の方針通りの意図的な状態で
あり、バグではない）。

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
`services/api/authApi.js` /
`components/ProtectedRoute.jsx` / `contexts/ToastContext.jsx` /
`components/ErrorCard.jsx` /
`components/Navbar.jsx` + `components/BottomTabBar.jsx`

2026-08、設計レビューで`components/SearchInput.jsx`も「再利用した（現存）」
と誤って記載されたままだったことが判明した。実際には横断検索機能
（`docs/features.md`「Search」）の実装時に`features/search/components/
SearchBox.jsx`へ置き換わっており、`SearchInput.jsx`はどこからも
importされていない死んだコンポーネントだった（`placeholder="Search
player name"`というMLB時代の文言も残ったまま）。`PageHeader.jsx`と
同じ扱いとして削除した。

同じ設計レビューで、`services/api/apiError.js`（`getApiErrorMessage`/
`isUnauthorizedError`）も、認証まわりのcontroller層の見直しに伴い
`services/api/userApi.js`が共通クライアント（`features/coffee-records/
api/httpClient.js`）経由へ移行したことでどこからも参照されなくなり、
削除した。

`components/SkeletonCard.jsx`も再利用予定だったが、`PageHeader.jsx`と同様
どのページからも使われていない死んだコンポーネントとして残っていたため、
2026-08のスケルトン表示改善時に削除した。

`components/PageHeader.jsx`も再利用予定だったが、実際にはどのページからも
使われていない死んだコンポーネントだったため、2026-08（案D「面接向け
仕上げ」）に削除した。専用の`App.css`ブロック（`.page-header*` `.app-screen`
`.screen-body` `.thr-wl` `.thr-sub` `.page-tab*`等、約145行）もこの
コンポーネント以外から参照されていなかったためあわせて削除した。

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
セクション向けの古い定義）が別の行にも見つかっていたが、2026-08時点では
まだ未対応だった。

2026-08（案D「面接向け仕上げ」）に、`App.css`（当時8,930行）の全クラス
セレクタとJSX側の実際の使用箇所を機械的に突き合わせたところ、847個の
トップレベルセレクタのうち801個が未使用の可能性があるという、想定を
大きく超える規模の残存が判明した。ただし機械的な文字列照合には限界があり
（例:`` `toast toast--${type}` ``のようなテンプレートリテラルで動的に
組み立てるクラス名は、実際には使われていても未使用と誤検出される）、
801件を確認無しに一括削除するのは安全ではないと判断し、今回は見送った。
`PageHeader.jsx`削除に伴う`.page-header*`等（上記「再利用した」節参照、
参照元が完全に1コンポーネントへ限定でき安全に判定できたもの）だけを
削除するに留めている。

2026-08、設計レビューで、このファイルに名指しで記載されていた
`.home-player-section` `.home-team-section` `.home-favorites-section`
`.home-recommendations-section`（旧MLB時代のTeam/Favorites/Recommendations
セクション向け定義、および関連する`.player-list-carousel` `.similar-players`
の2ブロック、計約110行）について、JSX側の参照がゼロであることを再確認
した上で削除した。これらは元々このファイルに「未対応」として名指しで
記載されていた、確認済みの削除候補だったため対応した。

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
