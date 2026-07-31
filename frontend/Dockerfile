FROM node:20-alpine

WORKDIR /app

# 依存関係だけ先にインストール（backendと同じ理由でキャッシュを効かせる）
COPY package*.json ./
RUN npm install

COPY . .

# Viteの開発サーバーのデフォルトポート
EXPOSE 5173

CMD ["npm", "run", "dev"]
