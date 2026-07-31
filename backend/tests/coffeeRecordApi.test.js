/**
 * /api/coffee-records の HTTPレベルのテスト。
 *
 * インメモリMongoDBへ実際にデータを入れて、
 * 「他ユーザーの記録を触れないこと」まで含めて確認する。
 * ここが通らないと、記録が他人から見える・書き換えられる状態で
 * 公開してしまうことになる。
 */

import request from "supertest";
import mongoose from "mongoose";

import app from "../app.js";
import Origin from "../models/Origin.js";
import Flavor from "../models/Flavor.js";
import {
  connectTestDb,
  closeTestDb,
  clearTestDb,
  createTestUser,
  createRecordFor,
  buildRecordPayload,
  seedTestMasterData,
} from "./helpers/testDb.js";

const ENDPOINT = "/api/coffee-records";
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

// ── 認証 ──────────────────────────────────────────────────────

describe("認証", () => {
  test.each([
    ["get", ENDPOINT],
    ["post", ENDPOINT],
    ["get", `${ENDPOINT}/${NON_EXISTENT_ID}`],
    ["patch", `${ENDPOINT}/${NON_EXISTENT_ID}`],
    ["delete", `${ENDPOINT}/${NON_EXISTENT_ID}`],
  ])("トークン無しの %s %s は401", async (method, path) => {
    const res = await request(app)[method](path);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });

  test("壊れたトークンは401", async () => {
    const res = await request(app).get(ENDPOINT).set("Authorization", "Bearer not-a-jwt");

    expect(res.status).toBe(401);
  });

  test("Bearer 以外の形式は401", async () => {
    const res = await request(app).get(ENDPOINT).set("Authorization", alice.token);

    expect(res.status).toBe(401);
  });
});

// ── 作成 ──────────────────────────────────────────────────────

describe("POST /api/coffee-records", () => {
  test("必須項目がそろっていれば201で作成される", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", alice.authHeader)
      .send(buildRecordPayload({ rating: 5, notes: "紅茶のよう" }));

    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({
      title: "Ethiopia Natural",
      recordType: "home",
      rating: 5,
      notes: "紅茶のよう",
    });
    expect(res.body.data.id).toBeDefined();
  });

  test("必須項目が足りなければ400と項目別の理由を返す", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", alice.authHeader)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(res.body.error.details.map((d) => d.field).sort()).toEqual([
      "consumedAt",
      "recordType",
      "title",
    ]);
  });

  test("recordTypeが不正なら400", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", alice.authHeader)
      .send(buildRecordPayload({ recordType: "office" }));

    expect(res.status).toBe(400);
  });

  test("本文のuserIdは無視され、認証したユーザーの記録になる", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", alice.authHeader)
      .send(buildRecordPayload({ userId: String(bob.user._id) }));

    expect(res.status).toBe(201);

    // Bobの一覧には出ず、Aliceの一覧に出る
    const bobList = await request(app).get(ENDPOINT).set("Authorization", bob.authHeader);
    const aliceList = await request(app)
      .get(ENDPOINT)
      .set("Authorization", alice.authHeader);

    expect(bobList.body.data).toHaveLength(0);
    expect(aliceList.body.data).toHaveLength(1);
  });

  test("マスターデータを参照すると名前まで解決して返す", async () => {
    await seedTestMasterData();
    const origin = await Origin.findOne({ normalizedName: "ethiopia" });
    const flavor = await Flavor.findOne({ normalizedName: "citrus" });

    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", alice.authHeader)
      .send(
        buildRecordPayload({
          originId: String(origin._id),
          flavorIds: [String(flavor._id)],
        }),
      );

    expect(res.status).toBe(201);
    expect(res.body.data.origin).toEqual({ id: String(origin._id), name: "Ethiopia" });
    expect(res.body.data.flavors[0].name).toBe("Citrus");
  });

  test("実在しないマスターIDを指定すると400", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", alice.authHeader)
      .send(buildRecordPayload({ originId: NON_EXISTENT_ID }));

    expect(res.status).toBe(400);
    expect(res.body.error.details[0].field).toBe("originId");
  });

  test("IDの形式が不正なら400（500にしない）", async () => {
    const res = await request(app)
      .post(ENDPOINT)
      .set("Authorization", alice.authHeader)
      .send(buildRecordPayload({ originId: "abc" }));

    expect(res.status).toBe(400);
  });
});

// ── 一覧 ──────────────────────────────────────────────────────

