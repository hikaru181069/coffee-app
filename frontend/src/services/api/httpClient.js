import { API_URL } from "../../utils/apiConfig";
import { getAuthToken, handleUnauthorized } from "../../utils/authStorage";

/**
 * coffee-app のAPIを呼ぶための共通クライアント。
 *
 * 既存の services/api/*.js は、各関数が fetch とエラー処理を
 * 自前で書いていて、同じコードが16ファイルに重複していた。
 * さらに coffee-app のAPIは docs/architecture.md のエラー形式
 *   { error: { code, message, details } }
 * を返すため、旧来の { message } 前提の処理では details（項目ごとの
 * 理由）を拾えない。
 *
 * そこで、認証ヘッダの付与とエラー形式の解釈をここへ集約する。
 */

/**
 * APIが返したエラーを表すクラス。
 *
 * details を保持することで、フォーム側が
 * 「どの入力欄の下にどのメッセージを出すか」を決められる。
 */
export class ApiError extends Error {
  constructor({ status, code, message, details }) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details ?? [];
  }

  /** 入力内容の問題か（フォームの各欄にメッセージを出すべきか） */
  get isValidationError() {
    return this.code === "VALIDATION_ERROR";
  }

  /** 未認証か（ログイン画面へ戻すべきか） */
  get isUnauthorized() {
    return this.status === 401;
  }

  get isNotFound() {
    return this.status === 404;
  }

  /**
   * details を { フィールド名: メッセージ } の形へ変換する。
   * 同じ項目に複数の理由がある場合は最初のものを使う。
   */
  get fieldErrors() {
    const result = {};
    for (const detail of this.details) {
      if (detail?.field && !result[detail.field]) {
        result[detail.field] = detail.message;
      }
    }
    return result;
  }
}

/** クエリ文字列を作る。未指定・空文字の項目は送らない */
const buildQueryString = (params = {}) => {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }

  const query = search.toString();
  return query ? `?${query}` : "";
};

/**
 * APIを呼ぶ。
 *
 * @param {string} path   "/api/coffee-records" のようなパス
 * @param {object} options
 * @param {string} [options.method]
 * @param {object} [options.body]   JSONとして送る
 * @param {object} [options.params] クエリ文字列
 * @param {AbortSignal} [options.signal] 画面離脱時のキャンセル用
 */
export const apiRequest = async (path, { method = "GET", body, params, signal } = {}) => {
  // トークンは呼び出しのたびに読む。
  // モジュール読み込み時に固定すると、ログインし直しても古い値を使ってしまう
  const token = getAuthToken();

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let response;
  try {
    response = await fetch(`${API_URL}${path}${buildQueryString(params)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    // 画面遷移などで意図的に中断した場合は、そのまま呼び出し側へ伝える
    if (error.name === "AbortError") throw error;

    // サーバーが落ちている・ネットワークが無い場合、fetchは例外を投げる。
    // そのままだと "Failed to fetch" という開発者向けの文言が画面に出る
    throw new ApiError({
      status: 0,
      code: "NETWORK_ERROR",
      message: "サーバーに接続できません。通信環境を確認してください。",
    });
  }

  // 204 No Content（削除成功）は本文が無いので、JSONとして読もうとすると失敗する
  if (response.status === 204) return null;

  let payload;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    // coffee-app のAPIは { error: {...} }、mlb-app由来のAPIは { message }。
    // 両方を受け取れるようにしておく
    const apiError = payload?.error;

    // このクライアントを使う全エンドポイント（coffee-records/graph/stats/
    // insights/discover/search/masterData）は認証必須で、「現在の
    // パスワードが違う」のような別の意味の401を返すものが無い。
    // そのため401は常に「トークンが無効・期限切れ」と断定してよい
    // （services/api/userApi.js のchangePasswordだけは例外なので、
    // あちらでは同じ処理を個別に呼んでいる）
    if (response.status === 401) handleUnauthorized();

    throw new ApiError({
      status: response.status,
      code: apiError?.code ?? "UNKNOWN_ERROR",
      message:
        apiError?.message ?? payload?.message ?? "エラーが発生しました。時間をおいて再度お試しください。",
      details: apiError?.details,
    });
  }

  return payload;
};
