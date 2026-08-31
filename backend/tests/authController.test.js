/**
 * /api/auth の HTTPレベルのテスト。
 *
 * register/loginはアプリの入口であり、これまで直接のテストが
 * 無かった（他APIのテストで401ケースが間接的に確認されているのみ）。
 * ここでは正常系に加えて、authValidator.jsで追加した入力検証と、
 * パスワードがUser.js（pre-saveフック）で正しくハッシュ化されることを
 * 中心に確認する。
 */

import request from "supertest";
import bcrypt from "bcryptjs";
import { jest } from "@jest/globals";

import app from "../app.js";
import User from "../models/User.js";
import { connectTestDb, closeTestDb, clearTestDb } from "./helpers/testDb.js";

const REGISTER = "/api/auth/register";
const LOGIN = "/api/auth/login";

beforeAll(connectTestDb);
afterAll(closeTestDb);
beforeEach(clearTestDb);

describe("POST /api/auth/register", () => {
  test("正しい入力で登録でき、パスワード以外の情報とtokenが返る", async () => {
    const res = await request(app).post(REGISTER).send({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Alice", email: "alice@example.com" });
    expect(res.body.password).toBeUndefined();
    expect(typeof res.body.token).toBe("string");
  });

  test("パスワードは平文で保存されず、ハッシュ化される", async () => {
    await request(app).post(REGISTER).send({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });

    const stored = await User.findOne({ email: "alice@example.com" });
    expect(stored.password).not.toBe("password123");
    await expect(bcrypt.compare("password123", stored.password)).resolves.toBe(true);
  });

  test("既に登録済みのメールアドレスは400", async () => {
    await request(app).post(REGISTER).send({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });

    const res = await request(app).post(REGISTER).send({
      name: "Alice2",
      email: "alice@example.com",
      password: "password456",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("User already exists");
  });

  test("大文字小文字が違うだけの同じメールアドレスも400（別アカウントにならない）", async () => {
    await request(app).post(REGISTER).send({
      name: "Alice",
      email: "Alice@Example.com",
      password: "password123",
    });

    const res = await request(app).post(REGISTER).send({
      name: "Alice2",
      email: "alice@example.com",
      password: "password456",
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toBe("User already exists");
  });

  test("保存されるemailは小文字に正規化される", async () => {
    const res = await request(app).post(REGISTER).send({
      name: "Alice",
      email: "Alice@Example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe("alice@example.com");
  });

  test.each([
    ["nameが空", { name: "", email: "alice@example.com", password: "password123" }, "name"],
    ["emailが未指定", { name: "Alice", password: "password123" }, "email"],
    ["emailの形式が不正", { name: "Alice", email: "not-an-email", password: "password123" }, "email"],
    ["passwordが短すぎる", { name: "Alice", email: "alice@example.com", password: "abc" }, "password"],
  ])("%s なら400とdetailsを返す", async (_label, body, expectedField) => {
    const res = await request(app).post(REGISTER).send(body);

    expect(res.status).toBe(400);
    expect(res.body.details.some((detail) => detail.field === expectedField)).toBe(true);
  });
});

describe("POST /api/auth/login", () => {
  beforeEach(async () => {
    await request(app).post(REGISTER).send({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });
  });

  test("正しいメールアドレス・パスワードでログインできる", async () => {
    const res = await request(app).post(LOGIN).send({
      email: "alice@example.com",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: "Alice", email: "alice@example.com" });
    expect(typeof res.body.token).toBe("string");
  });

  test("存在しないメールアドレスは401", async () => {
    const res = await request(app).post(LOGIN).send({
      email: "nobody@example.com",
      password: "password123",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  test("存在しないメールアドレスでも必ずbcrypt.compareを実行する（タイミングサイドチャネル対策）", async () => {
    // ユーザーの有無で処理時間が変わらないようにするための修正。
    // 実際の時間差ではなく「compareが呼ばれたか」で振る舞いを確認する
    // （時間ベースのテストはCI環境の負荷でフレーキーになりやすいため）
    const compareSpy = jest.spyOn(bcrypt, "compare");

    await request(app).post(LOGIN).send({
      email: "nobody@example.com",
      password: "password123",
    });

    expect(compareSpy).toHaveBeenCalledTimes(1);
    compareSpy.mockRestore();
  });

  test("間違ったパスワードは401", async () => {
    const res = await request(app).post(LOGIN).send({
      email: "alice@example.com",
      password: "wrong-password",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  test("emailかpasswordが未指定なら400", async () => {
    const res = await request(app).post(LOGIN).send({ email: "alice@example.com" });

    expect(res.status).toBe(400);
    expect(res.body.details.some((detail) => detail.field === "password")).toBe(true);
  });

  test("登録時と大文字小文字が違うメールアドレスでもログインできる", async () => {
    const res = await request(app).post(LOGIN).send({
      email: "ALICE@EXAMPLE.COM",
      password: "password123",
    });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("alice@example.com");
  });

  test("emailにMongo演算子オブジェクトを送ってもNoSQLインジェクションにならず400", async () => {
    // { $ne: null } 等が User.findOne({ email }) へ素通りすると、
    // メールアドレスの登録有無を推測できてしまう（enumeration）。
    // 200（ログイン成功）にも500（Mongooseのキャストエラー漏れ）にも
    // ならず、validateLoginの型チェックで400になることを確認する。
    const res = await request(app)
      .post(LOGIN)
      .send({ email: { $ne: null }, password: "password123" });

    expect(res.status).toBe(400);
    expect(res.body.details.some((detail) => detail.field === "email")).toBe(true);
  });
});