describe("GET /api/coffee-records", () => {
  test("自分の記録だけが返る", async () => {
    await createRecordFor(alice.user._id, { title: "Aliceの記録" });
    await createRecordFor(bob.user._id, { title: "Bobの記録" });

    const res = await request(app).get(ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].title).toBe("Aliceの記録");
  });

  test("記録が無ければ空配列とtotal 0を返す", async () => {
    const res = await request(app).get(ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.body.data).toEqual([]);
    expect(res.body.pagination).toEqual({ page: 1, limit: 20, total: 0, totalPages: 0 });
  });

  test("既定では consumedAt の新しい順に並ぶ", async () => {
    await createRecordFor(alice.user._id, {
      title: "古い",
      consumedAt: new Date("2026-01-01"),
    });
    await createRecordFor(alice.user._id, {
      title: "新しい",
      consumedAt: new Date("2026-07-01"),
    });

    const res = await request(app).get(ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.body.data.map((r) => r.title)).toEqual(["新しい", "古い"]);
  });

  test("sort=consumedAt で古い順にできる", async () => {
    await createRecordFor(alice.user._id, {
      title: "古い",
      consumedAt: new Date("2026-01-01"),
    });
    await createRecordFor(alice.user._id, {
      title: "新しい",
      consumedAt: new Date("2026-07-01"),
    });

    const res = await request(app)
      .get(ENDPOINT)
      .query({ sort: "consumedAt" })
      .set("Authorization", alice.authHeader);

    expect(res.body.data.map((r) => r.title)).toEqual(["古い", "新しい"]);
  });

  describe("ページネーション", () => {
    beforeEach(async () => {
      for (let i = 0; i < 25; i += 1) {
        await createRecordFor(alice.user._id, {
          title: `記録${i}`,
          consumedAt: new Date(2026, 0, i + 1),
        });
      }
    });

    test("既定は20件", async () => {
      const res = await request(app).get(ENDPOINT).set("Authorization", alice.authHeader);

      expect(res.body.data).toHaveLength(20);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 25,
        totalPages: 2,
      });
    });

    test("2ページ目は残りの5件", async () => {
      const res = await request(app)
        .get(ENDPOINT)
        .query({ page: 2 })
        .set("Authorization", alice.authHeader);

      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination.page).toBe(2);
    });

    test("limitで件数を変えられる", async () => {
      const res = await request(app)
        .get(ENDPOINT)
        .query({ limit: 5 })
        .set("Authorization", alice.authHeader);

      expect(res.body.data).toHaveLength(5);
      expect(res.body.pagination.totalPages).toBe(5);
    });

    test("limitの上限を超えると400（全件取得を防ぐ）", async () => {
      const res = await request(app)
        .get(ENDPOINT)
        .query({ limit: 1000 })
        .set("Authorization", alice.authHeader);

      expect(res.status).toBe(400);
      expect(res.body.error.details[0].field).toBe("limit");
    });

    test("pageが0以下なら400", async () => {
      const res = await request(app)
        .get(ENDPOINT)
        .query({ page: 0 })
        .set("Authorization", alice.authHeader);

      expect(res.status).toBe(400);
    });
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

    test("recordTypeで絞り込める", async () => {
      const res = await request(app)
        .get(ENDPOINT)
        .query({ recordType: "cafe" })
        .set("Authorization", alice.authHeader);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("カフェで");
    });

    test("ratingMinで絞り込める", async () => {
      const res = await request(app)
        .get(ENDPOINT)
        .query({ ratingMin: 4 })
        .set("Authorization", alice.authHeader);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].rating).toBe(5);
    });

    test("dateFrom / dateTo で期間を絞り込める", async () => {
      const res = await request(app)
        .get(ENDPOINT)
        .query({ dateFrom: "2026-05-01", dateTo: "2026-07-01" })
        .set("Authorization", alice.authHeader);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("カフェで");
    });

    test("originIdで絞り込める", async () => {
      await seedTestMasterData();
      const origin = await Origin.findOne({ normalizedName: "kenya" });
      await createRecordFor(alice.user._id, {
        title: "ケニア",
        originId: origin._id,
      });

      const res = await request(app)
        .get(ENDPOINT)
        .query({ originId: String(origin._id) })
        .set("Authorization", alice.authHeader);

      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].title).toBe("ケニア");
    });

    test("フィルターは他ユーザーの記録を含めない", async () => {
      await createRecordFor(bob.user._id, { title: "Bobのカフェ", recordType: "cafe" });

      const res = await request(app)
        .get(ENDPOINT)
        .query({ recordType: "cafe" })
        .set("Authorization", alice.authHeader);

      expect(res.body.data.map((r) => r.title)).toEqual(["カフェで"]);
    });

    test("不正なフィルター値は400", async () => {
      const res = await request(app)
        .get(ENDPOINT)
        .query({ recordType: "office" })
        .set("Authorization", alice.authHeader);

      expect(res.status).toBe(400);
    });
  });
});

// ── 詳細 ──────────────────────────────────────────────────────

