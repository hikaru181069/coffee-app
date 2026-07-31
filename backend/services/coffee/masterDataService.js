import * as masterDataRepository from "../../repositories/masterDataRepository.js";
import {
  serializeMasterData,
  serializeAllMasterData,
} from "./masterDataSerializer.js";

/**
 * マスターデータのユースケース。
 *
 * repository が「どう問い合わせるか」を持つのに対し、
 * service は「何のために取るか」を持つ。
 *
 * MVPでは一般ユーザー向けの作成・更新APIを公開しないため
 * （docs/api.md）、読み取りと参照整合性の確認が中心になる。
 */

/** マスター一覧を取得する（docs/api.md の GET /master-data/:type） */
export const listMasterData = async (type, options) => {
  const docs = await masterDataRepository.findMany(type, options);
  return serializeMasterData(type, docs);
};

/**
 * フォームの初期表示用に全種類をまとめて取得する。
 *
 * 記録フォームは産地・品種・精製・焙煎・フレーバーの選択肢を
 * 同時に必要とするので、5回リクエストさせずに1回で返せるようにする
 * （docs/api.md の GET /master-data）。
 */
export const listAllMasterData = async () => {
  const byType = await masterDataRepository.findAllTypes();
  return serializeAllMasterData(byType);
};

/**
 * CoffeeRecord が参照しようとしているマスターIDが実在するか確認する。
 *
 * なぜ必要か:
 *   存在しないIDでも ObjectId の形式さえ合っていれば保存できてしまう。
 *   するとグラフ生成時に参照先が見つからず、ラベルの無いノードが生まれる。
 *   保存前にここで弾く。
 *
 * 形式チェック（24桁の16進数か）は validator の担当なので、ここではしない。
 * この関数は「DBに実在するか」だけを見る。
 *
 * @param {object} fields CoffeeRecord の参照フィールド
 * @returns {{ valid: boolean, details: Array<{field: string, message: string}> }}
 */
export const verifyReferencesExist = async (fields = {}) => {
  // フィールド名 → マスターの種類 の対応
  const singleRefs = [
    ["originId", "origins"],
    ["processId", "processes"],
    ["roastLevelId", "roastLevels"],
  ];
  const multiRefs = [
    ["varietyIds", "varieties"],
    ["flavorIds", "flavors"],
  ];

  const checks = [];

  for (const [field, type] of singleRefs) {
    const value = fields[field];
    if (value === undefined || value === null || value === "") continue;
    checks.push({ field, type, ids: [String(value)] });
  }

  for (const [field, type] of multiRefs) {
    const values = fields[field];
    if (!Array.isArray(values) || values.length === 0) continue;
    checks.push({ field, type, ids: values.map(String) });
  }

  if (checks.length === 0) return { valid: true, details: [] };

  // 種類ごとの問い合わせは互いに独立しているので同時に投げる
  const existingPerCheck = await Promise.all(
    checks.map(({ type, ids }) => masterDataRepository.findExistingIds(type, ids)),
  );

  const details = [];
  checks.forEach(({ field, ids }, index) => {
    const existing = new Set(existingPerCheck[index]);
    const missing = ids.filter((id) => !existing.has(id));

    if (missing.length > 0) {
      details.push({
        field,
        message: "選択された項目が見つかりません",
      });
    }
  });

  return { valid: details.length === 0, details };
};
