/**
 * validators/authValidator.js のユニットテスト。
 *
 * validateLoginはHTTP境界の門番。email/passwordがオブジェクト・配列の
 * まま素通りすると、authController.jsのUser.findOne({ email })へ
 * Mongoの演算子として渡ってしまう（NoSQLインジェクション）。
 */

import { validateRegister, validateLogin } from "../validators/authValidator.js";

const fieldsOf = (result) => result.details.map((detail) => detail.field).sort();

describe("validateLogin", () => {
  test("正しいemail・passwordなら通る", () => {
    expect(validateLogin({ email: "alice@example.com", password: "password123" }).valid).toBe(
      true,
    );
  });

  test("emailかpasswordが未指定なら400相当のdetailsを返す", () => {
    const result = validateLogin({});

    expect(result.valid).toBe(false);
    expect(fieldsOf(result)).toEqual(["email", "password"]);
  });

  test.each([
    ["オブジェクト", { $ne: null }],
    ["配列", ["a@example.com"]],
    ["数値", 12345],
    ["真偽値", true],
  ])("emailが%s型のときは拒否する（NoSQLインジェクション対策）", (_label, email) => {
    const result = validateLogin({ email, password: "password123" });

    expect(result.valid).toBe(false);
    expect(fieldsOf(result)).toContain("email");
  });

  test.each([
    ["オブジェクト", { $ne: null }],
    ["配列", ["a"]],
    ["数値", 12345],
  ])("passwordが%s型のときは拒否する", (_label, password) => {
    const result = validateLogin({ email: "alice@example.com", password });

    expect(result.valid).toBe(false);
    expect(fieldsOf(result)).toContain("password");
  });
});

describe("validateRegister", () => {
  test("正しい入力なら通る", () => {
    const result = validateRegister({
      name: "Alice",
      email: "alice@example.com",
      password: "password123",
    });

    expect(result.valid).toBe(true);
  });

  test("emailがオブジェクトなら拒否する（既存の型チェックの回帰確認）", () => {
    const result = validateRegister({
      name: "Alice",
      email: { $ne: null },
      password: "password123",
    });

    expect(result.valid).toBe(false);
    expect(fieldsOf(result)).toContain("email");
  });
});
