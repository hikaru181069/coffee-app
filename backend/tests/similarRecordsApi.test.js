/**
 * /api/similar-records の HTTPレベルのテスト。
 *
 * similarRecordsBuilder.test.js が「集計ロジック」を見るのに対し、こちらは
 * 「自分の記録だけから正しく生成されるか」「他ユーザーを含めないか」
 * 「存在しない記録IDは404か」というDB込みの振る舞いを見る
 * （discoverApi.test.js と同じ方針）。
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

const SIMILAR_RECORDS_PATH = "/api/similar-records";

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
    const res = await request(app).get(`${SIMILAR_RECORDS_PATH}/000000000000000000000000`);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/similar-records/:recordId", () => {
  test("存在しない記録IDは404", async () => {
    const res = await request(app)
      .get(`${SIMILAR_RECORDS_PATH}/000000000000000000000000`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("他ユーザーの記録IDは404（自分の記録経由でしか解決しない）", async () => {
    const bobRecord = await createRecordFor(bob.user._id);

    const res = await request(app)
      .get(`${SIMILAR_RECORDS_PATH}/${bobRecord._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
  });

  test("共有する属性が2件以上の記録だけを、共有数の多い順で返す", async () => {
    await seedTestMasterData();
    const ethiopia = await Origin.findOne({ normalizedName: "ethiopia" });
    const natural = await Process.findOne({ normalizedName: "natural" });
    const washed = await Process.findOne({ normalizedName: "washed" });

    const target = await createRecordFor(alice.user._id, {
      title: "対象記録",
      originId: ethiopia._id,
      processId: natural._id,
    });
    // 産地・精製方法の2件を共有 → 候補になる
    const similar = await createRecordFor(alice.user._id, {
      title: "似た記録",
      originId: ethiopia._id,
      processId: natural._id,
    });
    // 産地だけ共有（1件）→ 閾値未満のため候補外
    const notSimilarEnough = await createRecordFor(alice.user._id, {
      title: "産地だけ一致",
      originId: ethiopia._id,
      processId: washed._id,
    });

    const res = await request(app)
      .get(`${SIMILAR_RECORDS_PATH}/${target._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    const ids = res.body.data.similarRecords.map((r) => r.id);
    expect(ids).toContain(String(similar._id));
    expect(ids).not.toContain(String(notSimilarEnough._id));
    expect(res.body.data.similarRecords[0]).toMatchObject({
      id: String(similar._id),
      title: "似た記録",
      sharedCount: 2,
    });
  });

  test("他ユーザーの記録は候補に混ざらない", async () => {
    await seedTestMasterData();
    const ethiopia = await Origin.findOne({ normalizedName: "ethiopia" });
    const natural = await Process.findOne({ normalizedName: "natural" });

    const target = await createRecordFor(alice.user._id, {
      originId: ethiopia._id,
      processId: natural._id,
    });
    // Bobが全く同じ組み合わせを記録していても、Aliceの候補には出ない
    await createRecordFor(bob.user._id, { originId: ethiopia._id, processId: natural._id });

    const res = await request(app)
      .get(`${SIMILAR_RECORDS_PATH}/${target._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.similarRecords).toEqual([]);
  });

  test("候補が無ければ空配列を返す", async () => {
    const target = await createRecordFor(alice.user._id);

    const res = await request(app)
      .get(`${SIMILAR_RECORDS_PATH}/${target._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ similarRecords: [] });
  });
});
