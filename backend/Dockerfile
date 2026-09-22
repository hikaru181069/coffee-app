# Node.js 20 の軽量版(alpine = 最小構成のLinux)をベースにする
#
# 2026-09、AWS本番リリースに向けたDocker仕上げの一環で、1つのファイルに
# 「開発用」「本番用」2つの作り方をまとめたmulti-stage構成へ変更した。
# `docker build --target dev` / `--target prod`のように、後ろで組み立てる
# `docker-compose.yml`(開発用)・`docker-compose.prod.yml`(本番用)がそれぞれ
# どちらのステージを使うか指定する（compose側は`build.target`で指定する
# ため、このファイル単体をdocker buildで叩くときだけ--targetの指定が必要）。
FROM node:20-alpine AS base
WORKDIR /app

# package.json / package-lock.json だけ先にコピーしてインストールする。
# ソースコード全部を先にコピーしてしまうと、コードを1行変えるだけで
# 「npm installからやり直し」になってしまう（Dockerのキャッシュが効かない）。
# 依存関係が変わっていなければ、ここで一度作られたレイヤーが再利用される。
COPY package*.json ./

# ── 開発用（従来通り） ──────────────────────────
# devDependencies（nodemon等）も含めて全部インストールし、コードを
# 保存するたびに自動再起動する。docker-compose.ymlがこのステージを使う。
FROM base AS dev
RUN npm install
COPY . .
EXPOSE 5001
CMD ["npm", "run", "dev"]

# ── 本番用の依存関係だけを集めるステージ ──────────
# --omit=devでdevDependencies（テストツール等、本番では不要なもの）を除く。
# 起動コマンド（npm start → tsx server.js）が使う`tsx`は、この除外で
# 消えてしまわないよう`package.json`の`dependencies`側へ移した（2026-09の
# 修正。本番向けインストールで起動できなくなっていた不具合）。
FROM base AS prod-deps
RUN npm ci --omit=dev

# ── 本番用 ────────────────────────────────
# 上のprod-depsで作ったnode_modulesとソースコードだけを、新しいまっさらな
# レイヤーへコピーする（devの試行錯誤や中間ファイルを引きずらない、
# 最終イメージを最小限に保つmulti-stageの狙い）。
FROM node:20-alpine AS prod
WORKDIR /app
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package*.json ./
COPY . .

# node:alpine公式イメージには非rootユーザー`node`が最初から用意されている。
# 本番ではroot権限で起動しない、というセキュリティの基本を守る。
USER node

EXPOSE 5001

# 30秒ごとに「/」を叩いて200が返るか確認する（app.jsのヘルスチェック
# ルート参照）。失敗が続くとDocker/オーケストレーターがコンテナの異常を
# 検知できる。alpineには標準でwgetが入っているため追加インストール不要。
# "localhost"ではなく127.0.0.1を明示する: Alpineのwgetは"localhost"を
# 先にIPv6(::1)で引こうとして失敗することがある（frontend/Dockerfileの
# 同種コメント・実機検証で発覚した不具合を参照。こちらはExpressの
# 既定バインド先の都合で今のところ症状が出ていないが、環境依存で
# 再発しうるため同じく明示的にしておく）。
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:5001/ || exit 1

CMD ["npm", "start"]
