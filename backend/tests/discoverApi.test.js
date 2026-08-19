/**
 * /api/discover の HTTPレベルのテスト。
 *
 * discoverBuilder.test.js が「集計・閾値ロジック」を見るのに対し、こちらは
 * 「自分の記録だけから正しく生成されるか」「他ユーザーを含めないか」
 * 「存在しないノードは404か」というDB込みの振る舞いを見る
 * （tests/insightApi.test.js と同じ方針）。
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

const DISCOVER_PATH = "/api/discover";

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
    const res = await request(app).get(`${DISCOVER_PATH}/nodes/origin:000000000000000000000000`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/discover/nodes/:nodeId", () => {
  test("origin以外のプレフィックスは空配列を返す（404にしない）", async () => {
    const res = await request(app)
      .get(`${DISCOVER_PATH}/nodes/process:000000000000000000000000`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { suggestions: [] } });
  });

  test("自分の記録に無い産地IDは404", async () => {
    const res = await request(app)
      .get(`${DISCOVER_PATH}/nodes/origin:000000000000000000000000`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("閾値未満（記録1件）なら空配列を返す", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    const process = await Process.findOne({ normalizedName: "natural" });

    await createRecordFor(alice.user._id, { originId: origin._id, processId: process._id });

    const res = await request(app)
      .get(`${DISCOVER_PATH}/nodes/origin:${origin._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { suggestions: [] } });
  });

  test("自分の記録だけから提案を作る（他ユーザーの記録は混ざらない）", async () => {
    await seedTestMasterData();
    const ethiopia = await Origin.findOne({ normalizedName: "ethiopia" });
    const natural = await Process.findOne({ normalizedName: "natural" });

    // Aliceは条件を満たすが、Bobの記録（Panamaを既に試した扱いにする）は混ざらない
    await createRecordFor(alice.user._id, { originId: ethiopia._id, processId: natural._id });
    await createRecordFor(alice.user._id, { originId: ethiopia._id, processId: natural._id });

    const panama = await Origin.findOne({ normalizedName: "panama" });
    await createRecordFor(bob.user._id, { originId: panama._id, processId: natural._id });

    const res = await request(app)
      .get(`${DISCOVER_PATH}/nodes/origin:${ethiopia._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.suggestions.length).toBeGreaterThan(0);
    // BobがPanamaを記録していても、Aliceにとっては未経験のまま候補に含まれてよい
    expect(res.body.data.suggestions.some((s) => s.suggestedOrigin.label === "Panama")).toBe(true);
  });

  test("すでに自分が試した産地は候補から除外される", async () => {
    await seedTestMasterData();
    const ethiopia = await Origin.findOne({ normalizedName: "ethiopia" });
    const natural = await Process.findOne({ normalizedName: "natural" });
    const panama = await Origin.findOne({ normalizedName: "panama" });
    const washed = await Process.findOne({ normalizedName: "washed" });

    await createRecordFor(alice.user._id, { originId: ethiopia._id, processId: natural._id });
    await createRecordFor(alice.user._id, { originId: ethiopia._id, processId: natural._id });
    await createRecordFor(alice.user._id, { originId: panama._id, processId: washed._id });

    const res = await request(app)
      .get(`${DISCOVER_PATH}/nodes/origin:${ethiopia._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.suggestions.some((s) => s.suggestedOrigin.label === "Panama")).toBe(false);
  });
});

describe("GET /api/discover（Home画面用の導線）", () => {
  test("トークン無しは401", async () => {
    const res = await request(app).get(DISCOVER_PATH);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("条件を満たす産地が無ければteaser: nullを返す", async () => {
    const res = await request(app).get(DISCOVER_PATH).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { teaser: null } });
  });

  test("自分の記録だけからteaserを作る（他ユーザーの記録は混ざらない）", async () => {
    await seedTestMasterData();
    const ethiopia = await Origin.findOne({ normalizedName: "ethiopia" });
    const natural = await Process.findOne({ normalizedName: "natural" });

    await createRecordFor(alice.user._id, { originId: ethiopia._id, processId: natural._id });
    await createRecordFor(alice.user._id, { originId: ethiopia._id, processId: natural._id });

    // Bobが条件を満たしていても、Aliceのteaserには影響しない
    await createRecordFor(bob.user._id, { originId: ethiopia._id, processId: natural._id });
    await createRecordFor(bob.user._id, { originId: ethiopia._id, processId: natural._id });

    const res = await request(app).get(DISCOVER_PATH).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.teaser).toEqual({
      nodeId: `origin:${ethiopia._id}`,
      type: "similarProcessOrigin",
      basedOn: { originLabel: "Ethiopia", processLabel: "Natural", count: 2 },
      suggestedOrigin: { label: "Panama", avgQualityScore: 86.1 },
    });
  });
});
