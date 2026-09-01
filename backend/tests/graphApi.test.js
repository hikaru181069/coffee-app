/**
 * /api/graph の HTTPレベルのテスト。
 *
 * graphBuilder.test.js が「変換ロジック」を見るのに対し、こちらは
 * 「自分の記録だけから正しく生成されるか」「他ユーザーを含めないか」
 * というDB込みの振る舞いを見る。
 */

import request from "supertest";
import mongoose from "mongoose";

import app from "../app.js";
import Origin from "../models/Origin.js";
import Flavor from "../models/Flavor.js";
import Process from "../models/Process.js";
import {
  connectTestDb,
  closeTestDb,
  clearTestDb,
  createTestUser,
  createRecordFor,
  seedTestMasterData,
} from "./helpers/testDb.js";

const GRAPH_ENDPOINT = "/api/graph";

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
    const res = await request(app).get(GRAPH_ENDPOINT);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/graph", () => {
  test("記録が無ければ空グラフを返す", async () => {
    const res = await request(app).get(GRAPH_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      data: {
        nodes: [],
        edges: [],
        summary: { recordCount: 0, nodeCount: 0, edgeCount: 0 },
      },
    });
  });

  test("自分の記録だけからグラフを作る（他ユーザーを含めない）", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });

    await createRecordFor(alice.user._id, { title: "Aliceの記録", originId: origin._id });
    await createRecordFor(bob.user._id, { title: "Bobの記録", originId: origin._id });

    const res = await request(app).get(GRAPH_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.body.data.summary.recordCount).toBe(1);
    const recordNode = res.body.data.nodes.find((node) => node.type === "record");
    expect(recordNode.label).toBe("Aliceの記録");
  });

  test("populateされた名前がノードのlabelになる", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    const flavor = await Flavor.findOne({ normalizedName: "citrus" });

    await createRecordFor(alice.user._id, {
      originId: origin._id,
      flavorIds: [flavor._id],
    });

    const res = await request(app).get(GRAPH_ENDPOINT).set("Authorization", alice.authHeader);

    const originNode = res.body.data.nodes.find((node) => node.type === "origin");
    const flavorNode = res.body.data.nodes.find((node) => node.type === "flavor");
    expect(originNode.label).toBe("Ethiopia");
    expect(flavorNode.label).toBe("Citrus");
  });

  test("同一originの記録が複数あってもノードは1つに統合される", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });

    await createRecordFor(alice.user._id, { title: "1杯目", originId: origin._id });
    await createRecordFor(alice.user._id, { title: "2杯目", originId: origin._id });
    await createRecordFor(alice.user._id, { title: "3杯目", originId: origin._id });

    const res = await request(app).get(GRAPH_ENDPOINT).set("Authorization", alice.authHeader);

    const originNodes = res.body.data.nodes.filter((node) => node.type === "origin");
    expect(originNodes).toHaveLength(1);
    expect(originNodes[0].metadata.recordCount).toBe(3);
    expect(res.body.data.summary.recordCount).toBe(3);
  });

  describe("フィルター", () => {
    beforeEach(async () => {
      await createRecordFor(alice.user._id, {
        title: "家で",
        recordType: "home",
        rating: 3,
        consumedAt: new Date("2026-03-01"),
      });
      await createRecordFor(alice.user._id, {
        title: "カフェで",
        recordType: "cafe",
        rating: 5,
        consumedAt: new Date("2026-06-01"),
      });
    });

    test("recordTypeで対象の記録を絞り込める", async () => {
      const res = await request(app)
        .get(GRAPH_ENDPOINT)
        .query({ recordType: "cafe" })
        .set("Authorization", alice.authHeader);

      expect(res.body.data.summary.recordCount).toBe(1);
      const recordNode = res.body.data.nodes.find((node) => node.type === "record");
      expect(recordNode.label).toBe("カフェで");
    });

    test("ratingMinで絞り込める", async () => {
      const res = await request(app)
        .get(GRAPH_ENDPOINT)
        .query({ ratingMin: "4" })
        .set("Authorization", alice.authHeader);

      expect(res.body.data.summary.recordCount).toBe(1);
    });

    test("dateFrom/dateToで絞り込める", async () => {
      const res = await request(app)
        .get(GRAPH_ENDPOINT)
        .query({ dateFrom: "2026-05-01" })
        .set("Authorization", alice.authHeader);

      expect(res.body.data.summary.recordCount).toBe(1);
    });

    test("不正なフィルター値は400", async () => {
      const res = await request(app)
        .get(GRAPH_ENDPOINT)
        .query({ recordType: "office" })
        .set("Authorization", alice.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });

  describe("nodeTypesフィルター", () => {
    test("指定した種別だけのノードになる", async () => {
      await seedTestMasterData();
      const origin = await Origin.findOne({ normalizedName: "ethiopia" });
      const flavor = await Flavor.findOne({ normalizedName: "citrus" });

      await createRecordFor(alice.user._id, { originId: origin._id, flavorIds: [flavor._id] });

      const res = await request(app)
        .get(GRAPH_ENDPOINT)
        .query({ nodeTypes: "origin" })
        .set("Authorization", alice.authHeader);

      const types = new Set(res.body.data.nodes.map((node) => node.type));
      expect(types).toEqual(new Set(["record", "origin"]));
    });

    test("不正な種別は400", async () => {
      const res = await request(app)
        .get(GRAPH_ENDPOINT)
        .query({ nodeTypes: "unknown" })
        .set("Authorization", alice.authHeader);

      expect(res.status).toBe(400);
    });
  });
});

describe("GET /api/graph/nodes/:nodeId/records", () => {
  test("指定した属性ノードに関連する記録を返す", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });

    await createRecordFor(alice.user._id, { title: "1杯目", originId: origin._id });
    await createRecordFor(alice.user._id, { title: "2杯目", originId: origin._id });
    await createRecordFor(alice.user._id, {
      title: "無関係",
      originId: (await Origin.findOne({ normalizedName: "kenya" }))._id,
    });

    const nodeId = encodeURIComponent(`origin:${origin._id}`);
    const res = await request(app)
      .get(`${GRAPH_ENDPOINT}/nodes/${nodeId}/records`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.map((r) => r.title).sort()).toEqual(["1杯目", "2杯目"]);
  });

  test("notesの抜粋を含む", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    await createRecordFor(alice.user._id, {
      originId: origin._id,
      notes: "レモンのような明るい酸味",
    });

    const nodeId = encodeURIComponent(`origin:${origin._id}`);
    const res = await request(app)
      .get(`${GRAPH_ENDPOINT}/nodes/${nodeId}/records`)
      .set("Authorization", alice.authHeader);

    expect(res.body.data[0].notesExcerpt).toBe("レモンのような明るい酸味");
  });

  test("他ユーザーの記録から作られたノードは404（存在を教えない）", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    await createRecordFor(bob.user._id, { originId: origin._id });

    // Aliceは同じ産地の記録を持っていないので、Aliceのグラフにこのノードは無い
    const nodeId = encodeURIComponent(`origin:${origin._id}`);
    const res = await request(app)
      .get(`${GRAPH_ENDPOINT}/nodes/${nodeId}/records`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("存在しないノードIDは404", async () => {
    const nodeId = encodeURIComponent("origin:507f1f77bcf86cd799439011");
    const res = await request(app)
      .get(`${GRAPH_ENDPOINT}/nodes/${nodeId}/records`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
  });

  test("recordノードのIDを渡すと関連記録は空（エッジは常にrecord→属性）", async () => {
    const record = await createRecordFor(alice.user._id);

    const nodeId = encodeURIComponent(`record:${record._id}`);
    const res = await request(app)
      .get(`${GRAPH_ENDPOINT}/nodes/${nodeId}/records`)
      .set("Authorization", alice.authHeader);

    // record:xxx はグラフ生成時に必ずノードとして存在するため404にはならないが、
    // そこへ向かうエッジは無いので関連記録は0件になる
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual([]);
  });

  test("トークン無しは401", async () => {
    const nodeId = encodeURIComponent("origin:507f1f77bcf86cd799439011");
    const res = await request(app).get(`${GRAPH_ENDPOINT}/nodes/${nodeId}/records`);

    expect(res.status).toBe(401);
  });
});

describe("GET /api/graph/nodes/:nodeId", () => {
  test("統計・関連属性・関連記録をまとめて返す", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    const process = await Process.findOne({ normalizedName: "washed" });
    const flavor = await Flavor.findOne({ normalizedName: "berry" });

    await createRecordFor(alice.user._id, {
      originId: origin._id,
      processId: process._id,
      flavorIds: [flavor._id],
      rating: 5,
      consumedAt: new Date("2026-06-01"),
    });
    await createRecordFor(alice.user._id, {
      originId: origin._id,
      rating: 3,
      consumedAt: new Date("2026-07-01"),
    });

    const nodeId = encodeURIComponent(`origin:${origin._id}`);
    const res = await request(app)
      .get(`${GRAPH_ENDPOINT}/nodes/${nodeId}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      type: "origin",
      label: "Ethiopia",
      recordCount: 2,
      avgRating: 4,
      lastConsumedAt: "2026-07-01T00:00:00.000Z",
    });
    expect(res.body.data.relatedAttributes.flavor).toEqual([
      { id: `flavor:${flavor._id}`, label: "Berry", count: 1 },
    ]);
    expect(res.body.data.records).toHaveLength(2);
    // 新しい記録から順に並ぶ
    expect(res.body.data.records[0].consumedAt).toBe("2026-07-01T00:00:00.000Z");
  });

  test("他ユーザーの記録から作られたノードは404（存在を教えない）", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    await createRecordFor(bob.user._id, { originId: origin._id });

    const nodeId = encodeURIComponent(`origin:${origin._id}`);
    const res = await request(app)
      .get(`${GRAPH_ENDPOINT}/nodes/${nodeId}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("存在しないノードIDは404", async () => {
    const nodeId = encodeURIComponent("origin:507f1f77bcf86cd799439011");
    const res = await request(app)
      .get(`${GRAPH_ENDPOINT}/nodes/${nodeId}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
  });

  test("トークン無しは401", async () => {
    const nodeId = encodeURIComponent("origin:507f1f77bcf86cd799439011");
    const res = await request(app).get(`${GRAPH_ENDPOINT}/nodes/${nodeId}`);

    expect(res.status).toBe(401);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
