import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * cqiDatabase.json（静的なCQI参照データ）の読み込みを共通化する。
 *
 * 2026-08、discoverService.jsだけが持っていた読み込み・キャッシュ処理を、
 * Origin Quality機能（services/coffee/originQualityService.js）でも
 * 必要になったためここへ切り出した。一度読み込んだら終わりの静的ファイル
 * （docs/features.md「Discover」）のため、モジュールスコープにキャッシュし、
 * リクエストのたびにファイルI/Oが発生しないようにする。
 */
let cachedCqiDataset = null;

export const loadCqiDataset = () => {
  if (!cachedCqiDataset) {
    const filePath = path.join(import.meta.dirname, "cqiDatabase.json");
    cachedCqiDataset = JSON.parse(readFileSync(filePath, "utf-8"));
  }
  return cachedCqiDataset;
};
