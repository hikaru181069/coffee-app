// 実際にDBへ接続し、ポートを開いてリクエストを待ち受ける「起動」担当。
// アプリの中身(ミドルウェア・ルート)は app.js が持っている。

import connectDB from "./config/db.js";
import app from "./app.js";

// .envにポートがあればそれを使う。無ければ5001
const PORT = process.env.PORT || 5001;

connectDB();

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
