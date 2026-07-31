import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import jwt from "jsonwebtoken";

import User from "../../models/User.js";
import CoffeeRecord from "../../models/CoffeeRecord.js";
import { seedMasterData } from "../../seeds/seedMasterData.js";

/**
 * APIテスト用のインメモリMongoDB。
 *
 * なぜ mongodb-memory-server を使うのか:
 *   「他ユーザーの記録を更新できない」「未認証は401」といった要件は、
 *   実際にDBへ2人分のデータを入れないと確かめられない。
 *   一方でCIにMongoDBのサービスコンテナを足すと、ローカルでは
 *   docker が起動していないと npm test が落ちるようになる。
 *   インメモリ版なら npm test 1コマンドで、どこでも同じように動く。
 *
 * テストファイルごとに1インスタンス立てる。
 * Jestはファイル単位で並列実行するため、DBを共有すると
 * 別ファイルのデータが混ざる。
 */

let mongod;

/** DBを起動して接続する。beforeAll から呼ぶ */
export const connectTestDb = async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
};

/** 接続を閉じてDBを止める。afterAll から呼ぶ */
export const closeTestDb = async () => {
  await mongoose.disconnect();
  await mongod?.stop();
};

/**
 * コレクションを空にする。beforeEach から呼ぶ。
 *
 * テスト間でデータが残ると、実行順によって結果が変わる
 * （前のテストが作った記録が一覧に出てしまう等）。
 */
export const clearTestDb = async () => {
  const { collections } = mongoose.connection;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
};

/** マスターデータを投入する。参照つきの記録を作るテストで使う */
export const seedTestMasterData = () => seedMasterData();

/**
 * テスト用のユーザーを作り、そのユーザーのJWTを返す。
 *
 * 本番と同じ authController のロジックでトークンを作る必要はないが、
 * authenticate が検証できる形（{ userId } を JWT_SECRET で署名）に
 * そろえておく。
 */
export const createTestUser = async (overrides = {}) => {
  const user = await User.create({
    name: "Test User",
    email: `user-${new mongoose.Types.ObjectId()}@example.com`,
    // 認証APIを経由しないのでハッシュ化の必要はない。
    // authenticate はパスワードを見ない
    password: "hashed-password-placeholder",
    ...overrides,
  });

  const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });

  return { user, token, authHeader: `Bearer ${token}` };
};

/** 検証を通る最小限の記録データ */
export const buildRecordPayload = (overrides = {}) => ({
  title: "Ethiopia Natural",
  consumedAt: "2026-07-31T09:00:00.000Z",
  recordType: "home",
  ...overrides,
});

/** テストから直接DBへ記録を作る（APIを経由せずに前提データを用意する用） */
export const createRecordFor = (userId, overrides = {}) =>
  CoffeeRecord.create({
    userId,
    title: "Ethiopia Natural",
    consumedAt: new Date("2026-07-31T09:00:00.000Z"),
    recordType: "home",
    ...overrides,
  });
