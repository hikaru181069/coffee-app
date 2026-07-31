# Deployment Guide

coffee-appを本番環境（MongoDB Atlas + Render + Vercel）へデプロイする手順のまとめ。
ローカル作業用のメモであり、`docs/`配下の仕様ドキュメントとは別に、実際にデプロイした
ときの構成・設定値・手順を記録する。

## 全体構成

```text
Vercel（Frontend / React・Vite）
    |
    | HTTPS
    v
Render（Backend / Express）───Render（FastAPI）
    |
    v
MongoDB Atlas
```

- **Vercel**: frontendの静的ビルド成果物をホスティング。GitHubリポジトリと連携し、`main`へのpushで自動デプロイ
- **Render**: backend（Express）とfastapi-serviceをそれぞれ個別のWeb Serviceとしてデプロイ。同じくGitHub連携で自動デプロイ
- **MongoDB Atlas**: 本番用MongoDBクラスタ。ローカルのDocker MongoDBとは別インスタンス

このリポジトリは1つのGitHubリポジトリに frontend/backend/fastapi-service が同居する
モノレポ構成のため、各サービスのデプロイ設定で「Root Directory」をそれぞれ指定する。

---

## 前提条件

- GitHubへ`main`がpush済みであること
- MongoDB Atlas / Render / Vercel のアカウント（mlb-appで既に使っている場合はそれを流用可能）
- 各サービスでGitHubリポジトリへのアクセスを許可（OAuth連携）していること

---

## 1. MongoDB Atlas

1. Atlasでプロジェクトを作成（または既存プロジェクトを流用）
2. 無料枠（M0）クラスタを作成
3. Database Access: アプリ専用のDB用ユーザーを作成（ユーザー名・パスワードを控える。パスワードは推測されにくいランダム文字列にする）
4. Network Access: RenderのIPは固定ではないため、初期は `0.0.0.0/0`（全許可）を許容するか、Renderの静的IP機能（有料プラン）を使う場合はそのIPのみ許可する
5. "Connect" → "Drivers" から接続文字列を取得する

```
mongodb+srv://<username>:<password>@<cluster>.mongodb.net/coffeeApp?retryWrites=true&w=majority
```

DB名は`coffeeApp`（ローカルの`MONGO_URI`と揃える）。この接続文字列がRenderの`MONGO_URI`になる。

**注意**: 接続文字列（パスワード入り）はコミットしない。Renderの環境変数にのみ設定する。

---

## 2. Render: fastapi-service

先にfastapiをデプロイし、そのURLを控えてからbackendを設定する（backendが`FASTAPI_URL`として参照するため）。

- **Type**: Web Service
- **Root Directory**: `fastapi-service`
- **Environment**: Python
- **Build Command**: `pip install -r requirements.txt`
- **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
  （ローカルDockerの`--reload`は開発専用なので本番では外す。ポートはRenderが`$PORT`環境変数で渡してくる）
- **Instance Type**: Free（コールドスタートあり）で開始し、必要に応じて有料プランへ

デプロイ後に発行されるURL（例: `https://coffee-app-fastapi.onrender.com`）を控える。

---

## 3. Render: backend

- **Type**: Web Service
- **Root Directory**: `backend`
- **Environment**: Node
- **Build Command**: `npm install`
- **Start Command**: `npm start`（`node server.js`。`npm run dev`のnodemonは開発専用なので使わない）

環境変数（Render の Environment タブで設定）:

| Key | 値 |
| --- | --- |
| `PORT` | Renderが自動注入するため設定不要（`$PORT`をコードが読む前提。`server.js`が`process.env.PORT`を使っていることを確認） |
| `MONGO_URI` | Atlasの接続文字列 |
| `JWT_SECRET` | 本番用の十分に長いランダム文字列（`openssl rand -hex 32`などで生成。ローカルの`local-dev-secret-change-me`は絶対に使わない） |
| `FRONTEND_URL` | Vercelのデプロイ後URL（例: `https://coffee-app.vercel.app`）。CORS許可用 |
| `FASTAPI_URL` | 手順2で控えたfastapiのURL |

