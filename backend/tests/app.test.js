/**
 * app.js のHTTPレベルのテスト。
 *
 * supertestを使うと、実際にポートを開いたりDBに繋いだりせずに、
 * Expressのapp自体に対して疑似的なHTTPリクエストを送って
 * レスポンス(ステータスコード・JSON)を検証できる。
 *
 * ここでは「DB・外部APIに一切アクセスしないパターン」だけを
 * テスト対象にしている(バリデーションで即座に弾かれるルート、
 * 404ハンドラ)。実際にMongoDBやMLB APIを呼ぶルートのテストは、
 * モックやテスト用DBが必要になるため今後の課題とする。
 */

const request = require("supertest");
const app = require("../app");

describe("GET /api/positions/:position", () => {
  test("無効なポジションを指定すると400を返す(DB/外部APIには到達しない)", async () => {
    const res = await request(app).get("/api/positions/XX");

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/Invalid position/);
  });
});

describe("未定義のルート", () => {
  test("存在しないパスには404とJSONメッセージを返す", async () => {
    const res = await request(app).get("/api/this-route-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ message: "Route not found" });
  });
});
