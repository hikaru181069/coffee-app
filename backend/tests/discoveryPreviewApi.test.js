/**
 * POST /api/discoveries/preview の HTTPレベルのテスト。
 *
 * discoveryBuilder.test.js が集計ロジックそのものを見るのに対し、こちらは
 * 「自分の記録だけを対象に正しく計算されるか」「保存されないか」
 * 「他ユーザーの記録は数えないか」というDB込みの振る舞いを見る
 * （discoverApi.test.jsと同じ方針）。
 */

import request from "supertest";

import app from "../app.js";
import CoffeeRecord from "../models/CoffeeRecord.js";
import Origin from "../models/Origin.js";
import {
  connectTestDb,
  closeTestDb,
  clearTestDb,
  createTestUser,
  createRecordFor,
  seedTestMasterData,
} from "./helpers/testDb.js";

const PREVIEW_PATH = "/api/discoveries/preview";
const NON_EXISTENT_ID = "507f1f77bcf86cd799439011";

let alice;
let bob;

beforeAll(connectTestDb);
afterAll(closeTestDb);

beforeEach(async () => {
  await clearTestDb();
  alice = await createTestUser({ name: "Alice" });
  bob = await createTestUser({ name: "Bob" });
});

describe("認証", () => {
  test("トークン無しは401", async () => {
    const res = await request(app).post(PREVIEW_PATH).send({ originId: NON_EXISTENT_ID });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("POST /api/discoveries/preview", () => {
  test("originIdが無ければ400", async () => {
    const res = await request(app).post(PREVIEW_PATH).set("Authorization", alice.authHeader).send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("ID形式が不正なら400（500にしない）", async () => {
    const res = await request(app)
      .post(PREVIEW_PATH)
      .set("Authorization", alice.authHeader)
      .send({ originId: "abc" });

    expect(res.status).toBe(400);
  });

  test("実在しない産地IDは404", async () => {
    const res = await request(app)
      .post(PREVIEW_PATH)
      .set("Authorization", alice.authHeader)
      .send({ originId: NON_EXISTENT_ID });

    expect(res.status).toBe(404);
  });

  test("初めての産地を選ぶとfirstAppearanceを返す", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });

    const res = await request(app)
      .post(PREVIEW_PATH)
      .set("Authorization", alice.authHeader)
      .send({ originId: String(origin._id) });

    expect(res.status).toBe(200);
    expect(res.body.data.discoveries).toEqual([
      expect.objectContaining({ type: "firstAppearance", nodeType: "origin", label: "Ethiopia" }),
    ]);
  });

  test("既に2件記録済みの産地を選ぶとmilestone（3件目）を返す", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });

    await createRecordFor(alice.user._id, { components: [{ originId: origin._id }] });
    await createRecordFor(alice.user._id, { components: [{ originId: origin._id }] });

    const res = await request(app)
      .post(PREVIEW_PATH)
      .set("Authorization", alice.authHeader)
      .send({ originId: String(origin._id) });

    expect(res.status).toBe(200);
    expect(res.body.data.discoveries).toEqual([
      expect.objectContaining({ type: "milestone", nodeType: "origin", label: "Ethiopia", recordCount: 3 }),
    ]);
  });

  test("他ユーザーの記録は自分の集計に影響しない", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });

    await createRecordFor(bob.user._id, { components: [{ originId: origin._id }] });
    await createRecordFor(bob.user._id, { components: [{ originId: origin._id }] });

    const res = await request(app)
      .post(PREVIEW_PATH)
      .set("Authorization", alice.authHeader)
      .send({ originId: String(origin._id) });

    expect(res.status).toBe(200);
    expect(res.body.data.discoveries).toEqual([
      expect.objectContaining({ type: "firstAppearance", nodeType: "origin", label: "Ethiopia" }),
    ]);
  });

  test("プレビューは記録を保存しない", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });

    await request(app)
      .post(PREVIEW_PATH)
      .set("Authorization", alice.authHeader)
      .send({ originId: String(origin._id) });

    const count = await CoffeeRecord.countDocuments({ userId: alice.user._id });
    expect(count).toBe(0);
  });
});
