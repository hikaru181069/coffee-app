/**
 * utils/AppError.js のユニットテスト。
 *
 * 各生成関数がcode/statusCode/messageの対応表として正しく機能しているかを
 * 確かめる。誤って対応がずれると、docs/api.md のステータスコード表と
 * errorHandler.jsの応答が食い違う。
 */

import {
  AppError,
  validationError,
  unauthorizedError,
  forbiddenError,
  notFoundError,
  conflictError,
  invalidCredentialsError,
  invalidCurrentPasswordError,
} from "../utils/AppError.js";

describe("AppError", () => {
  test("code・statusCode・message・detailsを保持する", () => {
    const error = new AppError("VALIDATION_ERROR", 400, "入力内容を確認してください", [
      { field: "name", message: "必須です" },
    ]);

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe("AppError");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.statusCode).toBe(400);
    expect(error.message).toBe("入力内容を確認してください");
    expect(error.details).toEqual([{ field: "name", message: "必須です" }]);
  });

  test("detailsを省略すると空配列になる", () => {
    const error = new AppError("NOT_FOUND", 404, "対象が見つかりません");
    expect(error.details).toEqual([]);
  });
});

describe("生成関数のcode・statusCode対応", () => {
  test.each([
    [validationError, "VALIDATION_ERROR", 400],
    [unauthorizedError, "UNAUTHORIZED", 401],
    [forbiddenError, "FORBIDDEN", 403],
    [notFoundError, "NOT_FOUND", 404],
    [conflictError, "CONFLICT", 409],
    [invalidCredentialsError, "INVALID_CREDENTIALS", 401],
    [invalidCurrentPasswordError, "INVALID_CURRENT_PASSWORD", 400],
  ])("%p は code=%s, statusCode=%i を持つAppErrorを作る", (factory, code, statusCode) => {
    const error = factory();

    expect(error).toBeInstanceOf(AppError);
    expect(error.code).toBe(code);
    expect(error.statusCode).toBe(statusCode);
  });

  test("validationErrorはdetailsをそのまま渡せる", () => {
    const details = [{ field: "email", message: "形式が正しくありません" }];
    expect(validationError(details).details).toBe(details);
  });

  test("メッセージを省略すると既定文言になる", () => {
    expect(notFoundError().message).toBe("対象が見つかりません");
  });

  test("メッセージを渡すと既定文言を上書きできる", () => {
    expect(notFoundError("記録が見つかりません").message).toBe("記録が見つかりません");
  });
});
