/**
 * /api/origin-quality の HTTPレベルのテスト。
 *
 * originQualityBuilder.test.js が「集計ロジック」を見るのに対し、こちらは
 * 「自分の記録経由でしか産地ノードを解決できないか」「countryCodeが
 * 正しく添えられるか」というDB込みの振る舞いを見る（discoverApi.test.js
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

const ORIGIN_QUALITY_PATH = "/api/origin-quality";

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
  test("トークン無しは401（nodes/:nodeId）", async () => {
    const res = await request(app).get(`${ORIGIN_QUALITY_PATH}/nodes/origin:000000000000000000000000`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("トークン無しは401（一覧）", async () => {
    const res = await request(app).get(ORIGIN_QUALITY_PATH);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/origin-quality/nodes/:nodeId", () => {
  test("origin以外のプレフィックスは空配列を返す（404にしない）", async () => {
    const res = await request(app)
      .get(`${ORIGIN_QUALITY_PATH}/nodes/process:000000000000000000000000`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { originLabel: null, scores: [] } });
  });

  test("自分の記録に無い産地IDは404", async () => {
    const res = await request(app)
      .get(`${ORIGIN_QUALITY_PATH}/nodes/origin:000000000000000000000000`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("他ユーザーの記録にしか無い産地IDは404（自分の記録経由でしか解決しない）", async () => {
    await seedTestMasterData();
    const ethiopia = await Origin.findOne({ normalizedName: "ethiopia" });
    await createRecordFor(bob.user._id, { originId: ethiopia._id });

    const res = await request(app)
      .get(`${ORIGIN_QUALITY_PATH}/nodes/origin:${ethiopia._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
  });

  test("自分の記録にある産地なら、精製方法ごとの品質スコアをスコア順に返す", async () => {
    await seedTestMasterData();
    const ethiopia = await Origin.findOne({ normalizedName: "ethiopia" });
    await createRecordFor(alice.user._id, { originId: ethiopia._id });

    const res = await request(app)
      .get(`${ORIGIN_QUALITY_PATH}/nodes/origin:${ethiopia._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.originLabel).toBe("Ethiopia");
    expect(res.body.data.scores.length).toBeGreaterThan(0);
    const scores = res.body.data.scores.map((s) => s.avgQualityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });
});

describe("GET /api/origin-quality（一覧）", () => {
  test("CQIデータの全産地について、countryCode付きの平均スコアをスコア順に返す", async () => {
    await seedTestMasterData();

    const res = await request(app).get(ORIGIN_QUALITY_PATH).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.origins.length).toBeGreaterThan(0);

    const ethiopiaEntry = res.body.data.origins.find((o) => o.originName === "Ethiopia");
    expect(ethiopiaEntry).toMatchObject({ originName: "Ethiopia", countryCode: "ET" });
    expect(typeof ethiopiaEntry.avgQualityScore).toBe("number");

    const scores = res.body.data.origins.map((o) => o.avgQualityScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  test("自分の記録が無くても（Originマスターさえあれば）返る", async () => {
    await seedTestMasterData();

    const res = await request(app).get(ORIGIN_QUALITY_PATH).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.origins.length).toBeGreaterThan(0);
  });
});