describe("GET /api/coffee-records/:recordId", () => {
  test("自分の記録は取得できる", async () => {
    const record = await createRecordFor(alice.user._id, { title: "自分の記録" });

    const res = await request(app)
      .get(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe("自分の記録");
  });

  test("他ユーザーの記録は404（存在を教えない）", async () => {
    const record = await createRecordFor(bob.user._id);

    const res = await request(app)
      .get(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("存在しないIDは404", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/${NON_EXISTENT_ID}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
  });

  test("IDの形式が不正なら400（500にしない）", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/not-an-id`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("応答にuserIdを含めない", async () => {
    const record = await createRecordFor(alice.user._id);

    const res = await request(app)
      .get(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.body.data).not.toHaveProperty("userId");
    expect(res.body.data).not.toHaveProperty("_id");
  });
});

// ── 更新 ──────────────────────────────────────────────────────

describe("PATCH /api/coffee-records/:recordId", () => {
  test("自分の記録は部分更新できる", async () => {
    const record = await createRecordFor(alice.user._id, { title: "変更前", rating: 2 });

    const res = await request(app)
      .patch(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader)
      .send({ rating: 5 });

    expect(res.status).toBe(200);
    expect(res.body.data.rating).toBe(5);
    // 送っていない項目は変わらない
    expect(res.body.data.title).toBe("変更前");
  });

  test("他ユーザーの記録は更新できない", async () => {
    const record = await createRecordFor(bob.user._id, { title: "Bobの記録" });

    const res = await request(app)
      .patch(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader)
      .send({ title: "乗っ取り" });

    expect(res.status).toBe(404);

    // DBの値が変わっていないことまで確認する
    const after = await request(app)
      .get(`${ENDPOINT}/${record._id}`)
      .set("Authorization", bob.authHeader);
    expect(after.body.data.title).toBe("Bobの記録");
  });

  test("空の本文は400", async () => {
    const record = await createRecordFor(alice.user._id);

    const res = await request(app)
      .patch(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader)
      .send({});

    expect(res.status).toBe(400);
  });

  test("必須項目を空にはできない", async () => {
    const record = await createRecordFor(alice.user._id);

    const res = await request(app)
      .patch(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader)
      .send({ title: "" });

    expect(res.status).toBe(400);
  });

  test("存在しないIDは404", async () => {
    const res = await request(app)
      .patch(`${ENDPOINT}/${NON_EXISTENT_ID}`)
      .set("Authorization", alice.authHeader)
      .send({ rating: 3 });

    expect(res.status).toBe(404);
  });

  test("userIdを送っても所有者は変わらない", async () => {
    const record = await createRecordFor(alice.user._id);

    await request(app)
      .patch(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader)
      .send({ userId: String(bob.user._id), rating: 4 });

    const bobList = await request(app).get(ENDPOINT).set("Authorization", bob.authHeader);
    expect(bobList.body.data).toHaveLength(0);
  });
});

// ── 削除 ──────────────────────────────────────────────────────

describe("DELETE /api/coffee-records/:recordId", () => {
  test("自分の記録は削除できる（204）", async () => {
    const record = await createRecordFor(alice.user._id);

    const res = await request(app)
      .delete(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(204);
    expect(res.body).toEqual({});

    const after = await request(app)
      .get(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader);
    expect(after.status).toBe(404);
  });

  test("他ユーザーの記録は削除できない", async () => {
    const record = await createRecordFor(bob.user._id);

    const res = await request(app)
      .delete(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);

    // 実際に残っていることを確認する
    const stillThere = await request(app)
      .get(`${ENDPOINT}/${record._id}`)
      .set("Authorization", bob.authHeader);
    expect(stillThere.status).toBe(200);
  });

  test("存在しないIDは404", async () => {
    const res = await request(app)
      .delete(`${ENDPOINT}/${NON_EXISTENT_ID}`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
  });

  test("2回削除すると2回目は404", async () => {
    const record = await createRecordFor(alice.user._id);

    await request(app)
      .delete(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader);
    const second = await request(app)
      .delete(`${ENDPOINT}/${record._id}`)
      .set("Authorization", alice.authHeader);

    expect(second.status).toBe(404);
  });
});

// ── 一連の流れ ────────────────────────────────────────────────

describe("作成 → 詳細 → 更新 → 削除", () => {
  test("画面から行う一連の操作が通る", async () => {
    const created = await request(app)
      .post(ENDPOINT)
      .set("Authorization", alice.authHeader)
      .send(buildRecordPayload({ title: "Kenya AA", rating: 4 }));
    expect(created.status).toBe(201);

    const id = created.body.data.id;

    const detail = await request(app)
      .get(`${ENDPOINT}/${id}`)
      .set("Authorization", alice.authHeader);
    expect(detail.body.data.title).toBe("Kenya AA");

    const updated = await request(app)
      .patch(`${ENDPOINT}/${id}`)
      .set("Authorization", alice.authHeader)
      .send({ title: "Kenya AA (再訪)", rating: 5 });
    expect(updated.body.data).toMatchObject({ title: "Kenya AA (再訪)", rating: 5 });

    const removed = await request(app)
      .delete(`${ENDPOINT}/${id}`)
      .set("Authorization", alice.authHeader);
    expect(removed.status).toBe(204);

    const list = await request(app).get(ENDPOINT).set("Authorization", alice.authHeader);
    expect(list.body.data).toHaveLength(0);
  });
});

afterAll(async () => {
  // mongoose の接続が残るとJestが終了しないため念のため
  await mongoose.connection.close();
});
