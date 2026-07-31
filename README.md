# Coffee App

コーヒー体験を記録し、知識グラフとして育て、自分の味覚やコーヒーの知識を自然に発見できるアプリ。

中心体験は **Record → Connect → Discover**（記録する → つながる → 発見する）です。

- 飲んだコーヒーを記録する
- 産地・農園・品種・精製方法・焙煎度・フレーバーが自動でつながる
- 自分の記録から好みや未知の関係を発見する

詳細は [`docs/vision.md`](docs/vision.md) と [`docs/mvp.md`](docs/mvp.md) を参照してください。

---

## 現在の状態

**Phase 0（Repository Bootstrap）完了時点です。コーヒー機能はまだ実装されていません。**

このリポジトリは既存の [mlb-app](https://github.com/hikaru181069/mlb-app) のアーキテクチャ
（認証・JWT・MongoDB接続・レイヤ分割・FastAPI連携・Docker Compose）を土台として再利用しています。
現時点でアプリを起動すると、まだ MLB 向けの画面とAPIが動作します。

| Phase | 内容 | 状態 |
| --- | --- | --- |
| 0 | Repository Bootstrap | 完了 |
| 1 | Domain Foundation（CoffeeRecord・マスターデータ） | 未着手 |
| 2 | Coffee Record API | 未着手 |
| 3 | Record UI | 未着手 |
| 4 | Knowledge Graph API | 未着手 |
| 5 | Knowledge Graph UI | 未着手 |
| 6 | Portfolio Quality | 未着手 |

進め方は [`docs/implementation-plan.md`](docs/implementation-plan.md)、
各Phaseの作業指示は [`prompts/`](prompts/) にあります。

コーヒードメインでは使わない mlb-app 由来のコードは、削除せず
[`docs/mlb-legacy-inventory.md`](docs/mlb-legacy-inventory.md) に一覧化してあります（Phase 6 で棚卸し）。

---

## 技術スタック

| レイヤー | 技術 |
| --- | --- |
| Frontend | React 19 / Vite / React Router / Tailwind CSS |
| Backend | Node.js / Express 5（ES Modules） |
| Database | MongoDB / Mongoose |
| 計算サービス | Python / FastAPI |
| 認証 | JWT / bcryptjs |
| テスト・CI | Jest + Supertest / pytest / GitHub Actions |
| 開発環境 | Docker Compose |

frontend・backend とも ES Modules を使用します。詳細と注意点は
[`docs/architecture.md`](docs/architecture.md#module-format) を参照してください。

---

## アーキテクチャ

```text
React / Vite
    |
    | HTTPS / JSON
    v
Express API        ← 外部公開APIの唯一の入口。認証・CRUD・入力検証
    |
    +---- MongoDB
    |
    +---- FastAPI   ← DBに依存しない計算のみ
```

frontend は FastAPI へ直接アクセスせず、MongoDB へも直接接続しません。
FastAPI は MongoDB へ接続せず、認証も行いません。
責務の詳細は [`docs/architecture.md`](docs/architecture.md) にあります。

---

## ディレクトリ構成

```text
coffee-app/
├── CLAUDE.md                 開発方針（AIエージェント向けの指示を含む）
├── docs/                     仕様・設計ドキュメント（仕様の正）
├── prompts/                  Phase単位の実装指示
├── frontend/                 React + Vite
├── backend/                  Express + Mongoose
│   ├── config/               DB接続
│   ├── routes/               URLとmiddlewareの接続
│   ├── controllers/          request/responseの変換
│   ├── services/             ユースケース・業務処理
│   ├── models/               Mongooseスキーマ
│   ├── middleware/           認証・エラー処理
│   └── tests/
├── fastapi-service/          FastAPI（計算のみ）
└── docker-compose.yml
```

---

## ローカル起動

### Docker で一括起動（推奨）

**必要なもの:** Docker Desktop

```bash
git clone git@github.com:hikaru181069/coffee-app.git
cd coffee-app
docker compose up -d --build
```

MongoDB / Redis / FastAPI / Backend / Frontend の5サービスが起動します。
環境変数は `docker-compose.yml` にローカル開発専用の値が定義済みなので、`.env` の用意は不要です。

- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- FastAPI: http://localhost:8000

ソースコードを編集するとホットリロード（nodemon / Vite / uvicorn --reload）で反映されます。
停止は `docker compose down`（`-v` を付けるとDBのデータも削除）。

### Docker を使わない場合

**必要なもの:** Node.js 20.11+ / Python 3.13+ / Docker（MongoDB用）

```bash
# 依存関係
cd backend && npm install
cd ../frontend && npm install

# Python 仮想環境
python3 -m venv .venv
.venv/bin/pip install -r fastapi-service/requirements.txt

# 環境変数
cp backend/.env.example backend/.env   # 値を埋める
```

起動（4つのターミナル）:

```bash
docker compose up -d mongodb                                    # MongoDB
cd fastapi-service && ../.venv/bin/uvicorn main:app --reload --port 8000
cd backend && npm run dev
cd frontend && npm run dev
```

> Node.js は `import.meta.dirname` を使うため 20.11 以上が必要です。

### マスターデータの投入

産地・品種・精製方法・焙煎度・フレーバーの初期候補をDBへ入れます。

```bash
cd backend && npm run seed
```

既存データは上書きも削除もしないため、**何度実行しても安全**です
（正規化した名前で重複を判定し、無いものだけ追加します）。

---

## 環境変数

`backend/.env`（ひな形は [`backend/.env.example`](backend/.env.example)）:

| 変数 | 説明 |
| --- | --- |
| `PORT` | Express が待ち受けるポート（既定 5001） |
| `MONGO_URI` | MongoDB 接続文字列 |
| `JWT_SECRET` | JWT の署名鍵。**コミットしないこと** |
| `FRONTEND_URL` | CORS で許可するフロントエンドのURL |
| `FASTAPI_URL` | FastAPI サービスのURL |
| `REDIS_URL` | 外部APIキャッシュ用。未起動でもアプリは動作する |

frontend は `VITE_API_URL` で Express の URL を指定します（未指定時は `http://localhost:5001`）。

---

## テスト

```bash
cd backend && npm test          # Jest + Supertest
cd frontend && npm run lint     # ESLint
cd frontend && npm run build    # ビルド確認
cd fastapi-service && ../.venv/bin/pytest    # pytest
```

`main` への push と pull request で GitHub Actions が同じ内容を実行します
（[`.github/workflows/test.yml`](.github/workflows/test.yml)）。

---

## ドキュメント

| ファイル | 内容 |
| --- | --- |
| [`docs/vision.md`](docs/vision.md) | プロダクトの目的・対象ユーザー |
| [`docs/product-principles.md`](docs/product-principles.md) | 設計判断の原則 |
| [`docs/mvp.md`](docs/mvp.md) | MVPのスコープと完了条件 |
| [`docs/design.md`](docs/design.md) | 画面構成・UIルール |
| [`docs/domain-model.md`](docs/domain-model.md) | CoffeeRecord とマスターデータ |
| [`docs/database.md`](docs/database.md) | MongoDB スキーマ設計 |
| [`docs/knowledge-graph.md`](docs/knowledge-graph.md) | 知識グラフの生成方針 |
| [`docs/architecture.md`](docs/architecture.md) | サービス責務・モジュール形式・エラー形式 |
| [`docs/api.md`](docs/api.md) | APIエンドポイント設計 |
| [`docs/implementation-plan.md`](docs/implementation-plan.md) | Phase 0〜6 の進め方 |
| [`docs/mlb-legacy-inventory.md`](docs/mlb-legacy-inventory.md) | 未削除の mlb-app 由来コード一覧 |
