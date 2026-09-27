/**
 * app.js のHTTPレベルのテスト。
 *
 * supertestを使うと、実際にポートを開いたりDBに繋いだりせずに、
 * Expressのapp自体に対して疑似的なHTTPリクエストを送って
 * レスポンス(ステータスコード・JSON)を検証できる。
 *
 * ここでは「DB接続不要で確認できるパターン」だけを対象にしている
 * （404ハンドラ）。認証やDBアクセスを伴うルートのテストは、
 * tests/coffeeRecordApi.test.js 等でmongodb-memory-serverを使って行う。
 */

import request from "supertest";
import app from "../app.js";

describe("未定義のルート", () => {
  test("存在しないパスには404とJSONメッセージを返す", async () => {
    const res = await request(app).get("/api/this-route-does-not-exist");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "リクエストされたエンドポイントは存在しません",
        details: [],
      },
    });
  });
});

describe("GET /metrics", () => {
  test("Prometheus形式のテキストを返す", async () => {
    const res = await request(app).get("/metrics");

    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("text/plain");
    expect(res.text).toContain("http_request_duration_seconds");
  });

  test("404になったリクエストもrouteラベルをunmatchedとして計測する", async () => {
    await request(app).get("/api/this-route-does-not-exist-for-metrics-test");

    const res = await request(app).get("/metrics");

    expect(res.text).toContain('route="unmatched"');
  });
});
