/**
 * /api/master-data の HTTPレベルのテスト。
 *
 * 記録フォームの選択肢を供給するAPI。
 * ここが壊れると記録作成の画面が組み立てられない。
 */

import request from "supertest";
import mongoose from "mongoose";

import app from "../app.js";
import {
  connectTestDb,
  closeTestDb,
  clearTestDb,
  createTestUser,
  seedTestMasterData,
} from "./helpers/testDb.js";

const ENDPOINT = "/api/master-data";

let alice;

beforeAll(connectTestDb);
afterAll(closeTestDb);

beforeEach(async () => {
  await clearTestDb();
  alice = await createTestUser();
  await seedTestMasterData();
});

describe("認証", () => {
  test("トークン無しは401", async () => {
    const res = await request(app).get(ENDPOINT);

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("UNAUTHORIZED");
  });
});

describe("GET /api/master-data", () => {
  test("5種類すべてをまとめて返す", async () => {
    const res = await request(app).get(ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.status).toBe(200);
    expect(Object.keys(res.body.data).sort()).toEqual([
      "flavors",
      "origins",
      "processes",
      "roastLevels",
      "varieties",
    ]);
    expect(res.body.data.origins.length).toBeGreaterThan(0);
  });
});

describe("GET /api/master-data/:type", () => {
  test.each(["origins", "varieties", "processes", "roastLevels", "flavors"])(
    "%s を取得できる",
    async (type) => {
      const res = await request(app)
        .get(`${ENDPOINT}/${type}`)
        .set("Authorization", alice.authHeader);

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBeGreaterThan(0);
    },
  );

  test("存在しない種別は404", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/coffee-machines`)
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  test("焙煎度は order 順に返る", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/roastLevels`)
      .set("Authorization", alice.authHeader);

    expect(res.body.data.map((r) => r.key)).toEqual([
      "light",
      "medium-light",
      "medium",
      "medium-dark",
      "dark",
    ]);
  });

  test("内部項目を応答へ含めない", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/origins`)
      .query({ limit: 1 })
      .set("Authorization", alice.authHeader);

    const origin = res.body.data[0];

    // id に統一し、_id / __v / normalizedName は外へ出さない
    expect(Object.keys(origin).sort()).toEqual(["countryCode", "id", "name"]);
    expect(origin.id).toMatch(/^[0-9a-f]{24}$/);
  });

  test("種別ごとに必要な項目だけを返す", async () => {
    const flavors = await request(app)
      .get(`${ENDPOINT}/flavors`)
      .query({ limit: 1 })
      .set("Authorization", alice.authHeader);
    expect(Object.keys(flavors.body.data[0]).sort()).toEqual(["category", "id", "name"]);

    const roasts = await request(app)
      .get(`${ENDPOINT}/roastLevels`)
      .query({ limit: 1 })
      .set("Authorization", alice.authHeader);
    expect(Object.keys(roasts.body.data[0]).sort()).toEqual([
      "id",
      "key",
      "name",
      "order",
    ]);

    const varieties = await request(app)
      .get(`${ENDPOINT}/varieties`)
      .query({ limit: 1 })
      .set("Authorization", alice.authHeader);
    expect(Object.keys(varieties.body.data[0]).sort()).toEqual(["id", "name"]);
  });

  test("まとめ取得でも同じ形式で返る", async () => {
    const res = await request(app).get(ENDPOINT).set("Authorization", alice.authHeader);

    expect(res.body.data.origins[0]).toHaveProperty("id");
    expect(res.body.data.origins[0]).not.toHaveProperty("normalizedName");
  });

  test("searchで部分一致検索できる", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/origins`)
      .query({ search: "eth" })
      .set("Authorization", alice.authHeader);

    expect(res.body.data.map((o) => o.name)).toEqual(["Ethiopia"]);
  });

  test("searchは大文字小文字を区別しない", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/origins`)
      .query({ search: "ETHIOPIA" })
      .set("Authorization", alice.authHeader);

    expect(res.body.data).toHaveLength(1);
  });

  test("正規表現の特殊文字は文字として扱う（クエリに素通ししない）", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/origins`)
      .query({ search: ".*" })
      .set("Authorization", alice.authHeader);

    // エスケープされていれば ".*" という名前の産地は無いので0件。
    // 素通ししていると全件返ってしまう
    expect(res.body.data).toHaveLength(0);
  });

  test("limitで件数を制限できる", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/flavors`)
      .query({ limit: 3 })
      .set("Authorization", alice.authHeader);

    expect(res.body.data).toHaveLength(3);
  });

  test("limitが範囲外なら400", async () => {
    const res = await request(app)
      .get(`${ENDPOINT}/flavors`)
      .query({ limit: 999 })
      .set("Authorization", alice.authHeader);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  test("マスターの作成APIは公開していない", async () => {
    const res = await request(app)
      .post(`${ENDPOINT}/origins`)
      .set("Authorization", alice.authHeader)
      .send({ name: "Atlantis" });

    // ルートが無いので既存の404ハンドラに落ちる
    expect(res.status).toBe(404);
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});