デプロイ後に発行されるURL（例: `https://coffee-app-backend.onrender.com`）を控える。

### 初回データ投入

Renderの "Shell" タブ（またはローカルから本番`MONGO_URI`を指定して一時的に実行）で:

```bash
npm run seed        # マスターデータ（産地・品種・精製方法・焙煎度・フレーバー）
npm run seed:demo   # デモユーザー・デモ記録（任意。ポートフォリオ公開時のみ）
```

どちらもべき等なので、誤って複数回実行しても重複しない。

---

## 4. Vercel: frontend

1. Vercelで「Add New Project」→ このGitHubリポジトリを選択
2. **Root Directory**: `frontend`
3. Framework Preset: Vite（自動検出される）
4. Build Command: `npm run build`（デフォルトのままでよい）
5. Output Directory: `dist`（デフォルトのままでよい）
6. `frontend/vercel.json`のSPA rewriteはリポジトリに含まれているため追加設定不要

環境変数（Vercelの Settings → Environment Variables）:

| Key | 値 |
| --- | --- |
| `VITE_API_URL` | 手順3で控えたbackendのURL（例: `https://coffee-app-backend.onrender.com`） |

`VITE_API_URL`はビルド時にJSへ埋め込まれる値のため、**環境変数を変更したら再デプロイが必要**（Vercelの"Redeploy"）。

---

## 5. 相互接続の確認・更新

3サービスは互いのURLを環境変数として持ち合っているため、デプロイの順番と後追い更新が必要になる。

1. fastapiをデプロイ → URLを控える
2. backendをデプロイ（`FASTAPI_URL`にfastapiのURLを設定）→ URLを控える
3. frontendをデプロイ（`VITE_API_URL`にbackendのURLを設定）
4. frontendのURLが確定したら、backendの`FRONTEND_URL`を実際のVercel URLへ更新し、再デプロイ（CORSが正しく通るようにするため）

---

## 6. デプロイ後の動作確認チェックリスト

- [ ] `https://<frontend>/` が表示される（Vercel）
- [ ] 新規登録・ログインができる（backend + Atlas接続の確認）
- [ ] 記録の作成・一覧・編集・削除ができる
- [ ] Graph画面でノードが表示される
- [ ] ブラウザのDevToolsでCORSエラーが出ていない（`FRONTEND_URL`の設定確認）
- [ ] `https://<fastapi>/` がヘルスチェック応答を返す
- [ ] Renderのログにエラーが出ていない

---

## トラブルシューティング

| 症状 | 原因の候補 |
| --- | --- |
| ログイン後すぐ401になる | `JWT_SECRET`がbackend再起動のたびに変わっていないか（Renderの環境変数に固定値を設定しているか） |
| フロントからのAPI呼び出しがCORSエラー | backendの`FRONTEND_URL`がVercelの実URLと一致していない |
| Graph/記録一覧が空 | `npm run seed`が本番DBに対して未実行、またはAtlasの接続先DB名が`coffeeApp`と一致していない |
| fastapiが応答しない | Renderの無料プランはアイドル後にスリープするため、初回アクセスで数十秒かかることがある（コールドスタート） |
| MongoDBに接続できない | Atlasの Network Access で許可されていないIPからアクセスしている |

---

## 費用について

無料枠（Vercel Hobby / Render Free / Atlas M0）で最小構成は組めるが、以下の制約がある。

- Render Freeはアイドル時にスリープし、次回アクセス時にコールドスタートが発生する
- Atlas M0は512MBまでの制約があり、ポートフォリオ用途としては十分
- 本番トラフィックが増える場合は有料プランへの切り替えを検討する

いずれのサービスも作成・アップグレード時にクレジットカード登録や課金判断が発生しうるため、
実際にプランを選ぶ際は都度確認すること。
