/**
 * /api/stats の HTTPレベルのテスト。
 *
 * statsBuilder.test.js が「集計ロジック」を見るのに対し、こちらは
 * 「自分の記録だけから正しく集計されるか」「他ユーザーを含めないか」
 * というDB込みの振る舞いを見る（tests/insightApi.test.js / searchApi.test.js
 * と同じ方針）。
 */

import request from "supertest";

import app from "../app.js";
import Origin from "../models/Origin.js";
import {
  connectTestDb,
  closeTestDb,
  clearTestDb,
  createTestUser,
  createRecordFor,
  seedTestMasterData,
} from "./helpers/testDb.js";

const STATS_ENDPOINT = "/api/stats";

let alice;
let bob;

beforeAll(connectTestDb);
afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  alice = await createTestUser({ name: "Alice" });
  bob = await createTestUser({ name: "Bob" });
});

describe("認証", () => {
  test("トークン無しは401", async () => {
    const res = await request(app).get(STATS_ENDPOINT);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/stats", () => {
  test("記録が無ければ空の統計を返す", async () => {
    const res = await request(app).get(STATS_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.overview.recordCount).toBe(0);
  });

  test("自分の記録だけから統計を作る（他ユーザーを含めない）", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });

    await createRecordFor(alice.user._id, { originId: origin._id, rating: 5 });
    await createRecordFor(bob.user._id, { originId: origin._id, rating: 1 });

    const res = await request(app).get(STATS_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.body.data.overview.recordCount).toBe(1);
    expect(res.body.data.overview.avgRating).toBe(5);
    expect(res.body.data.topOrigins).toEqual([
      { id: `origin:${origin._id}`, label: "Ethiopia", count: 1 },
    ]);
  });
});
