/**
 * /api/search の HTTPレベルのテスト。
 *
 * searchBuilder.test.js が「集計ロジック」を見るのに対し、こちらは
 * 「自分の記録だけから正しく検索されるか」「他ユーザーを含めないか」
 * というDB込みの振る舞いを見る（tests/graphApi.test.js / insightApi.test.js
 * と同じ方針）。
 */

import request from "supertest";

import app from "../app.js";
import Origin from "../models/Origin.js";
import Flavor from "../models/Flavor.js";
import {
  connectTestDb,
  closeTestDb,
  clearTestDb,
  createTestUser,
  createRecordFor,
  seedTestMasterData,
} from "./helpers/testDb.js";

const SEARCH_ENDPOINT = "/api/search";

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
    const res = await request(app).get(SEARCH_ENDPOINT).query({ q: "ethiopia" });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/search", () => {
  test("クエリ無しは空の結果を返す（バリデーションエラーにしない）", async () => {
    const res = await request(app).get(SEARCH_ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { entities: [], entitiesTruncated: false, records: [] } });
  });

  test("自分の記録だけから検索する（他ユーザーを含めない）", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });

    await createRecordFor(alice.user._id, { title: "Aliceの記録", originId: origin._id });
    await createRecordFor(bob.user._id, { title: "Bobの記録", originId: origin._id });

    const res = await request(app)
      .get(SEARCH_ENDPOINT)
      .query({ q: "ethiopia" })
      .set("Authorization", alice.authHeader);

    expect(res.body.data.entities).toHaveLength(1);
    expect(res.body.data.entities[0].recordCount).toBe(1);
  });

  test("産地ヒット時に共起するフレーバーを添えて返す", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    const flavor = await Flavor.findOne({ normalizedName: "berry" });

    await createRecordFor(alice.user._id, { originId: origin._id, flavorIds: [flavor._id] });

    const res = await request(app)
      .get(SEARCH_ENDPOINT)
      .query({ q: "ethiopia" })
      .set("Authorization", alice.authHeader);

    expect(res.body.data.entities[0]).toMatchObject({
      type: "origin",
      label: "Ethiopia",
      relatedType: "flavor",
      relatedLabels: ["Berry"],
    });
  });

  test("記録タイトルでも検索できる", async () => {
    await createRecordFor(alice.user._id, { title: "とりあえず買った豆" });

    const res = await request(app)
      .get(SEARCH_ENDPOINT)
      .query({ q: "とりあえず" })
      .set("Authorization", alice.authHeader);

    expect(res.body.data.records).toHaveLength(1);
    expect(res.body.data.records[0].title).toBe("とりあえず買った豆");
  });

  test("カフェ名でも検索できる", async () => {
    await createRecordFor(alice.user._id, { cafeName: "Blue Bottle Coffee" });

    const res = await request(app)
      .get(SEARCH_ENDPOINT)
      .query({ q: "blue bottle" })
      .set("Authorization", alice.authHeader);

    expect(res.body.data.entities[0]).toMatchObject({ type: "cafe", label: "Blue Bottle Coffee" });
  });

  test("qを2回指定した配列クエリでも500にならず空の結果を返す", async () => {
    // ?q=a&q=b はExpressでreq.query.qが配列になり、以前は
    // searchBuilder.jsの.trim()呼び出しでTypeErrorになっていた
    const res = await request(app)
      .get(`${SEARCH_ENDPOINT}?q=a&q=b`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: { entities: [], entitiesTruncated: false, records: [] } });
  });

  describe("検索ボックスとフィルターの併用", () => {
    test("recordType（home/cafe）でアクティブなフィルターの範囲内だけ検索する", async () => {
      await seedTestMasterData();
      const origin = await Origin.findOne({ normalizedName: "ethiopia" });
      await createRecordFor(alice.user._id, {
        title: "家のエチオピア",
        recordType: "home",
        originId: origin._id,
      });
      await createRecordFor(alice.user._id, {
        title: "カフェのエチオピア",
        recordType: "cafe",
        originId: origin._id,
      });

      const res = await request(app)
        .get(SEARCH_ENDPOINT)
        .query({ q: "ethiopia", recordType: "home" })
        .set("Authorization", alice.authHeader);

      // homeでフィルターしているため、originのrecordCountは1件だけになる
      expect(res.body.data.entities[0]).toMatchObject({ label: "Ethiopia", recordCount: 1 });
    });

    test("originIdsで絞り込んだ範囲内だけ記録タイトルを検索する", async () => {
      await seedTestMasterData();
      const ethiopia = await Origin.findOne({ normalizedName: "ethiopia" });
      const kenya = await Origin.findOne({ normalizedName: "kenya" });
      await createRecordFor(alice.user._id, { title: "朝のコーヒー", originId: ethiopia._id });
      await createRecordFor(alice.user._id, { title: "朝のコーヒー2", originId: kenya._id });

      const res = await request(app)
        .get(SEARCH_ENDPOINT)
        .query({ q: "朝の", originIds: String(ethiopia._id) })
        .set("Authorization", alice.authHeader);

      expect(res.body.data.records).toHaveLength(1);
      expect(res.body.data.records[0].title).toBe("朝のコーヒー");
    });

    test("不正なフィルター値は400を返す", async () => {
      const res = await request(app)
        .get(SEARCH_ENDPOINT)
        .query({ q: "ethiopia", originIds: "not-an-id" })
        .set("Authorization", alice.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("VALIDATION_ERROR");
    });
  });
});
