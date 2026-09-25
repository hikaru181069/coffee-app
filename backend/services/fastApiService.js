/**
 * FastAPIサービス（DBに依存しない計算処理）を呼び出すための薄いクライアント。
 *
 * docs/architecture.mdの構成（React → Express → FastAPI → Express → React）
 * 通り、フロントエンドから直接FastAPIを呼ぶことはない。呼び出すのは
 * このファイルだけに集約し、URLの組み立てやタイムアウトの扱いを
 * 呼び出し元（services/coffee/graphService.js）に漏らさない。
 *
 * FastAPIは「あれば嬉しい追加の計算」を担う補助サービスであり、
 * 落ちていても記録のCRUDやグラフ本体の表示は壊れてはいけない
 * （docs/features.md「Graph Communities」参照）。そのため、失敗時は
 * 例外を投げるだけに留め、「エラーを握りつぶさず、かつ呼び出し元が
 * 握りつぶすかどうかを選べる」形にしている。
 */

const FASTAPI_URL = process.env.FASTAPI_URL;

// 「あれば嬉しい」計算のために記録一覧のリクエストを長時間待たせないための
// 上限。ヘルスチェックのstart-period(5秒)より少し長い程度に留める。
const REQUEST_TIMEOUT_MS = 5000;

/**
 * 知識グラフのコミュニティ検出をFastAPIへ依頼する。
 *
 * @param {Array<{id: string, type: string, label: string}>} nodes
 * @param {Array<{source: string, target: string}>} edges
 * @returns {Promise<{communities: Array}>}
 */
export const detectGraphCommunities = async (nodes, edges) => {
  const response = await fetch(`${FASTAPI_URL}/graph/communities`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nodes, edges }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new Error(`FastAPI /graph/communities returned ${response.status}`);
  }

  return response.json();
};
