import * as coffeeRecordRepository from "../../repositories/coffeeRecordRepository.js";
import * as masterDataRepository from "../../repositories/masterDataRepository.js";
import { serializeCoffeeRecords } from "./coffeeRecordSerializer.js";
import { loadFlavorsByNormalizedName } from "./graphService.js";
import { buildDiscoveries } from "../../core/discoveries/discoveryBuilder.js";
import { notFoundError } from "../../utils/AppError.js";

/**
 * 記録を保存する前に、産地を選んだ時点での「発見」をプレビューする。
 *
 * 2026-09、記録体験の再設計（第3弾）。RecordForm.jsxで産地チップを
 * 選んだ瞬間に呼ばれる。`core/discoveries/discoveryBuilder.js`の
 * `buildDiscoveries`は既存のまま再利用し、まだ保存していない仮の記録
 * （産地だけを持つ「コーヒーの詳細」1グループ）を渡して計算するだけで、
 * DBへの書き込みは一切行わない。
 *
 * 対象は産地のみ（docs/features.md「Save Discoveries」参照）。品種・
 * 精製方法・焙煎度・フレーバーまで対象を広げると、フォームの入力の
 * たびにAPIを呼ぶことになり煩雑になるため、今回はスコープを絞っている。
 */
export const previewOriginDiscovery = async (userId, originId) => {
  const [origins, existingRecords, flavorsByNormalizedName] = await Promise.all([
    masterDataRepository.findByIds("origins", [originId]),
    coffeeRecordRepository.findAllForUser(userId),
    loadFlavorsByNormalizedName(),
  ]);

  const origin = origins[0];
  if (!origin) {
    throw notFoundError("指定された産地が見つかりません");
  }

  // core/graph/graphBuilder.jsのcollectAttributeRefsが読み取る形
  // （services/coffee/coffeeRecordSerializer.jsが返すのと同じ形）に
  // 合わせた、保存しない仮の記録
  const syntheticRecord = {
    components: [
      {
        origin: { id: String(origin._id), name: origin.name, countryCode: origin.countryCode ?? null },
        farmName: "",
        varieties: [],
        process: null,
      },
    ],
    roastLevel: null,
    flavors: [],
    cafeName: "",
    notes: "",
  };

  return buildDiscoveries(serializeCoffeeRecords(existingRecords), syntheticRecord, flavorsByNormalizedName);
};
