/**
 * /api/graph/communities のHTTPレベルのテスト。
 *
 * FastAPIへの実際のネットワーク呼び出しはmockし、「Expressが正しい
 * nodes/edgesを渡しているか」「FastAPIが失敗してもグラフ本体を壊さず
 * 空配列を返すか」というExpress側の振る舞いだけを見る
 * （NetworkXの計算ロジック自体はfastapi-service/tests/test_community_detection.pyの担当）。
 */

import { vi, describe, test, expect, beforeAll, afterAll, beforeEach } from "vitest";
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

// vi.mockはファイル内の位置に関わらず先頭へ巻き上げられるため、
// 上のimport app from "../app.js"（→graphService.js→fastApiService.js
// という依存チェーン）より先に効く。
const detectGraphCommunities = vi.fn();
vi.mock("../services/fastApiService.js", () => ({
  detectGraphCommunities: (...args) => detectGraphCommunities(...args),
}));

const COMMUNITIES_ENDPOINT = "/api/graph/communities";

let alice;

beforeAll(connectTestDb);
afterAll(async () => {
  await closeTestDb();
});

beforeEach(async () => {
  await clearTestDb();
  detectGraphCommunities.mockReset();
  alice = await createTestUser({ name: "Alice" });
});

describe("認証", () => {
  test("トークン無しは401", async () => {
    const res = await request(app).get(COMMUNITIES_ENDPOINT);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/graph/communities", () => {
  test("記録が無ければFastAPIを呼ばずに空配列を返す", async () => {
    const res = await request(app).get(COMMUNITIES_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { communities: [] } });
    expect(detectGraphCommunities).not.toHaveBeenCalled();
  });

  test("FastAPIの結果をそのままdataへ入れて返す", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    await createRecordFor(alice.user._id, { components: [{ originId: origin._id }] });

    const fakeResult = {
      communities: [
        {
          id: 0,
          recordCount: 3,
          dominantAttributes: { origin: ["Ethiopia"] },
          nodeIds: ["record:1", "record:2", "record:3", "origin:507f"],
        },
      ],
    };
    detectGraphCommunities.mockResolvedValue(fakeResult);

    const res = await request(app).get(COMMUNITIES_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual(fakeResult);
    expect(detectGraphCommunities).toHaveBeenCalledTimes(1);

    const [nodes, edges] = detectGraphCommunities.mock.calls[0];
    expect(nodes.some((node) => node.type === "origin" && node.label === "Ethiopia")).toBe(true);
    expect(edges.length).toBeGreaterThan(0);
  });

  test("FastAPIの呼び出しが失敗しても500にならず空配列を返す", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    await createRecordFor(alice.user._id, { components: [{ originId: origin._id }] });

    detectGraphCommunities.mockRejectedValue(new Error("FastAPI /graph/communities returned 503"));

    const res = await request(app).get(COMMUNITIES_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { communities: [] } });
  });

  test("他ユーザーの記録は数えない（自分の記録が無ければ呼ばない）", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    const bob = await createTestUser({ name: "Bob" });
    await createRecordFor(bob.user._id, { components: [{ originId: origin._id }] });

    const res = await request(app).get(COMMUNITIES_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.body).toEqual({ data: { communities: [] } });
    expect(detectGraphCommunities).not.toHaveBeenCalled();
  });
});
