// Expressアプリの組み立て(ミドルウェア・ルート登録)だけを担当する。
// DB接続(connectDB)やポート待受(app.listen)はここではやらない。
// → テストコードから「実際にポートを開かず・DBに繋がずに」このappを
//    supertestで直接叩けるようにするため。

// dotenv は必ず他のimportより先に置く。
// ESMはimportを巻き上げて先に評価するため、CommonJSのときのように
// 「dotenv.config()を書いた行より下のrequire」という順序制御ができない。
import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";

import coffeeRecordRoutes from "./routes/coffeeRecordRoutes.js";
import masterDataRoutes from "./routes/masterDataRoutes.js";
import graphRoutes from "./routes/graphRoutes.js";
import insightRoutes from "./routes/insightRoutes.js";
import discoverRoutes from "./routes/discoverRoutes.js";
import similarRecordsRoutes from "./routes/similarRecordsRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import diagnosisRoutes from "./routes/diagnosisRoutes.js";
import discoveryPreviewRoutes from "./routes/discoveryPreviewRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

const app = express();

// X-Content-Type-Options・X-Frame-Options等、基本的なセキュリティヘッダーを
// 妥当な既定値でまとめて付与する（Express公式が推奨する定番ミドルウェア）
app.use(helmet());

// corsで許可するフロントエンドurlを決める。
// .filter(Boolean)は、からの値を取り除く。
const allowedOrigins = [
  "http://localhost:5173",
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: allowedOrigins,
  }),
);

app.use(express.json());

app.use("/api/coffee-records", coffeeRecordRoutes);
app.use("/api/master-data", masterDataRoutes);
app.use("/api/graph", graphRoutes);
app.use("/api/insights", insightRoutes);
app.use("/api/discover", discoverRoutes);
app.use("/api/similar-records", similarRecordsRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/diagnosis", diagnosisRoutes);
app.use("/api/discoveries", discoveryPreviewRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);

// ヘルスチェック用（Dockerのコンテナ生存確認・将来のALB/ECS等からの疎通確認を想定）。
// DBに依存せず即座に200を返すだけにする。fastapi-service/main.jsのGET /と
// 同じ「DBに依存しない生存確認」という設計・レスポンス形に揃えている。
app.get("/", (req, res) => {
  res.json({ status: "ok", service: "Coffee App Backend" });
});

app.use(notFoundHandler);

// エラーミドルウェアは全ルートの後ろに置く。
// ここより前に登録されたハンドラで投げられたエラーだけが届く。
// Express 5 は async ハンドラの reject も自動でここへ渡すので、
// controller 側に try/catch は不要。
app.use(errorHandler);

export default app;
