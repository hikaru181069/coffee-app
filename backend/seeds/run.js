// dotenv は他のimportより先に評価させる（docs/architecture.md の Module Format）
import "dotenv/config";

import mongoose from "mongoose";
import connectDB from "../config/db.js";
import { seedMasterData } from "./seedMasterData.js";

/**
 * seed のCLIエントリ。`npm run seed` で実行する。
 *
 * ここの責務は「DBへ繋ぐ・実行する・結果を出す・切断する」だけ。
 * 何をどう投入するかは seedMasterData.js が持つ。
 *
 * 何度実行しても安全（既存データは上書きも削除もしない）。
 */
const run = async () => {
  await connectDB();

  const results = await seedMasterData();

  console.log("\nマスターデータの投入結果:");
  for (const { label, inserted, skipped, total } of results) {
    console.log(
      `  ${label.padEnd(8, "　")} 追加 ${inserted} 件 / 既存 ${skipped} 件 / 合計 ${total} 件`,
    );
  }
  console.log("");

  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error("seed に失敗しました:", error.message);
  // 接続が残ったままプロセスが終わらないように、失敗時も必ず切断する
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
