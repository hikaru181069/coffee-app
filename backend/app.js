// Expressアプリの組み立て(ミドルウェア・ルート登録)だけを担当する。
// DB接続(connectDB)やポート待受(app.listen)はここではやらない。
// → テストコードから「実際にポートを開かず・DBに繋がずに」このappを
//    supertestで直接叩けるようにするため。

// dotenv は必ず他のimportより先に置く。
// ESMはimportを巻き上げて先に評価するため、CommonJSのときのように
// 「dotenv.config()を書いた行より下のrequire」という順序制御ができない。
// services/fastApiService.js などがトップレベルで process.env を読むので、
// 副作用インポート("dotenv/config")で最初に.envを読み込ませる。
import "dotenv/config";

import express from "express";
import cors from "cors";
import path from "path";

import playerRoutes from "./routes/playerRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import externalPlayerRoutes from "./routes/externalPlayerRoutes.js";
import favoriteRoutes from "./routes/favoriteRoutes.js";
import recommendationRoutes from "./routes/recommendationRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import similarPlayerRoutes from "./routes/similarPlayerRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";
import matchupRoutes from "./routes/matchupRoutes.js";
import leagueRoutes from "./routes/leagueRoutes.js";
import teamRoutes from "./routes/teamRoutes.js";
import gameRoutes from "./routes/gameRoutes.js";
import newsRoutes from "./routes/newsRoutes.js";
import scoutRoutes from "./routes/scoutRoutes.js";
import archetypeRoutes from "./routes/archetypeRoutes.js";
import compareRoutes from "./routes/compareRoutes.js";
import positionRoutes from "./routes/positionRoutes.js";
import interactionRoutes from "./routes/interactionRoutes.js";

const app = express();

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
app.use("/uploads", express.static(path.join(import.meta.dirname, "uploads")));

app.use("/api/players", playerRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/external/players", externalPlayerRoutes);
app.use("/api/favorites", favoriteRoutes);
app.use("/api/recommendations", recommendationRoutes);
app.use("/api/users", userRoutes);
app.use("/api/similar-players", similarPlayerRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/matchup", matchupRoutes);
app.use("/api/league", leagueRoutes);
app.use("/api/teams", teamRoutes);
app.use("/api/games", gameRoutes);
app.use("/api/news", newsRoutes);
app.use("/api/scout", scoutRoutes);
app.use("/api/archetype", archetypeRoutes);
app.use("/api/compare", compareRoutes);
app.use("/api/positions", positionRoutes);
app.use("/api/interactions", interactionRoutes);

app.get("/", (req, res) => {
  res.send("Backend server is running");
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route not found",
  });
});

export default app;