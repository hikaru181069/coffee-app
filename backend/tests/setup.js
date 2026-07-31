/**
 * Jest の setupFiles から読み込まれる。テスト本体より前に実行される。
 *
 * backend/.env はコミットしないため、CI には存在しない。
 * app.js は import "dotenv/config" を実行するが、ファイルが無ければ
 * 何も読み込まれず JWT_SECRET が undefined になり、
 * jwt.sign が実行時に落ちる。
 *
 * そこで、未設定のときだけテスト用の値を入れる。
 * ローカルで .env がある場合はそちらを優先する（|| 代入ではなく
 * 明示的な undefined チェックにしている理由）。
 */
if (process.env.JWT_SECRET === undefined) {
  process.env.JWT_SECRET = "test-only-secret-not-used-in-production";
}

// テストはインメモリDBへ接続するので、実DBのURIを誤って掴まないようにする
delete process.env.MONGO_URI;
