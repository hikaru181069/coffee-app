// 「どのくらいの負荷から性能が崩れ始めるか」を探すためのテスト。
// smoke-test.js（一定の軽い負荷を維持する）とは目的が異なるため、
// 別ファイルにしている。
//
// 実行方法（開発用スタックが起動している前提。先にGrafanaのダッシュボード
// http://localhost:3000/d/k6-load-test を開いておくと、崩れ始める瞬間を
// リアルタイムに見られる）:
//   docker compose run --rm k6 run -o experimental-prometheus-rw /scripts/breakpoint-test.js
//
// 仮想ユーザー数（VU）を30秒おきに10→20→40→80→160と倍々に引き上げ、
// 最後に0まで戻す（ramping-vus executor）。smoke-test.jsのような
// 「rate<0.01ならOK」という合否判定はしない。意図的に崩れる様子を
// 見るためのテストなので、途中で失敗扱いになっても問題ない。
//
// 見るべき場所（Grafanaの「k6 Load Test」ダッシュボード）:
//   - Error Rate: 0%から上がり始めた段階が最初の兆候
//   - p99 Latency: 急に跳ね上がり始めた段階
//   - Requests per second: VUを増やしているのに頭打ち・下がり始めたら、
//     backend側がそれ以上さばけていない証拠
// 「coffee-app-overview」ダッシュボードのBackend Memoryも同時に見ると、
// メモリ増加が性能劣化の原因になっていないかも確認できる。
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://backend:5001/api";
const DEMO_EMAIL = __ENV.DEMO_EMAIL || "demo@coffee-app.example";
const DEMO_PASSWORD = __ENV.DEMO_PASSWORD || "coffeedemo123";

export const options = {
  scenarios: {
    breakpoint: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "30s", target: 20 },
        { duration: "30s", target: 40 },
        { duration: "30s", target: 80 },
        { duration: "30s", target: 160 },
        { duration: "30s", target: 0 },
      ],
    },
  },
};

// smoke-test.jsと同じ理由（ブルートフォース対策のレート制限を
// 使い切らないため）で、ログインはsetup()で1回だけ行う。
// VU数が最大160まで増えても、setup()自体は1回しか実行されない。
export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email: DEMO_EMAIL, password: DEMO_PASSWORD }),
    { headers: { "Content-Type": "application/json" } },
  );
  check(loginRes, { "login succeeded": (r) => r.status === 200 });
  return { token: loginRes.json("token") };
}

export default function (data) {
  const headers = { Authorization: `Bearer ${data.token}` };

  const responses = http.batch([
    ["GET", `${BASE_URL}/coffee-records`, null, { headers }],
    ["GET", `${BASE_URL}/graph`, null, { headers }],
    ["GET", `${BASE_URL}/stats`, null, { headers }],
    ["GET", `${BASE_URL}/master-data`, null, { headers }],
  ]);

  for (const res of responses) {
    check(res, { "status is 200": (r) => r.status === 200 });
  }

  sleep(1);
}
