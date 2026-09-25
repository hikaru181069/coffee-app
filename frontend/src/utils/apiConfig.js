// 空文字（VITE_API_URL=""）は「同じオリジンへの相対パスを使う」という意図的な
// 設定（本番のnginxリバースプロキシ構成、docker-compose.prod.yml参照）。
// `||`だと空文字も偽値としてフォールバックしてしまうため、「未設定
// （undefined）のときだけ既定値を使う」`??`にする。
export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5001";
