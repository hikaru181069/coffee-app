// coffee-appの主要な閲覧フロー（記録一覧→知識グラフ→統計→マスター
// データ）を模した負荷テスト。
//
// 実行方法（開発用スタックが起動している前提）:
//   docker compose run --rm k6 run -o experimental-prometheus-rw /scripts/smoke-test.js
//
// 結果はPrometheusへリアルタイムで送られる（-o experimental-prometheus-rw、
// docker-compose.ymlのk6サービスの環境変数参照）。Grafanaの「k6 Load Test」
// ダッシュボード（monitoring/grafana/provisioning/dashboards/k6-load-test.json）
// で、負荷をかけている間の様子をリアルタイムに見られる。
// 「coffee-app-overview」ダッシュボードのBackend Memory・Request Rateと
// 見比べると、負荷がbackend側にどう跳ね返るかも同時に確認できる。
import http from "k6/http";
import { check, sleep } from "k6";

// dev/prod（本番相当のローカル再現）でAPIの入口が違う
// （dev: backendコンテナへ直接、prod: nginxのリバースプロキシ経由）ため、
// docker-composeのenvironmentから受け取る。
const BASE_URL = __ENV.BASE_URL || "http://backend:5001/api";
const DEMO_EMAIL = __ENV.DEMO_EMAIL || "demo@coffee-app.example";
const DEMO_PASSWORD = __ENV.DEMO_PASSWORD || "coffeedemo123";

// 仮想ユーザー数・実行時間も同様に環境変数で変えられるようにする。
// 「もっと負荷をかけたい」ときにファイルをコピーせず、
// 例: docker compose run --rm -e VUS=20 k6 run -o experimental-prometheus-rw /scripts/smoke-test.js
// のようにコマンドだけで済ませるため。
const VUS = Number(__ENV.VUS) || 5;
const DURATION = __ENV.DURATION || "30s";

// 「多人数で一気に叩く」ことより「実際に使われている状態を再現し続ける」
// ことを目的にした軽めの設定（stress testではなくsmoke/load test）。
export const options = {
  scenarios: {
    browsing: {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
  },
};

/**
 * ログインはテスト開始時に1回だけ行う（VU・イテレーションごとに毎回
 * ログインし直さない）。実際のユーザーは一度ログインしたらそのまま
 * セッション（JWT）を使い続けるため、これが実際のブラウジング負荷に
 * 近い。
 *
 * 2026-09、最初の実装ではdefault関数の中で毎回ログインしていたところ、
 * ログイン失敗時にsleep()を通らず即座に次のイテレーションへ入る
 * バグを踏み、backendのブルートフォース対策レート制限
 * （backend/middleware/rateLimiter.js、15分10回まで）を数百ミリ秒で
 * 使い切ってしまい、以降ほぼ全リクエストが429になる不具合を実機で
 * 確認した。setup()で1回だけログインする形に直して解消した。
 */
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
