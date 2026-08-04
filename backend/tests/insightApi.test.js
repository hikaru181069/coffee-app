/**
 * /api/insights の HTTPレベルのテスト。
 *
 * insightBuilder.test.js が「集計・閾値ロジック」を見るのに対し、こちらは
 * 「自分の記録だけから正しく生成されるか」「他ユーザーを含めないか」
 * というDB込みの振る舞いを見る（tests/graphApi.test.js と同じ方針）。
 */

import request from "supertest";

import app from "../app.js";
import Origin from "../models/Origin.js";
import Process from "../models/Process.js";
import {
  connectTestDb,
  closeTestDb,
  clearTestDb,
  createTestUser,
  createRecordFor,
  seedTestMasterData,
} from "./helpers/testDb.js";

const INSIGHTS_ENDPOINT = "/api/insights";

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
    const res = await request(app).get(INSIGHTS_ENDPOINT);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/insights", () => {
  test("記録が無ければ空配列を返す", async () => {
    const res = await request(app).get(INSIGHTS_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { insights: [] } });
  });

  test("自分の記録だけからInsightを作る（他ユーザーを含めない）", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    const process = await Process.findOne({ normalizedName: "natural" });

    // Aliceは条件を満たす組み合わせを持つが、Bobの記録は混ざらない
    await createRecordFor(alice.user._id, { originId: origin._id, processId: process._id, rating: 5 });
    await createRecordFor(alice.user._id, { originId: origin._id, processId: process._id, rating: 4 });
    await createRecordFor(bob.user._id, { originId: origin._id, processId: process._id, rating: 5 });
    await createRecordFor(bob.user._id, { originId: origin._id, processId: process._id, rating: 5 });

    const res = await request(app).get(INSIGHTS_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.body.data.insights).toContainEqual({
      type: "topCombination",
      attributes: [
        { attrType: "origin", label: "Ethiopia" },
        { attrType: "process", label: "Natural" },
      ],
      avgRating: 4.5,
      count: 2,
    });
  });
});
