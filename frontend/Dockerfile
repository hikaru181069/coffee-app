# 2026-09、AWS本番リリースに向けたDocker仕上げの一環で、1つのファイルに
# 「開発用」「本番用」2つの作り方をまとめたmulti-stage構成へ変更した。
# backend/Dockerfileと同じ考え方（詳細はそちらのコメント参照）。
FROM node:20-alpine AS base
WORKDIR /app

# 依存関係だけ先にインストール（backendと同じ理由でキャッシュを効かせる）
COPY package*.json ./

# ── 開発用（従来通り） ──────────────────────────
# Viteの開発サーバーをそのまま起動する。docker-compose.ymlがこのステージを使う。
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev"]

# ── ビルド専用ステージ ──────────────────────────
# 本番では「開発サーバーを起動する」のではなく、「完成品のHTML/JS/CSS一式
# （dist/）を作って、それをWebサーバーで配信する」という全く別の動き方に
# なる。VITE_API_URLはViteのビルド時にブラウザ側JSへ焼き込まれる値
# （実行中のコンテナ内では変更できない）。docker-compose.prod.ymlの
# build.argsで渡す。
FROM base AS build
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# ── 本番用 ────────────────────────────────
# nginx（定番の静的ファイル配信ソフト）の公式イメージをベースに、
# 上のbuildステージで作ったdist/だけをコピーする。Node.js自体は
# 本番用イメージに一切含まれない（ビルドは済んでいるので不要）。
FROM nginx:alpine AS prod
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# nginx.confに用意した/healthを30秒ごとに叩いて確認する。
# "localhost"ではなく127.0.0.1を明示する: Alpineのwgetは"localhost"を
# 先にIPv6(::1)で引こうとするが、nginxはIPv4(0.0.0.0)にしか listen して
# いないため「Connection refused」になる（実機検証で発覚した実際の不具合）。
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/health || exit 1

CMD ["nginx", "-g", "daemon off;"]
