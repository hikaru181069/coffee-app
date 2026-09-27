/**
 * Prometheusが `GET /metrics` でスクレイピングするためのメトリクス収集。
 *
 * `prom-client`はnpm上で非推奨化され、Prometheus公式が同じAPIのまま
 * `@prometheus-io/client`として引き継いでいる（`prom-client`のREADME・
 * npm view時の非推奨メッセージで明記）。新規実装のため後継の方を使う。
 *
 * 自前のRegistryを使う（既定のグローバルレジストリを使うと、テスト等で
 * モジュールが複数回読み込まれたときに値が混ざる可能性があるため）。
 */
import client from "@prometheus-io/client";

export const register = new client.Registry();

// イベントループ遅延・メモリ・GC等、Node.jsプロセスの標準的な状態を
// prom-clientの既定メトリクスとしてまとめて収集する。
client.collectDefaultMetrics({ register });

// HTTPリクエストの件数・レイテンシ。エンドポイントごとの傾向を見るための
// 最小限の1本（MVPに不要な詳細ラベルは持たない）。
export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "HTTP request duration in seconds",
  labelNames: ["method", "route", "status_code"],
  registers: [register],
});

/**
 * 全リクエストの所要時間を計測するミドルウェア。app.jsでルート登録より
 * 前に使う（404・エラーレスポンスも含めて計測するため）。
 *
 * routeラベルは`req.route.path`（例: "/api/coffee-records/:recordId"）を
 * 使う。マッチするルートが無かったリクエスト（404）は`req.route`が
 * 存在しないため、生の`req.path`ではなく固定文字列にフォールバックする。
 * 生のパスをラベルに使うと、存在しないURLを次々叩かれた場合に
 * ラベルの組み合わせ（カーディナリティ）が際限なく増えてしまうため。
 */
export const metricsMiddleware = (req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path ?? "unmatched",
      status_code: res.statusCode,
    });
  });
  next();
};
