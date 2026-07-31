# Node.js 20 の軽量版(alpine = 最小構成のLinux)をベースにする
FROM node:20-alpine

# コンテナ内の作業ディレクトリ。以降のCOPY/RUNはこのディレクトリ基準になる
WORKDIR /app

# package.json / package-lock.json だけ先にコピーしてインストールする。
# ソースコード全部を先にコピーしてしまうと、コードを1行変えるだけで
# 「npm installからやり直し」になってしまう（Dockerのキャッシュが効かない）。
# 依存関係が変わっていなければ、ここで一度作られたレイヤーが再利用される。
COPY package*.json ./
RUN npm install

# 残りのソースコードをコピー
# (実際の開発中は docker-compose.yml の volumes でこの中身を上書きしてホットリロードする)
COPY . .

# このコンテナが5001番ポートを使うことを明示するドキュメント的な記述
# (実際にホストPCに公開するかどうかは docker-compose.yml 側で決める)
EXPOSE 5001

# コンテナ起動時に実行するコマンド
CMD ["npm", "run", "dev"]
