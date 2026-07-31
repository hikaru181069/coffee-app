# MLB Player Discovery App

MLB選手の発見・管理アプリ。お気に入り選手を登録すると、機械学習を使って類似選手やマイナーリーグのプロスペクトを自動推薦します。

**デモ:** https://mlb-app-eight.vercel.app

---

## 目次

1. [プロジェクト概要](#プロジェクト概要)
2. [技術スタック](#技術スタック)
3. [アーキテクチャ](#アーキテクチャ)
4. [主な機能](#主な機能)
5. [設計で工夫した点](#設計で工夫した点)
6. [ローカル起動方法](#ローカル起動方法)
7. [今後の課題](#今後の課題)

---

## プロジェクト概要

「好きな選手を登録するだけで、次のお気に入りが見つかる」をコンセプトにしたWebアプリです。

MLB Stats API からリアルタイムの成績データを取得し、FastAPI のコサイン類似度エンジンでプレースタイルが近い選手を推薦します。単なるCRUDアプリにとどまらず、**推薦システム・外部API連携・マイクロサービス構成**を組み合わせた点が特徴です。

学習目的で作成したポートフォリオです。登録はアプリから直接できます（APIキー不要）。

---

## 技術スタック

| レイヤー     | 技術                                                          |
| ------------ | ------------------------------------------------------------- |
| Frontend     | React 19 / Vite / React Router                                |
| Backend      | Node.js / Express                                             |
| Database     | MongoDB / Mongoose                                            |
| 推薦エンジン | Python / FastAPI / NumPy                                      |
| 外部API      | MLB Stats API（キー不要）                                     |
| 守備指標     | Baseball Savant OAA（CSVで取り込み）                          |
| 認証         | JWT / bcryptjs                                                |
| デプロイ     | Vercel（Frontend）/ Render（Backend・FastAPI）/ MongoDB Atlas |
| テスト・CI   | pytest（推薦エンジン）/ Jest・Supertest（backend）/ GitHub Actions |
| 開発環境     | Docker Compose（`docker compose up`で全サービス一発起動）      |

---

## アーキテクチャ

```
[ブラウザ / React]
       │  REST API
       ▼
[Node.js / Express]  ───  MongoDB Atlas
       │  内部HTTP         （ユーザー・お気に入りのみ）
       ▼
[Python / FastAPI]
  ├─ /discover/similar    コサイン類似度で類似選手を返す
  ├─ /scouting-report     パーセンタイル計算・レーダーチャート用
  ├─ /matchup/predict     投手 vs 打者の対戦予測
  └─ /archetype/classify  選手タイプの分類
       │
       ▼
[MLB Stats API]            選手成績・試合データ（外部）
```

**3サービスに分けた理由:**
Node.js はユーザー管理・認証・API集約を担います。機械学習の計算（コサイン類似度・パーセンタイル正規化）は Python の方が扱いやすいため、FastAPI に切り出しています。フロントエンドは Vercel でCDN配信し、サーバー系は Render で常時稼働させています。

---

## 主な機能

### For You — パーソナライズ推薦

お気に入り登録した選手をシードに、FastAPI がコサイン類似度でプレースタイルの近い選手を推薦します。シード選手ごとにグループ表示し、「なぜ推薦されたか」を成績比較つきで確認できます。

### Prospects — マイナーリーグ注目選手

AAA・AA の成績上位選手を取得し、お気に入り選手との類似度順に表示します。「次の大物」を早期に発見する機能です。

### Discovery Quiz

3つの質問に答えてプレースタイルを診断し、タイプに合った選手を推薦します。未登録ユーザーへの導線として機能します。

### Scouting Report

任意のMLB選手を検索して詳細レポートを生成します。各成績のパーセンタイルバー・SVGレーダーチャート・類似選手・選手タイプ分類を表示します。

### その他

- **Compare** — 2選手の成績を横並びで比較
- **Matchup** — 投手 vs 打者の対戦シミュレーション
- **League** — 試合スコア・順位表・ニュース・チーム情報
- **Stats** — リーグ打撃・投手成績リーダー

---

## 設計で工夫した点

### 推薦エンジンのパーセンタイル正規化

単純な成績の数値比較ではなく、リーグ全体での相対的な位置（パーセンタイル）に変換してからコサイン類似度を計算しています。これにより「時代・球場・打順の違いに左右されない、プレースタイルの類似度」を測れます。

```python
# ERA が低いほど良い → higher_is_better=False で逆順に
def calc_percentile(value, distribution, higher_is_better=True):
    if higher_is_better:
        return sum(v < value for v in distribution) / len(distribution) * 100
    else:
        return sum(v > value for v in distribution) / len(distribution) * 100
```

### 指標ごとの重み付け

OPS や HR など重要度の高い指標に大きな重みをかけたベクトルを使い、より実態に近い「似た選手」を計算しています。OAA（守備の数値化指標）も守備力の近い選手を見つけるために加えています。

```python
HITTER_WEIGHTS = [2.0, 1.5, 1.1, 1.0, 0.8, 1.3]
# 順: [OPS, HR, SB, AVG, RBI, OAA]
```

### 並列処理でのレスポンス改善

複数のお気に入り選手を元に推薦を生成する際、当初は逐次処理で最大2.5秒かかっていました。`Promise.all` による並列実行に変更し、体感速度を大幅に改善しました。

```js
// 全シード選手の FastAPI 呼び出しを同時実行
const groupResults = await Promise.all(
  favorites.map(async (fav) => { ... })
);
```

### SVGレーダーチャートの自作

チャートライブラリを使わず、純粋な SVG で実装しました。外部依存を減らし、アニメーションや色の制御を自由に行うためです。

```js
const angle = (2 * Math.PI * i) / n - Math.PI / 2;
const x = cx + radius * Math.cos(angle);
```

### ランディングページとアプリ画面の分離

未ログインユーザーは `/landing`（専用ランディングページ・ナビなし）に誘導し、ログイン後のみアプリ本体（サイドバー・タブバーあり）に入れる設計にしています。SaaS アプリで一般的な「マーケティングページとアプリの分離」を意識した構成です。

---

## ローカル起動方法

### Dockerで一発起動（推奨）

**必要なもの:** Docker Desktop

```bash
git clone git@github.com:hikaru181069/mlb-app.git
cd mlb-app
docker compose up -d --build
```

これだけで MongoDB / Redis / FastAPI / Backend / Frontend の5サービスがすべて起動します。
`.env`ファイルの用意は不要です（Docker用の環境変数は`docker-compose.yml`にローカル開発専用の値として定義済み）。

- Frontend: http://localhost:5173
- Backend: http://localhost:5001
- FastAPI: http://localhost:8000

手元のソースコードを編集すると、コンテナ内のホットリロード（nodemon / Vite / uvicorn --reload）でそのまま反映されます。
停止するときは `docker compose down`（`-v`を付けるとDBのデータも削除されます）。

MongoDBは空の状態から始まるため、ユーザー登録からのスタートになります。

### Dockerを使わない場合

**必要なもの:** Node.js 20+ / Python 3.13+ / Docker（MongoDB/Redis用）

```bash
# 1. リポジトリをクローン
git clone git@github.com:hikaru181069/mlb-app.git
cd mlb-app

# 2. 依存関係をインストール
cd backend && npm install
cd ../frontend && npm install

# 3. Python 仮想環境のセットアップ
python3 -m venv .venv
.venv/bin/pip install -r fastapi-service/requirements.txt
```

**環境変数 (`backend/.env`):**

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/mlbapp
JWT_SECRET=your_jwt_secret
FRONTEND_URL=http://localhost:5173
```

**起動（4つのターミナルで）:**

```bash
# MongoDB / Redis
docker compose up -d mongodb redis

# FastAPI（推薦エンジン）
cd fastapi-service
../.venv/bin/uvicorn main:app --reload --port 8000

# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
# → http://localhost:5173
```

---

## 今後の課題

- **TypeScript への移行** — 型安全性の向上・補完の強化
- **CSS の分割** — 現在は1ファイルに集約されているため、CSS Modules への移行を検討
