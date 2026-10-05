// 「指定したVU数で止めて、その性能を観測する」ための負荷テスト。
//
// breakpoint-test.js（ramping-vusでVUを10→160まで滑らかに連続的に
// 引き上げる）は、崩れ始める"おおよその"VU帯を見つけるのには向いているが、
// VUが常に動き続けているため「VU60ちょうどでの性能」を腰を据えて
// 観測することはできない。capacity-test.jsは、各VU段階へ短時間で
// 一気に到達させたあと、そのVU数のまま一定時間（既定60秒）維持する
// 「階段状（step load）」のパターンにすることで、各レベルでの安定した
// 数値をノイズ無く観測できるようにする。
//
// 実行方法（nginx経由、3レプリカのロードバランシング込みで見る場合）:
//   docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm \
//     k6 run -o experimental-prometheus-rw /scripts/capacity-test.js
//
// 単一backendへ直接負荷をかけて観測したい場合（breakpoint-test.jsで
// 見つかったVU45〜58付近の崩れ始めを、ロードバランシングを外して
// 再確認する例）:
//   docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm \
//     -e BASE_URL=http://backend1:5001/api \
//     k6 run -o experimental-prometheus-rw /scripts/capacity-test.js
//
// 観測したいVUの段階・維持時間は環境変数で変更できる
// （smoke-test.jsのVUS/DURATIONと同じ考え方。ファイルをコピーせずに
// 済むようにするため）:
//   STEPS=20,40,60,80,100         … カンマ区切りでVU数を指定（既定は下記）
//   HOLD_DURATION=90s             … 各VUを維持する時間（既定60秒）
//   RAMP_DURATION=5s              … 次のVU数へ到達するまでの時間（既定5秒）
//
// 例: VU45〜58付近だけを細かく見たい場合
//   docker compose -f docker-compose.prod.yml --env-file .env.prod run --rm \
//     -e BASE_URL=http://backend1:5001/api \
//     -e STEPS=40,45,50,55,58,65 -e HOLD_DURATION=45s \
//     k6 run -o experimental-prometheus-rw /scripts/capacity-test.js
//
// 見るべき場所（Grafanaの「k6 Load Test」ダッシュボード、またはPrometheusへの
// 直接クエリ）: 各VU段階の後半（維持時間の終わり側、立ち上がりのノイズが
// 収まった頃）のp99 Latencyを比較する。段階ごとにVUが一定のため、
// breakpoint-test.jsより「このVU数では何msだったか」が読み取りやすい。
import http from "k6/http";
import { check, sleep } from "k6";

const BASE_URL = __ENV.BASE_URL || "http://backend:5001/api";
const DEMO_EMAIL = __ENV.DEMO_EMAIL || "demo@coffee-app.example";
const DEMO_PASSWORD = __ENV.DEMO_PASSWORD || "coffeedemo123";

const STEPS = (__ENV.STEPS || "10,20,30,40,50,60,80,100,120,140,160")
  .split(",")
  .map(Number);
const HOLD_DURATION = __ENV.HOLD_DURATION || "60s";
const RAMP_DURATION = __ENV.RAMP_DURATION || "5s";

// ramping-vusのstagesは「前の段階の到達VU数から、今回のtargetまで
// durationをかけて直線的に変化する」という意味を持つ。同じtargetを
// 連続させると後半は変化が無い＝その数値のまま維持される。これを
// 利用して「短いRAMP_DURATIONで一気に到達→長いHOLD_DURATIONで維持」
// という段差を各VUごとに積み重ねる。
function buildStages() {
  const stages = [];
  for (const target of STEPS) {
    stages.push({ duration: RAMP_DURATION, target });
    stages.push({ duration: HOLD_DURATION, target });
  }
  return stages;
}

export const options = {
  scenarios: {
    capacity: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: buildStages(),
    },
  },
};

// breakpoint-test.js・smoke-test.jsと同じ理由（ブルートフォース対策の
// レート制限を使い切らないため）で、ログインはsetup()で1回だけ行う。
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
