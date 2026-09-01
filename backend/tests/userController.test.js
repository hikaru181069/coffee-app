/**
 * /api/users の HTTPレベルのテスト。
 *
 * プロフィール更新・パスワード変更・退会は、これまで直接のテストが
 * 無かった。特にパスワード変更は、User.js（pre-saveフック）が
 * 二重ハッシュ化していないことの確認を兼ねる
 * （もし二重にハッシュしていたら、変更後のパスワードでログインできなくなる）。
 */

import request from "supertest";

import app from "../app.js";
import CoffeeRecord from "../models/CoffeeRecord.js";
import { connectTestDb, closeTestDb, clearTestDb, createRecordFor } from "./helpers/testDb.js";

const REGISTER = "/api/auth/register";
const LOGIN = "/api/auth/login";
const ME = "/api/users/me";

beforeAll(connectTestDb);
afterAll(closeTestDb);
beforeEach(clearTestDb);

/** register APIを経由して、実際のパスワードでログインできるユーザーを作る */
const registerUser = async (overrides = {}) => {
  const res = await request(app).post(REGISTER).send({
    name: "Alice",
    email: "alice@example.com",
    password: "password123",
    ...overrides,
  });
  return { userId: res.body._id, authHeader: `Bearer ${res.body.token}` };
};

describe("認証", () => {
  test("トークン無しでの/api/users/meは401", async () => {
    const res = await request(app).get(ME);
    expect(res.status).toBe(401);
  });
});

describe("GET /api/users/me", () => {
  test("自分の情報（パスワードを除く）を返す", async () => {
    const { authHeader } = await registerUser();

    const res = await request(app).get(ME).set("Authorization", authHeader);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Alice", email: "alice@example.com" });
    expect(res.body.password).toBeUndefined();
  });
});

describe("PATCH /api/users/me", () => {
  test("nameを更新できる", async () => {
    const { authHeader } = await registerUser();

    const res = await request(app)
      .patch(ME)
      .set("Authorization", authHeader)
      .send({ name: "Alice Updated" });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe("Alice Updated");
  });

  test("nameが空なら400", async () => {
    const { authHeader } = await registerUser();

    const res = await request(app).patch(ME).set("Authorization", authHeader).send({ name: "  " });

    expect(res.status).toBe(400);
  });
});

describe("PATCH /api/users/me/password", () => {
  test("正しい現在のパスワードなら変更でき、新パスワードでログインできる", async () => {
    const { authHeader } = await registerUser();

    const res = await request(app)
      .patch(`${ME}/password`)
      .set("Authorization", authHeader)
      .send({ currentPassword: "password123", newPassword: "newpassword456" });

    expect(res.status).toBe(200);

    // 新パスワードでログインできる（＝二重ハッシュ化されていない）
    const loginRes = await request(app)
      .post(LOGIN)
      .send({ email: "alice@example.com", password: "newpassword456" });
    expect(loginRes.status).toBe(200);

    // 旧パスワードではログインできない
    const oldLoginRes = await request(app)
      .post(LOGIN)
      .send({ email: "alice@example.com", password: "password123" });
    expect(oldLoginRes.status).toBe(401);
  });

  test("現在のパスワードが間違っていれば400（トークン失効の401とは区別する）", async () => {
    const { authHeader } = await registerUser();

    const res = await request(app)
      .patch(`${ME}/password`)
      .set("Authorization", authHeader)
      .send({ currentPassword: "wrong-password", newPassword: "newpassword456" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_CURRENT_PASSWORD");
  });

  test("新パスワードが短すぎれば400", async () => {
    const { authHeader } = await registerUser();

    const res = await request(app)
      .patch(`${ME}/password`)
      .set("Authorization", authHeader)
      .send({ currentPassword: "password123", newPassword: "short" });

    expect(res.status).toBe(400);
  });

  test("newPasswordが文字列でなければ400（オブジェクトを送っても落ちない）", async () => {
    const { authHeader } = await registerUser();

    const res = await request(app)
      .patch(`${ME}/password`)
      .set("Authorization", authHeader)
      .send({ currentPassword: "password123", newPassword: { $ne: null } });

    expect(res.status).toBe(400);
  });
});

describe("DELETE /api/users/me", () => {
  test("アカウントと自分の記録が削除され、以後トークンが使えなくなる", async () => {
    const { userId, authHeader } = await registerUser();
    await createRecordFor(userId);

    const res = await request(app).delete(ME).set("Authorization", authHeader);
    expect(res.status).toBe(200);

    const remainingRecords = await CoffeeRecord.find({ userId });
    expect(remainingRecords).toHaveLength(0);

    const meRes = await request(app).get(ME).set("Authorization", authHeader);
    expect(meRes.status).toBe(401);
  });
});
