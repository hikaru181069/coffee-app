// dotenv は他のimportより先に評価させる（docs/architecture.md の Module Format）
import "dotenv/config";

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { seedDemoData } from "./seedDemoData.js";

/**
 * デモデータのCLIエントリ。`npm run seed:demo` で実行する。
 *
 * マスターデータ（npm run seed）を内包して実行するため、
 * このコマンド1つだけでも動作する。
 */
const run = async () => {
  await connectDB();

  const result = await seedDemoData();

  console.log("\nデモデータの投入結果:");
  console.log(`  デモユーザー: ${result.email}${result.userCreated ? "（新規作成）" : "（既存）"}`);
  if (result.userCreated || result.recordsInserted > 0) {
    console.log(`  パスワード: ${result.password}`);
  }
  if (result.recordsInserted > 0) {
    console.log(`  記録を ${result.recordsInserted} 件作成しました`);
  } else {
    console.log(`  記録は既に ${result.recordsExisting} 件あるため追加していません`);
  }
  console.log("");

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("デモデータのseedに失敗しました:", error.message);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
