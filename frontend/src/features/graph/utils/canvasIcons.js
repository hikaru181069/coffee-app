/**
 * canvas描画（react-force-graph-2dのnodeCanvasObject）でノード種別ごとの
 * アイコンを出すためのユーティリティ。
 *
 * lucide-reactはSVGを返すReactコンポーネントなので、そのままcanvasへは
 * 描画できない。ここではlucide-reactが実際に使っているpathデータ
 * （node_modules/lucide-react/dist/esm/icons/*.mjs から書き写したもの。
 * GraphLegend・utils/nodeVisuals.jsが参照するアイコンと同じ形にして、
 * グラフ内のノードと凡例で見た目がずれないようにしている）から
 * SVG文字列を組み立て、Imageとして読み込んでcanvasへdrawImageする。
 *
 * 同じ種別のアイコンを毎フレーム作り直すと無駄なので、種別+色ごとに
 * 一度作ったImageをキャッシュして使い回す。
 */

const ICON_PATHS = {
  // Coffee（record）
  coffee: [
    { tag: "path", d: "M10 2v2" },
    { tag: "path", d: "M14 2v2" },
    { tag: "path", d: "M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" },
    { tag: "path", d: "M6 2v2" },
  ],
  // Globe（origin）
  globe: [
    { tag: "circle", cx: 12, cy: 12, r: 10 },
    { tag: "path", d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" },
    { tag: "path", d: "M2 12h20" },
  ],
  // Leaf（farm）
  leaf: [
    { tag: "path", d: "M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" },
    { tag: "path", d: "M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" },
  ],
  // Sprout（variety）
  sprout: [
    { tag: "path", d: "M14 9.536V7a4 4 0 0 1 4-4h1.5a.5.5 0 0 1 .5.5V5a4 4 0 0 1-4 4 4 4 0 0 0-4 4c0 2 1 3 1 5a5 5 0 0 1-1 3" },
    { tag: "path", d: "M4 9a5 5 0 0 1 8 4 5 5 0 0 1-8-4" },
    { tag: "path", d: "M5 21h14" },
  ],
  // Droplets（process）
  droplets: [
    { tag: "path", d: "M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z" },
    { tag: "path", d: "M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97" },
  ],
  // Flame（roastLevel）
  flame: [
    { tag: "path", d: "M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4" },
  ],
  // Sparkles（flavor）
  sparkles: [
    { tag: "path", d: "M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z" },
    { tag: "path", d: "M20 2v4" },
    { tag: "path", d: "M22 4h-4" },
    { tag: "circle", cx: 4, cy: 20, r: 2 },
  ],
  // Store（cafe）
  store: [
    { tag: "path", d: "M15 21v-5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v5" },
    {
      tag: "path",
      d: "M17.774 10.31a1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.451 0 1.12 1.12 0 0 0-1.548 0 2.5 2.5 0 0 1-3.452 0 1.12 1.12 0 0 0-1.549 0 2.5 2.5 0 0 1-3.77-3.248l2.889-4.184A2 2 0 0 1 7 2h10a2 2 0 0 1 1.653.873l2.895 4.192a2.5 2.5 0 0 1-3.774 3.244",
    },
    { tag: "path", d: "M4 10.95V19a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8.05" },
  ],
  // Quote（keyword）
  quote: [
    { tag: "path", d: "M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" },
    { tag: "path", d: "M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z" },
  ],
};

const TYPE_TO_ICON_KEY = {
  record: "coffee",
  origin: "globe",
  farm: "leaf",
  variety: "sprout",
  process: "droplets",
  roastLevel: "flame",
  flavor: "sparkles",
  cafe: "store",
  keyword: "quote",
};

const buildSvgMarkup = (iconKey, color) => {
  const shapes = ICON_PATHS[iconKey]
    .map((shape) =>
      shape.tag === "circle"
        ? `<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" />`
        : `<path d="${shape.d}" />`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`;
};

const imageCache = new Map();

/**
 * ノード種別+色に対応するアイコンのImageを返す（無ければ作ってキャッシュする）。
 * 読み込み中（初回）はnullを返す。呼び出し側（nodeCanvasObject）は
 * 次のtick/再描画で自然にImageが手に入るので、読み込み待ちを
 * 明示的にハンドリングする必要はない。
 *
 * @param {string} nodeType
 * @param {string} color 16進カラーコード（utils/nodeVisuals.jsのcanvasColor）
 * @returns {HTMLImageElement | null}
 */
export const getNodeIconImage = (nodeType, color) => {
  const iconKey = TYPE_TO_ICON_KEY[nodeType] ?? "coffee";
  const cacheKey = `${iconKey}:${color}`;

  const cached = imageCache.get(cacheKey);
  if (cached) return cached.complete ? cached : null;

  const image = new Image();
  image.src = `data:image/svg+xml;utf8,${encodeURIComponent(buildSvgMarkup(iconKey, color))}`;
  imageCache.set(cacheKey, image);
  return null;
};
