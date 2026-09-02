import * as masterDataRepository from "../repositories/masterDataRepository.js";
import { normalizeName } from "../utils/normalizeName.js";

import { origins } from "./data/origins.js";
import { varieties } from "./data/varieties.js";
import { processes } from "./data/processes.js";
import { roastLevels } from "./data/roastLevels.js";
import { flavors } from "./data/flavors.js";

/**
 * マスターデータの初期投入。
 *
 * 冪等（何度実行しても結果が同じ）であることが要件。
 * そのために「一意キーで探して、無ければ挿入する」upsert を使い、
 * すでにあるドキュメントには一切触れない。
 *
 * 一意キーの取り方:
 *   - origins / varieties / processes / flavors … normalizedName
 *   - roastLevels … key（順序を持つ固定値なので normalizedName を持たない）
 *
 * なぜ normalizedName をここで自分で計算するのか:
 *   モデルの pre("validate") フックは、ドキュメントを作る save() のときには
 *   走るが、updateOne(upsert) では走らない（ドキュメントを経由しないため）。
 *   フック任せにすると normalizedName が undefined のまま挿入されてしまうので、
 *   seed側で明示的に計算して渡している。
 */

/** 名前を一意キーとするマスター（産地・品種・精製方法・フレーバー）の投入設定 */
const NAME_BASED_SEEDS = [
  { type: "origins", items: origins, label: "産地" },
  { type: "varieties", items: varieties, label: "品種" },
  { type: "processes", items: processes, label: "精製方法" },
  { type: "flavors", items: flavors, label: "フレーバー" },
];

const seedNameBased = async ({ type, items, label }) => {
  let inserted = 0;
  let skipped = 0;

  for (const item of items) {
    const normalizedName = normalizeName(item.name);

    const result = await masterDataRepository.upsertOne(
      type,
      { normalizedName },
      { ...item, normalizedName },
    );

    if (result === "inserted") inserted += 1;
    else skipped += 1;
  }

  return { type, label, inserted, skipped, total: await masterDataRepository.countAll(type) };
};

const seedRoastLevels = async () => {
  let inserted = 0;
  let skipped = 0;

  for (const item of roastLevels) {
    const result = await masterDataRepository.upsertOne(
      "roastLevels",
      { key: item.key },
      item,
    );

    if (result === "inserted") inserted += 1;
    else skipped += 1;
  }

  return {
    type: "roastLevels",
    label: "焙煎度",
    inserted,
    skipped,
    total: await masterDataRepository.countAll("roastLevels"),
  };
};

/**
 * すべてのマスターデータを投入する。
 *
 * @returns {Promise<Array<{type, label, inserted, skipped, total}>>} 種類ごとの結果
 */
export const seedMasterData = async () => {
  const results = [];

  for (const config of NAME_BASED_SEEDS) {
    results.push(await seedNameBased(config));
  }
  results.push(await seedRoastLevels());

  return results;
};
