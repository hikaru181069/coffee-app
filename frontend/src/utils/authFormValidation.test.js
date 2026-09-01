import { describe, expect, test } from "vitest";
import { validateLoginForm, validateRegisterForm, hasErrors } from "./authFormValidation";

// 翻訳キーをそのまま返す最小限のスタブ
const t = (key) => key;

describe("validateLoginForm", () => {
  test("email/passwordが両方あればエラー無し", () => {
    expect(validateLoginForm({ email: "a@b.com", password: "secret" }, t)).toEqual({});
  });

  test("emailが空・空白のみならエラー", () => {
    expect(validateLoginForm({ email: "", password: "secret" }, t).email).toBe("validation.emailRequired");
    expect(validateLoginForm({ email: "   ", password: "secret" }, t).email).toBe("validation.emailRequired");
  });

  test("passwordが空ならエラー", () => {
    expect(validateLoginForm({ email: "a@b.com", password: "" }, t).password).toBe(
      "validation.passwordRequired",
    );
  });

  test("両方空なら両方のエラーを同時に返す", () => {
    const errors = validateLoginForm({ email: "", password: "" }, t);
    expect(Object.keys(errors).sort()).toEqual(["email", "password"]);
  });
});

describe("validateRegisterForm", () => {
  test("すべて入力されていればエラー無し", () => {
    expect(validateRegisterForm({ name: "Alice", email: "a@b.com", password: "secret" }, t)).toEqual({});
  });

  test("nameが空・空白のみならエラー", () => {
    expect(
      validateRegisterForm({ name: "", email: "a@b.com", password: "secret" }, t).name,
    ).toBe("validation.nameRequired");
    expect(
      validateRegisterForm({ name: "   ", email: "a@b.com", password: "secret" }, t).name,
    ).toBe("validation.nameRequired");
  });

  test("複数項目が空なら複数エラーを同時に返す", () => {
    const errors = validateRegisterForm({ name: "", email: "", password: "" }, t);
    expect(Object.keys(errors).sort()).toEqual(["email", "name", "password"]);
  });
});

describe("hasErrors", () => {
  test("空オブジェクトはfalse", () => {
    expect(hasErrors({})).toBe(false);
  });

  test("1件でもキーがあればtrue", () => {
    expect(hasErrors({ email: "required" })).toBe(true);
  });
});
