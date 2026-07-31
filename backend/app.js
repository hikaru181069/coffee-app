// Expressアプリの組み立て(ミドルウェア・ルート登録)だけを担当する。
// DB接続(connectDB)やポート待受(app.listen)はここではやらない。
// → テストコードから「実際にポートを開かず・DBに繋がずに」このappを
//    supertestで直接叩けるようにするため。

const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const playerRoutes = require("./routes/playerRoutes");
const authRoutes = require("./routes/authRoutes");
const externalPlayerRoutes = require("./routes/externalPlayerRoutes");
const favoriteRoutes = require("./routes/favoriteRoutes");
const recommendationRoutes = require("./routes/recommendationRoutes");
const userRoutes = require("./routes/userRoutes");
const similarPlayerRoutes = require("./routes/similarPlayerRoutes");
const statsRoutes = require("./routes/statsRoutes");
const matchupRoutes = require("./routes/matchupRoutes");
const leagueRoutes = require("./routes/leagueRoutes");
const teamRoutes = require("./routes/teamRoutes");
const gameRoutes = require("./routes/gameRoutes");
const newsRoutes = require("./routes/newsRoutes");
const scoutRoutes = require("./routes/scoutRoutes");
const archetypeRoutes = require("./routes/archetypeRoutes");
const compareRoutes = require("./routes/compareRoutes");
const positionRoutes = require("./routes/positionRoutes");
const interactionRoutes = require("./routes/interactionRoutes");

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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

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

module.exports = app;
