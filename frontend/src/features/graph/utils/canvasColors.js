/**
 * canvas描画（react-force-graph-2dのnodeCanvasObject）はTailwindクラスも
 * CSSカスタムプロパティも直接解釈できないため、実際に描画で使う色は
 * `getComputedStyle`経由でCSS変数の値を読み取って解決する。
 *
 * これにより、色の定義箇所は frontend/src/index.css の @theme 1か所に
 * 一本化される（以前は canvasColor というhexを手打ちし、@theme側の値と
 * 手動同期する必要があった）。
 *
 * ダーク固定でテーマ切り替えが無い（今回のスコープ外）前提のため、
 * 一度読み取った値をキャッシュして使い回す。将来ライトモード等で
 * 実行時に値が変わりうる場合は、キャッシュの無効化が別途必要になる。
 */
const cache = new Map();

export const getCanvasColor = (cssVarName) => {
  if (!cache.has(cssVarName)) {
    const value = getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
    cache.set(cssVarName, value);
  }
  return cache.get(cssVarName);
};
